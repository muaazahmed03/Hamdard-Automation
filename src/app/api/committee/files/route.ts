import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { createNotification } from '@/lib/notification-service';

const FILE_TYPES = ['PROPOSAL', 'REPORT', 'DOCUMENTATION'];
const ADMIN_FINAL_STATUSES = ['ADMIN_APPROVED', 'ADMIN_REJECTED'];

function formatSubmission(submission: any) {
  return {
    id: submission.id,
    originalName: submission.fileName || submission.title || 'Unknown File',
    fileName: submission.fileName || submission.title || 'Unknown File',
    fileUrl: submission.fileUrl || null,
    fileType: submission.fileType || 'PROPOSAL',
    fileSize: submission.fileSize
      ? `${Math.round(submission.fileSize / 1024)} KB`
      : 'Unknown',
    fileSizeBytes: submission.fileSize || 0,
    studentName: submission.student?.name || 'Unknown',
    studentEmail: submission.student?.email || '',
    studentId: submission.studentId,
    studentRollNumber: submission.student?.rollNumber || '',
    groupName: submission.project?.group?.name || 'No Group',
    groupId: submission.project?.groupId || submission.projectId || null,
    projectTitle: submission.project?.title || submission.title || 'No Project',
    projectId: submission.projectId || null,
    supervisorName: submission.project?.supervisor?.name || 'Unknown',
    supervisorEmail: submission.project?.supervisor?.email || '',
    uploadDate: submission.createdAt
      ? new Date(submission.createdAt).toLocaleDateString()
      : new Date().toLocaleDateString(),
    uploadTime: submission.createdAt
      ? new Date(submission.createdAt).toLocaleTimeString()
      : new Date().toLocaleTimeString(),
    approvedDate: submission.updatedAt
      ? new Date(submission.updatedAt).toLocaleDateString()
      : new Date().toLocaleDateString(),
    status: submission.status || 'PENDING',
    description: submission.description || submission.title || '',
    department: submission.student?.department || 'Unknown',
    uploadedAt: submission.createdAt,
  };
}

function shouldShowSubmission(submission: any) {
  if (ADMIN_FINAL_STATUSES.includes(submission.status)) {
    return false;
  }

  const fileType = (submission.fileType || '').toUpperCase();

  if (fileType === 'REPORT' || fileType === 'DOCUMENTATION') {
    return true;
  }

  if (fileType === 'PROPOSAL') {
    const supervisorApproved =
      submission.supervisorApprovalStatus === 'APPROVED' ||
      submission.status === 'APPROVED';
    const committeeHandled = ['COMMITTEE_APPROVED', 'COMMITTEE_REJECTED'].includes(
      submission.status,
    );
    return supervisorApproved || committeeHandled;
  }

  return false;
}

export async function GET() {
  try {
    const submissions = await prisma.projectSubmission.findMany({
      where: {
        fileType: {
          in: FILE_TYPES,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            rollNumber: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            groupId: true,
            group: {
              select: {
                id: true,
                name: true,
              },
            },
            supervisor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const visible = submissions.filter(shouldShowSubmission);
    return NextResponse.json(visible.map(formatSubmission));
  } catch (error) {
    console.error('[Committee Files API] Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, status } = body;

    if (!fileId || !status) {
      return NextResponse.json(
        { error: 'File ID and status are required' },
        { status: 400 },
      );
    }

    if (
      !['PENDING', 'APPROVED', 'REJECTED', 'COMMITTEE_APPROVED', 'COMMITTEE_REJECTED'].includes(
        status,
      )
    ) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const submission = await prisma.projectSubmission.findUnique({
      where: { id: fileId },
      include: {
        student: true,
        project: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const updatedSubmission = await prisma.projectSubmission.update({
      where: { id: fileId },
      data: { status } as any,
    });

    if (status === 'COMMITTEE_APPROVED' || status === 'APPROVED') {
      await createNotification({
        userId: submission.studentId,
        title: `${submission.fileType?.toUpperCase() || 'File'} Approved by Committee`,
        message: `Your ${submission.fileType || 'file'} "${submission.fileName}" has been approved by the committee.`,
        type: 'success',
        link: '/student',
      });
    } else if (status === 'COMMITTEE_REJECTED' || status === 'REJECTED') {
      await createNotification({
        userId: submission.studentId,
        title: `${submission.fileType?.toUpperCase() || 'File'} Rejected by Committee`,
        message: `Your ${submission.fileType || 'file'} "${submission.fileName}" was rejected by the committee. Please contact your supervisor.`,
        type: 'error',
        link: '/student',
      });
    }

    return NextResponse.json({
      success: true,
      message: `File ${status.toLowerCase()} successfully`,
      submission: updatedSubmission,
    });
  } catch (error) {
    console.error('Error updating file status:', error);
    return NextResponse.json(
      { error: 'Failed to update file status' },
      { status: 500 },
    );
  }
}
