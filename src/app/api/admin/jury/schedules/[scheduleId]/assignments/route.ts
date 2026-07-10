import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET jury assignments for a defense schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;

    const assignments = await db.juryAssignment.findMany({
      where: {
        defenseScheduleId: scheduleId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching jury assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jury assignments' },
      { status: 500 }
    );
  }
}

// POST - Create jury assignment for a group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;
    const body = await request.json();
    const {
      groupId,
      groupName,
      projectTitle,
      juryMembers, // Array of teacher IDs
      chairpersonId,
    } = body;

    if (!groupId || !juryMembers || !Array.isArray(juryMembers) || juryMembers.length === 0) {
      return NextResponse.json(
        { error: 'Group ID and jury members are required' },
        { status: 400 }
      );
    }

    const assignment = await db.juryAssignment.create({
      data: {
        defenseScheduleId: scheduleId,
        groupId,
        groupName,
        projectTitle,
        juryMembers: JSON.stringify(juryMembers),
        chairpersonId,
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Error creating jury assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create jury assignment' },
      { status: 500 }
    );
  }
}
