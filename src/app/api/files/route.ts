import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

// Secure file listing:
// - Students: only their own submissions and submissions from their active group.
// - Teachers: submissions from groups they supervise.
// - Admin/Super Admin/Committee Head: all submissions.
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine scope based on role
    let whereClause: any = {};

    if (user.role === 'STUDENT') {
      // Active groups the student belongs to
      const memberships = await prisma.groupMember.findMany({
        where: { userId, group: { isActive: true } },
        select: { groupId: true },
      });
      const groupIds = memberships.map((m) => m.groupId);

      whereClause = {
        OR: [
          { studentId: userId },
          {
            project: {
              groupId: { in: groupIds.length ? groupIds : ['__none__'] },
            },
          },
        ],
      };
    } else if (user.role === 'TEACHER') {
      // Groups supervised by teacher
      const supervisedGroups = await prisma.group.findMany({
        where: {
          projects: { some: { supervisorId: userId } },
        },
        select: { id: true, members: true },
      });

      const groupIds = supervisedGroups.map((g) => g.id);
      const studentIds = supervisedGroups.flatMap((g) =>
        g.members.map((m: any) => m.userId)
      );

      // Teachers should see ALL files from supervised groups
      // Including proposals with PENDING supervisorApprovalStatus
      whereClause = {
        OR: [
          { studentId: { in: studentIds.length ? studentIds : ['__none__'] } },
          { project: { groupId: { in: groupIds.length ? groupIds : ['__none__'] } } },
        ],
      };
    } else if (['ADMIN', 'SUPER_ADMIN', 'COMMITTEE_HEAD'].includes(user.role)) {
      // For admin/committee head: Only show proposals that are supervisor-approved
      // For other file types, show all
      whereClause = {
        OR: [
          {
            fileType: 'PROPOSAL',
            supervisorApprovalStatus: 'APPROVED'
          },
          {
            fileType: { not: 'PROPOSAL' }
          }
        ]
      };
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const submissions = await prisma.projectSubmission.findMany({
      where: whereClause,
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: {
            id: true,
            title: true,
            groupId: true,
            group: { select: { id: true, name: true } },
            supervisor: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const files = submissions.map((submission) => ({
      id: submission.id,
      name: submission.fileName,
      fileName: submission.fileName,
      fileUrl: submission.fileUrl,
      fileType: submission.fileType,
      size: submission.fileSize || 0,
      uploadedAt: submission.createdAt,
      status: submission.status || 'PENDING',
      supervisorApprovalStatus: submission.supervisorApprovalStatus || 'PENDING',
      description: submission.description,
      studentId: submission.studentId,
      student: submission.student,
      projectId: submission.projectId,
      projectTitle: submission.project?.title,
      title: submission.project?.title,
      groupId: submission.project?.groupId,
      groupName: submission.project?.group?.name,
      supervisorId: submission.project?.supervisor?.id,
      supervisorRemarks: submission.supervisorRemarks,
      adminRemarks: submission.adminRemarks,
      conditionalApprovalRemarks: submission.conditionalApprovalRemarks,
      defenseAttempts: submission.defenseAttempts ?? 0,
      createdAt: submission.createdAt,
    }));

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}