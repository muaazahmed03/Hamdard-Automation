import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/meetings - Get all meetings (admin only)
export async function GET(request: NextRequest) {
  try {
    // For now, skip authentication and return all meetings
    const meetings = await db.meeting.findMany({
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    return NextResponse.json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}