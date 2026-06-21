import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createNotification, NotificationTemplates } from '@/lib/notification-service';

function parseMeetingDateTime(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const startTime = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 1);
  return { startTime, endTime };
}

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

function formatMeetingResponse(meeting: {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  location: string | null;
  isOnline: boolean;
  meetingLink: string | null;
  status: string;
  organizer: { id: string; name: string; role?: string | null };
  attendees: Array<{
    user: { id: string; name: string; role?: string | null };
  }>;
}) {
  const supervisorAttendee = meeting.attendees.find(
    (attendee) =>
      attendee.user.role === 'TEACHER' ||
      attendee.user.role === 'COMMITTEE_HEAD' ||
      attendee.user.role === 'ADMIN',
  );
  const studentAttendee = meeting.attendees.find(
    (attendee) => attendee.user.role === 'STUDENT',
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
    location: meeting.location || '',
    meetingLink: meeting.meetingLink || '',
    supervisorId: supervisorAttendee?.user.id || meeting.organizer.id,
    supervisorName: supervisorAttendee?.user.name || meeting.organizer.name,
    studentId: studentAttendee?.user.id || '',
    studentName: studentAttendee?.user.name || '',
    status: meeting.status.toLowerCase(),
    createdAt: meeting.startTime.toISOString(),
    attendees: meeting.attendees.map((attendee) => ({
      id: attendee.user.id,
      name: attendee.user.name,
      role: attendee.user.role,
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const supervisorId = searchParams.get('supervisorId');

    const where: Record<string, unknown> = {};
    if (userId) {
      where.OR = [
        { organizerId: userId },
        { attendees: { some: { userId } } },
      ];
    } else if (studentId) {
      where.attendees = { some: { userId: studentId } };
    } else if (supervisorId) {
      where.attendees = { some: { userId: supervisorId } };
    }

    const meetings = await db.meeting.findMany({
      where,
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
      orderBy: { startTime: 'desc' },
    });

    return NextResponse.json(meetings.map(formatMeetingResponse));
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      date,
      time,
      type,
      location,
      meetingLink,
      supervisorId,
      memberIds,
      participantIds,
      organizerId,
    } = body;

    if (!title?.trim() || !date || !time) {
      return NextResponse.json(
        { error: 'Missing required fields: title, date, time' },
        { status: 400 },
      );
    }

    const isOnline = type === 'online';
    if (isOnline && !meetingLink?.trim()) {
      return NextResponse.json(
        { error: 'Meeting link is required for online meetings' },
        { status: 400 },
      );
    }
    if (!isOnline && !location?.trim()) {
      return NextResponse.json(
        { error: 'Location is required for offline meetings' },
        { status: 400 },
      );
    }

    const { startTime, endTime } = parseMeetingDateTime(date, time);
    let organizer = organizerId || userId;
    let attendeeIds: string[] = [];

    if (Array.isArray(participantIds) && participantIds.length > 0) {
      attendeeIds = participantIds.filter((id: unknown) => typeof id === 'string');
      if (attendeeIds.length === 0) {
        return NextResponse.json(
          { error: 'Please select at least one student' },
          { status: 400 },
        );
      }
      organizer = organizerId || userId;
    } else if (supervisorId) {
      const supervisor = await db.user.findUnique({
        where: { id: supervisorId },
        select: { id: true, role: true },
      });
      if (!supervisor) {
        return NextResponse.json({ error: 'Invalid supervisor ID' }, { status: 400 });
      }
      organizer = userId;
      attendeeIds = [userId, supervisorId];
      if (Array.isArray(memberIds) && memberIds.length > 0) {
        const extraMembers = memberIds.filter(
          (id: unknown) => typeof id === 'string' && id !== userId && id !== supervisorId,
        );
        attendeeIds.push(...extraMembers);
      }
    } else {
      return NextResponse.json(
        { error: 'Missing required participants for this meeting' },
        { status: 400 },
      );
    }

    const uniqueAttendeeIds = [...new Set([organizer, ...attendeeIds])];

    const meeting = await db.meeting.create({
      data: {
        title: title.trim(),
        description: description?.trim() || '',
        startTime,
        endTime,
        location: location?.trim() || null,
        isOnline,
        meetingLink: meetingLink?.trim() || null,
        organizerId: organizer,
        attendees: {
          create: uniqueAttendeeIds.map((attendeeId) => ({
            userId: attendeeId,
          })),
        },
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
    });

    const formattedDate = formatDateValue(startTime);
    const formattedTime = formatTimeValue(startTime);
    const notificationTemplate = NotificationTemplates.meetingScheduled(
      meeting.title,
      formattedDate,
      formattedTime,
    );

    await Promise.all(
      uniqueAttendeeIds
        .filter((attendeeId) => attendeeId !== organizer)
        .map((attendeeId) =>
          createNotification({
            userId: attendeeId,
            ...notificationTemplate,
          }).catch((err) => console.warn('Failed to send meeting notification:', err)),
        ),
    );

    return NextResponse.json(formatMeetingResponse(meeting), { status: 201 });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}
