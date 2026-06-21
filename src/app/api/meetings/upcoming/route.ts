import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeValue(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const meetings = await db.meeting.findMany({
      where: {
        endTime: { gt: now },
        OR: [
          { organizerId: userId },
          { attendees: { some: { userId } } },
        ],
      },
      include: {
        organizer: {
          select: { id: true, name: true, role: true },
        },
        attendees: {
          include: {
            user: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 10,
    });

    const formattedMeetings = meetings.map((meeting) => {
      const supervisorAttendee = meeting.attendees.find(
        (attendee) =>
          attendee.user.role === 'TEACHER' ||
          attendee.user.role === 'COMMITTEE_HEAD' ||
          attendee.user.role === 'ADMIN',
      );

      return {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description || '',
        date: formatDateValue(meeting.startTime),
        time: formatTimeValue(meeting.startTime),
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
        type: meeting.isOnline ? 'online' : 'offline',
        isOnline: meeting.isOnline,
        location: meeting.location || '',
        meetingLink: meeting.meetingLink || '',
        supervisorName: supervisorAttendee?.user.name || meeting.organizer.name,
        attendees: meeting.attendees.map((attendee) => ({
          id: attendee.user.id,
          name: attendee.user.name,
          role: attendee.user.role,
        })),
        status: meeting.status.toLowerCase(),
      };
    });

    return NextResponse.json(formattedMeetings);
  } catch (error) {
    console.error('Error fetching upcoming meetings:', error);
    return NextResponse.json({ error: 'Failed to fetch upcoming meetings' }, { status: 500 });
  }
}
