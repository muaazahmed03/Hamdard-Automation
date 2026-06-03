import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get all proof submissions for admin
export async function GET(request: NextRequest) {
  try {
    const submissions = await db.proofSubmission.findMany({
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            type: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Fetch student and group details
    const submissionsWithDetails = await Promise.all(
      submissions.map(async (submission) => {
        const student = await db.user.findUnique({
          where: { id: submission.studentId },
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            rollNumber: true
          }
        });

        let group = null;
        if (submission.groupId) {
          group = await db.group.findUnique({
            where: { id: submission.groupId },
            select: {
              id: true,
              name: true
            }
          });
        }

        return {
          id: submission.id,
          announcementId: submission.announcementId,
          announcementTitle: submission.announcement?.title || 'Unknown',
          studentId: submission.studentId,
          studentName: student?.name || 'Unknown',
          studentEmail: student?.email || '',
          studentDepartment: student?.department || '',
          studentRollNumber: student?.rollNumber || '',
          groupId: submission.groupId,
          groupName: group?.name || null,
          proofFileUrl: submission.proofFileUrl,
          proofFileName: submission.proofFileName,
          proofFileSize: submission.proofFileSize,
          transcriptUrl: submission.transcriptUrl,
          cgpa: submission.cgpa,
          remarks: submission.remarks,
          status: submission.status,
          reviewedBy: submission.reviewedBy,
          reviewedAt: submission.reviewedAt,
          reviewComments: submission.reviewComments,
          createdAt: submission.createdAt,
          updatedAt: submission.updatedAt
        };
      })
    );

    return NextResponse.json(submissionsWithDetails);
  } catch (error) {
    console.error('Error fetching proof submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proof submissions' },
      { status: 500 }
    );
  }
}
