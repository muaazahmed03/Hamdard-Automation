import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { createNotification } from '@/lib/notification-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, feedback, teacherId } = body;

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      );
    }

    // Get the file submission
    const submission = await prisma.projectSubmission.findUnique({
      where: { id },
      include: {
        student: true,
        project: {
          include: {
            group: {
              include: {
                members: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Update the submission status and supervisor approval status
    const updateData: any = {
      supervisorRemarks: feedback || null,
    };

    // For proposals, update supervisorApprovalStatus
    if (submission.fileType === 'PROPOSAL') {
      if (status === 'APPROVED') {
        updateData.supervisorApprovalStatus = 'APPROVED';
        updateData.approvedBySupervisorAt = new Date();
        updateData.status = 'APPROVED'; // Set status to APPROVED after supervisor approval
        console.log('[Teacher Approval] Setting supervisorApprovalStatus=APPROVED and status=APPROVED for proposal:', id);
      } else if (status === 'REJECTED') {
        updateData.supervisorApprovalStatus = 'REJECTED';
        updateData.status = 'REJECTED';
      } else {
        updateData.status = status;
      }
    } else {
      // For other file types, just update status
      updateData.status = status;
    }

    console.log('[Teacher Approval] Update data:', JSON.stringify(updateData, null, 2));

    const updatedSubmission = await prisma.projectSubmission.update({
      where: { id },
      data: updateData
    });

    console.log('[Teacher Approval] Updated submission:', {
      id: updatedSubmission.id,
      fileName: updatedSubmission.fileName,
      fileType: updatedSubmission.fileType,
      status: updatedSubmission.status,
      supervisorApprovalStatus: updatedSubmission.supervisorApprovalStatus
    });

    // Verify the update was successful by querying again
    const verifySubmission = await prisma.projectSubmission.findUnique({
      where: { id },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        status: true,
        supervisorApprovalStatus: true
      }
    });
    console.log('[Teacher Approval] Verification query result:', verifySubmission);

    // Get all group members for notifications
    const groupMembers = submission.project?.group?.members.map(m => m.user) || [submission.student];

    // Send notifications based on status
    if (status === 'APPROVED') {
      // Notify group members
      for (const member of groupMembers) {
        await createNotification({
          userId: member.id,
          title: 'Proposal Approved',
          message: `Your proposal "${submission.fileName}" has been approved by your supervisor and forwarded to the committee head and admin.`,
          type: 'success',
          category: 'file',
        });
      }

      // Notify all committee heads
      const committeeHeads = await prisma.user.findMany({
        where: { role: 'COMMITTEE_HEAD', isActive: true }
      });
      for (const head of committeeHeads) {
        await createNotification({
          userId: head.id,
          title: 'New Approved Proposal',
          message: `A proposal "${submission.fileName}" from ${submission.student.name} has been approved by supervisor and is now available in File Tracking.`,
          type: 'info',
          category: 'file',
        });
      }

      // Notify all admins
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true }
      });
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          title: 'New Approved Proposal',
          message: `A proposal "${submission.fileName}" from ${submission.student.name} has been approved by supervisor and is available in Policies & Submissions.`,
          type: 'info',
          category: 'file',
        });
      }
    } else if (status === 'REJECTED') {
      // Notify group members
      for (const member of groupMembers) {
        await createNotification({
          userId: member.id,
          title: 'Proposal Rejected',
          message: `Your proposal "${submission.fileName}" has been rejected. You can now select another supervisor.`,
          type: 'error',
          category: 'file',
        });
      }
    } else if (status === 'CHANGES_REQUESTED') {
      // Notify group members with feedback
      for (const member of groupMembers) {
        await createNotification({
          userId: member.id,
          title: 'Changes Requested',
          message: `Your supervisor has requested changes to "${submission.fileName}". Feedback: ${feedback || 'Please review and make necessary changes.'}`,
          type: 'info',
          category: 'file',
        });
      }
    }

    return NextResponse.json({
      success: true,
      submission: updatedSubmission
    });

  } catch (error) {
    console.error('Error updating file:', error);
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    );
  }
}
