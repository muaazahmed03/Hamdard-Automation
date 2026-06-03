import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// DELETE - Delete announcement (Admin and Committee Head can delete any announcement)
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

    // Verify user is committee head or admin
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || !['COMMITTEE_HEAD', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized to delete announcements' },
        { status: 403 }
      )
    }

    // Delete the announcement
    await prisma.announcement.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return NextResponse.json(
      { error: 'Failed to delete announcement' },
      { status: 500 }
    )
  }
}

// GET - Get single announcement details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            proofSubmissions: true,
            evaluations: true
          }
        }
      }
    })

    if (!announcement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Fetch creator details separately
    let creatorName = 'Unknown'
    if (announcement.createdBy) {
      const creator = await prisma.user.findUnique({
        where: { id: announcement.createdBy },
        select: { name: true, role: true }
      })
      creatorName = creator?.name || 'Unknown'
    }

    return NextResponse.json({
      ...announcement,
      createdByName: creatorName
    })
  } catch (error) {
    console.error('Error fetching announcement:', error)
    return NextResponse.json(
      { error: 'Failed to fetch announcement' },
      { status: 500 }
    )
  }
}
