import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// DELETE /api/forms/[id] - Delete a form submission
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Form submission ID is required' },
        { status: 400 }
      );
    }

    // Check if form submission exists
    const formSubmission = await db.formSubmission.findUnique({
      where: { id },
    });

    if (!formSubmission) {
      return NextResponse.json(
        { error: 'Form submission not found' },
        { status: 404 }
      );
    }

    // Delete the form submission
    await db.formSubmission.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Form submission deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting form submission:', error);
    return NextResponse.json(
      { error: 'Failed to delete form submission' },
      { status: 500 }
    );
  }
}

