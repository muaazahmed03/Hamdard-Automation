import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'

// PATCH - Update project submission status
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json()
    const { id } = params

    const updated = await prisma.projectSubmission.update({
      where: { id },
      data: { status }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating project submission:', error)
    return NextResponse.json(
      { error: 'Failed to update project submission' },
      { status: 500 }
    )
  }
}
