import { NextRequest, NextResponse } from 'next/server';
import { sendMeetingNotification } from '@/lib/socket';

// Get Socket.IO server instance
let io: any = null;

// Function to get Socket.IO instance (this would be initialized in your server file)
const getSocketIO = () => {
  if (!io && typeof global !== 'undefined' && (global as any).socketIO) {
    io = (global as any).socketIO;
  }
  return io;
};

// Mock data storage (in a real app, this would be a database)
let meetings: any[] = [
  {
    id: 1,
    title: 'Project Progress Discussion',
    description: 'Discuss current progress and next steps',
    date: '2024-01-20',
    time: '14:00',
    startTime: '2024-01-20T14:00:00Z',
    endTime: '2024-01-20T15:00:00Z',
    type: 'online',
    meetingLink: 'https://zoom.us/meeting/123456',
    location: '',
    supervisorId: '1',
    supervisorName: 'Dr. John Smith',
    studentId: 'CS2021001',
    studentName: 'John Doe',
    status: 'scheduled',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    title: 'Thesis Proposal Review',
    description: 'Review and approve thesis proposal',
    date: '2024-01-22',
    time: '10:00',
    startTime: '2024-01-22T10:00:00Z',
    endTime: '2024-01-22T11:00:00Z',
    type: 'offline',
    meetingLink: '',
    location: 'Room 301, CS Department',
    supervisorId: '2',
    supervisorName: 'Dr. Sarah Johnson',
    studentId: 'CS2021001',
    studentName: 'John Doe',
    status: 'scheduled',
    createdAt: '2024-01-14T15:30:00Z'
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const supervisorId = searchParams.get('supervisorId');

    let filteredMeetings = meetings;

    if (studentId) {
      filteredMeetings = filteredMeetings.filter(meeting => meeting.studentId === studentId);
    }

    if (supervisorId) {
      filteredMeetings = filteredMeetings.filter(meeting => meeting.supervisorId === supervisorId);
    }

    return NextResponse.json(filteredMeetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      date,
      time,
      type,
      location,
      meetingLink,
      supervisorId
    } = body;

    // Validate required fields
    if (!title || !date || !time || !supervisorId) {
      return NextResponse.json(
        { error: 'Missing required fields: title, date, time, supervisorId' },
        { status: 400 }
      );
    }

    // Validate meeting type specific fields
    if (type === 'online' && !meetingLink) {
      return NextResponse.json(
        { error: 'Meeting link is required for online meetings' },
        { status: 400 }
      );
    }

    if (type === 'offline' && !location) {
      return NextResponse.json(
        { error: 'Location is required for offline meetings' },
        { status: 400 }
      );
    }

    // Mock supervisor data (in a real app, fetch from database)
    const supervisors = {
      '1': 'Dr. John Smith',
      '2': 'Dr. Sarah Johnson',
      '3': 'Dr. Michael Brown'
    };

    const supervisorName = supervisors[supervisorId as keyof typeof supervisors];
    if (!supervisorName) {
      return NextResponse.json(
        { error: 'Invalid supervisor ID' },
        { status: 400 }
      );
    }

    // Create new meeting
    const newMeeting = {
      id: meetings.length + 1,
      title,
      description: description || '',
      date,
      time,
      startTime: `${date}T${time}:00Z`,
      endTime: `${date}T${parseInt(time.split(':')[0]) + 1}:${time.split(':')[1]}:00Z`,
      type,
      meetingLink: meetingLink || '',
      location: location || '',
      supervisorId,
      supervisorName,
      studentId: 'CS2021001', // Mock student ID
      studentName: 'John Doe', // Mock student name
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };

    meetings.push(newMeeting);

    // Send real-time notification
    const socketIO = getSocketIO();
    if (socketIO) {
      sendMeetingNotification(
        socketIO,
        supervisorId,
        newMeeting.studentId,
        newMeeting
      );
    }

    return NextResponse.json(newMeeting, { status: 201 });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 }
    );
  }
}