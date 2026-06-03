import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Get the file submission from database
    const submission = await prisma.projectSubmission.findUnique({
      where: { id },
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
        const filePath = join(process.cwd(), 'public', submission.fileUrl);
        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch (fileError) {
        console.error('Error deleting physical file:', fileError);
        // Continue even if physical file deletion fails
      }
    }

    // Delete from database
    await prisma.projectSubmission.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
