import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// DELETE - Delete proof submission (only if PENDING)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const submissionId = params.id

    // Find the submission
    const submission = await prisma.proofSubmission.findUnique({
      where: { id: submissionId }
    })

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Check if user owns this submission
    if (submission.studentId !== userId) {
      return NextResponse.json(
        { error: 'You can only delete your own submissions' },
        { status: 403 }
      )
    }

    // Check if submission is still PENDING
    if (submission.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'You can only delete pending submissions' },
        { status: 400 }
      )
    }

    // Delete the file from filesystem if it exists
    try {
      const fileUrl = submission.proofFileUrl
      if (fileUrl && fileUrl.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), 'public', fileUrl)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      }
    } catch (fileError) {
      console.error('Error deleting file:', fileError)
      // Continue with database deletion even if file deletion fails
    }

    // Delete the submission from database
    await prisma.proofSubmission.delete({
      where: { id: submissionId }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Submission deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting proof submission:', error)
    return NextResponse.json(
      { error: 'Failed to delete proof submission' },
      { status: 500 }
    )
  }
}
