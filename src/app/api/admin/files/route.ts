import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import {
  isTrackableSubmissionFileType,
  matchesReviewStatus,
  parseReviewStatusFilter,
} from '@/lib/submission-review';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reviewStatus = parseReviewStatusFilter(searchParams.get('reviewStatus'));

    const allSubmissions = await prisma.projectSubmission.findMany({
      where: {
        OR: [
          { fileType: 'PROPOSAL' },
          { fileType: 'proposal' },
          { fileType: 'REPORT' },
          { fileType: 'report' },
          { fileType: 'DOCUMENTATION' },
          { fileType: 'documentation' },
          { fileType: 'FYP_I' },
          { fileType: 'FYP_II' },
          { fileType: 'OTHER' },
        ],
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

    const submissions = allSubmissions.filter((submission) => {
      if (!isTrackableSubmissionFileType(submission.fileType)) {
        return false;
      }
      return matchesReviewStatus(submission.status, reviewStatus);
    });

    const formattedFiles = submissions.map((submission) => ({
      id: submission.id,
      fileName: submission.fileName || 'Unknown File',
      originalName: submission.fileName || 'Unknown File',
      fileType: submission.fileType,
      fileSize: submission.fileSize
        ? `${Math.round(submission.fileSize / 1024)} KB`
        : 'Unknown',
      fileSizeBytes: submission.fileSize,
      studentName: submission.student?.name || 'Unknown',
      studentEmail: submission.student?.email || '',
      studentId: submission.studentId,
      studentRollNumber: submission.student?.rollNumber || '',
      studentDepartment: submission.student?.department || 'Unknown',
      groupName: submission.project?.group?.name || 'No Group',
      groupId: submission.project?.groupId || null,
      department: submission.student?.department || 'Unknown',
      projectTitle: submission.project?.title || submission.title || 'No Project',
      projectId: submission.projectId,
      supervisorName: submission.project?.supervisor?.name || 'Unknown',
      supervisorEmail: submission.project?.supervisor?.email || '',
      uploadDate: new Date(submission.createdAt).toLocaleDateString(),
      uploadTime: new Date(submission.createdAt).toLocaleTimeString(),
      approvedDate: new Date(submission.updatedAt).toLocaleDateString(),
      status: submission.status || 'PENDING',
      supervisorApprovalStatus: submission.supervisorApprovalStatus || 'PENDING',
      supervisorRemarks: submission.supervisorRemarks,
      approvedBySupervisorAt: submission.approvedBySupervisorAt,
      description: submission.description,
      title: submission.title,
      domain: submission.domain,
      fileUrl: submission.fileUrl,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    }));

    return NextResponse.json(formattedFiles);
  } catch (error) {
    console.error('Error fetching admin files:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}
