import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// DELETE - Delete a jury assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;

    // Check if assignment exists
    const assignment = await db.juryAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Jury assignment not found' },
        { status: 404 }
      );
    }

    // Delete the assignment
    await db.juryAssignment.delete({
      where: { id: assignmentId },
    });

    return NextResponse.json({
      message: 'Jury assignment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting jury assignment:', error);
    return NextResponse.json(
      { error: 'Failed to delete jury assignment' },
      { status: 500 }
    );
  }
}

