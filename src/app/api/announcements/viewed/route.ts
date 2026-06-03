import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST - Mark announcement as viewed
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { announcementId } = await request.json()

    if (!announcementId) {
      return NextResponse.json(
        { error: 'Missing announcementId' },
        { status: 400 }
      )
    }

    // Check if announcement exists
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    })

    if (!announcement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Announcement marked as viewed'
    })
  } catch (error) {
    console.error('Error marking announcement as viewed:', error)
    return NextResponse.json(
      { error: 'Failed to mark announcement as viewed' },
      { status: 500 }
    )
  }
}
