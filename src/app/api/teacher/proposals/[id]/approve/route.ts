import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { remarks } = body;

    // Update the proposal submission with supervisor approval
    const updatedSubmission = await db.projectSubmission.update({
      where: { id },
      data: {
        supervisorApprovalStatus: 'APPROVED',
        supervisorRemarks: remarks || null,
        approvedBySupervisorAt: new Date(),
      },
      include: {
        project: true,
        student: true,
      },
    });

    return NextResponse.json({
      message: 'Proposal approved successfully',
      submission: updatedSubmission,
    });
  } catch (error) {
    console.error('Error approving proposal:', error);
    return NextResponse.json(
      { error: 'Failed to approve proposal' },
      { status: 500 }
    );
  }
}
