import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { db as prisma } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First, try to find and delete from database
    const submission = await prisma.projectSubmission.findUnique({
      where: { id },
      include: {
        student: true,
      }
    });

    if (submission) {
      // Delete the physical file from the filesystem
      if (submission.fileUrl) {
        try {
          const filePath = join(process.cwd(), 'public', submission.fileUrl);
          if (existsSync(filePath)) {
            await unlink(filePath);
            console.log(`Deleted file: ${filePath}`);
          }
        } catch (fileError) {
          console.error('Error deleting physical file:', fileError);
          // Continue with database deletion even if file deletion fails
        }
      }

      // Delete the database record
      await prisma.projectSubmission.delete({
        where: { id }
      });

      console.log(`Deleted submission: ${id} by ${submission.student.name}`);

      return NextResponse.json({
        success: true,
        message: 'File deleted successfully'
      });
    }

    // Fallback: if not in database, try to delete from filesystem by timestamp ID
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (existsSync(uploadsDir)) {
      const { readdir } = await import('fs/promises');
      const fileNames = await readdir(uploadsDir);
      const fileToDelete = fileNames.find(fileName => fileName.startsWith(`${id}_`));

      if (fileToDelete) {
        const filePath = join(uploadsDir, fileToDelete);
        await unlink(filePath);
        console.log(`Deleted orphaned file: ${filePath}`);
        
        return NextResponse.json({
          success: true,
          message: 'File deleted successfully'
        });
      }
    }

    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file. Please try again.' },
      { status: 500 }
    );
  }
}
