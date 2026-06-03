import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createNotification } from '@/lib/notification-service';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// PATCH /api/admin/files/[id] - Admin approve/reject proposal file
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, adminRemarks } = body;
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!['ADMIN_APPROVED', 'ADMIN_REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be ADMIN_APPROVED or ADMIN_REJECTED' },
        { status: 400 }
      );
    }

    // Get submission details
    const submission = await db.projectSubmission.findUnique({
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
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Update submission
    const updatedSubmission = await db.projectSubmission.update({
      where: { id },
      data: {
        status,
        adminRemarks: adminRemarks || null,
      }
    });

    // Notify student and group members
    const groupMembers = submission.project?.group?.members.map(m => m.user) || [submission.student];
    for (const member of groupMembers) {
      await createNotification({
        userId: member.id,
        title: status === 'ADMIN_APPROVED' ? 'Proposal Approved by Admin' : 'Proposal Rejected by Admin',
        message: status === 'ADMIN_APPROVED' 
          ? `Your proposal "${submission.fileName}" has been approved by the administrator.`
          : `Your proposal "${submission.fileName}" has been rejected by the administrator.`,
        type: status === 'ADMIN_APPROVED' ? 'success' : 'error',
        category: 'file',
        relatedId: submission.id,
      });
    }

    return NextResponse.json({
      success: true,
      submission: updatedSubmission
    });
  } catch (error) {
    console.error('Error updating proposal:', error);
    return NextResponse.json(
      { error: 'Failed to update proposal' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/files/[id] - Admin delete proposal file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Get the file submission from database
    const submission = await db.projectSubmission.findUnique({
      where: { id },
      include: {
        student: true,
      }
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'File not found in database' },
        { status: 404 }
      );
    }

    // Delete the physical file if it exists
    if (submission.fileUrl) {
      try {
        const relativeFilePath = submission.fileUrl.startsWith('/') ? submission.fileUrl.substring(1) : submission.fileUrl;
        const filePath = join(process.cwd(), 'public', relativeFilePath);
        if (existsSync(filePath)) {
          await unlink(filePath);
          console.log(`[Admin Delete] Deleted physical file: ${filePath}`);
        }
      } catch (fileError) {
        console.error('[Admin Delete] Error deleting physical file:', fileError);
        // Continue even if physical file deletion fails
      }
    }

    // Delete from database
    await db.projectSubmission.delete({
      where: { id },
    });

    console.log(`[Admin Delete] Deleted submission: ${id} by admin ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('[Admin Delete] Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
