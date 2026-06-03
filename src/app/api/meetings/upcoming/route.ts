import { NextRequest, NextResponse } from 'next/server';

// Mock data storage (in a real app, this would be a database)
const meetings = [
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
  },
  {
    id: 3,
    title: 'Demo Preparation',
    description: 'Prepare for final project demo',
    date: '2024-01-25',
    time: '11:00',
    startTime: '2024-01-25T11:00:00Z',
    endTime: '2024-01-25T12:00:00Z',
    type: 'online',
    meetingLink: 'https://zoom.us/meeting/789012',
    location: '',
    supervisorId: '1',
    supervisorName: 'Dr. John Smith',
    studentId: 'CS2021001',
    studentName: 'John Doe',
    status: 'scheduled',
    createdAt: '2024-01-13T09:15:00Z'
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId') || 'CS2021001'; // Default to mock student

    // Get current date and time
    const now = new Date();

    // Filter upcoming meetings (meetings that haven't ended yet)
    const upcomingMeetings = meetings
      .filter(meeting => {
        const meetingEndTime = new Date(meeting.endTime);
        return meetingEndTime > now && meeting.studentId === studentId;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5); // Limit to next 5 meetings

    // Format meetings for the frontend
    const formattedMeetings = upcomingMeetings.map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      date: meeting.date,
      time: meeting.time,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      type: meeting.type,
      isOnline: meeting.type === 'online',
      location: meeting.location,
      meetingLink: meeting.meetingLink,
      supervisorName: meeting.supervisorName,
      attendees: [
        {
          id: meeting.supervisorId,
          name: meeting.supervisorName,
          role: 'supervisor'
        },
        {
          id: meeting.studentId,
          name: meeting.studentName,
          role: 'student'
        }
      ],
      status: meeting.status
    }));

    return NextResponse.json(formattedMeetings);
  } catch (error) {
    console.error('Error fetching upcoming meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming meetings' },
      { status: 500 }
    );
  }
}