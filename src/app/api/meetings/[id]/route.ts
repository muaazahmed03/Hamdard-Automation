import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const meetingId = parseInt(params.id);
    
    const meeting = meetings.find(m => m.id === meetingId);
    
    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error('Error fetching meeting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const meetingId = parseInt(params.id);
    const body = await request.json();
    
    const meetingIndex = meetings.findIndex(m => m.id === meetingId);
    
    if (meetingIndex === -1) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    // Update meeting with allowed fields
    const allowedUpdates = ['title', 'description', 'date', 'time', 'type', 'location', 'meetingLink', 'status'];
    const updates: any = {};
    
    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    // Update startTime and endTime if date or time changed
    if (updates.date || updates.time) {
      const newDate = updates.date || meetings[meetingIndex].date;
      const newTime = updates.time || meetings[meetingIndex].time;
      updates.startTime = `${newDate}T${newTime}:00Z`;
      updates.endTime = `${newDate}T${parseInt(newTime.split(':')[0]) + 1}:${newTime.split(':')[1]}:00Z`;
    }

    meetings[meetingIndex] = {
      ...meetings[meetingIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json(meetings[meetingIndex]);
  } catch (error) {
    console.error('Error updating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to update meeting' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const meetingId = parseInt(params.id);
    
    const meetingIndex = meetings.findIndex(m => m.id === meetingId);
    
    if (meetingIndex === -1) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    meetings.splice(meetingIndex, 1);

    return NextResponse.json(
      { message: 'Meeting deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return NextResponse.json(
      { error: 'Failed to delete meeting' },
      { status: 500 }
    );
  }
}