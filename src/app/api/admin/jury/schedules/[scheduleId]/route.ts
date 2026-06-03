import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get a specific defense schedule with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;

    const schedule = await db.defenseSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        juryAssignments: true,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// PUT - Update a defense schedule (for rescheduling)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;
    const body = await request.json();
    const {
      defenseDate,
      defenseTime,
      venue,
      assignmentId,
      juryMembers,
    } = body;

    // Check if schedule exists
    const schedule = await db.defenseSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        juryAssignments: true,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Update the defense schedule
    const updateData: any = {};
    if (defenseDate) updateData.defenseDate = new Date(defenseDate);
    if (defenseTime) updateData.defenseTime = defenseTime;
    if (venue) updateData.venue = venue;

    if (Object.keys(updateData).length > 0) {
      await db.defenseSchedule.update({
        where: { id: scheduleId },
        data: updateData,
      });
    }

    // Update jury assignment if provided
    if (assignmentId && juryMembers) {
      await db.juryAssignment.update({
        where: { id: assignmentId },
        data: {
          juryMembers: JSON.stringify(juryMembers),
          evaluationStatus: 'PENDING', // Reset to pending for re-evaluation
          marks: null, // Clear previous marks
          feedback: null, // Clear previous feedback
          juryEvaluations: null, // Clear previous evaluations
        },
      });
    }

    return NextResponse.json({
      message: 'Defense schedule updated successfully',
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a defense schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;

    // Check if schedule exists
    const schedule = await db.defenseSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        juryAssignments: true,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Delete the schedule (juryAssignments will be deleted automatically due to onDelete: Cascade)
    await db.defenseSchedule.delete({
      where: { id: scheduleId },
    });

    return NextResponse.json({
      message: 'Defense schedule deleted successfully',
      deletedAssignments: schedule.juryAssignments.length,
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}

