import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createNotification } from '@/lib/notification-service';

// PATCH /api/forms/[id]/approve - Approve or reject a form submission
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, comments } = body; // action: 'APPROVE' or 'REJECT'
    const reviewerId = request.headers.get('x-user-id');

    if (!reviewerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    // Get the form submission
    const formSubmission = await db.formSubmission.findUnique({
      where: { id },
    });

    if (!formSubmission) {
      return NextResponse.json(
        { error: 'Form submission not found' },
        { status: 404 }
      );
    }

    // Update the form submission
    const updatedSubmission = await db.formSubmission.update({
      where: { id },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        reviewedBy: reviewerId,
        approvedBy: action === 'APPROVE' ? reviewerId : null,
        reviewComments: comments || null,
        reviewedAt: new Date(),
      },
    });

    // Notify the student who submitted the form
    if (formSubmission.submittedBy) {
      const formTypeLabel = {
        proposal: 'Proposal Submission Form',
        'supervisor-change': 'Supervisor Change Form',
        consent: 'FYP Student Consent Form',
        extension: 'Extension Request Form',
        reeval: 'Re-Evaluation Appeal Form',
        general: 'General Request Form',
      }[formSubmission.type] || 'Form';

      await createNotification({
        userId: formSubmission.submittedBy,
        title: action === 'APPROVE' 
          ? `${formTypeLabel} Approved` 
          : `${formTypeLabel} Rejected`,
        message: action === 'APPROVE'
          ? `Your ${formTypeLabel} has been approved.${comments ? ` Comments: ${comments}` : ''}`
          : `Your ${formTypeLabel} has been rejected.${comments ? ` Reason: ${comments}` : ''}`,
        type: action === 'APPROVE' ? 'success' : 'error',
        link: '/student/forms',
      });
    }

    return NextResponse.json({
      success: true,
      message: `Form submission ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
      submission: updatedSubmission,
    });
  } catch (error) {
    console.error('Error updating form submission status:', error);
    return NextResponse.json(
      { error: 'Failed to update form submission status' },
      { status: 500 }
    );
  }
}

