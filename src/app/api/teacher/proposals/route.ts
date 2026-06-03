import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth/next';

// GET proposals for supervisor review
export async function GET(request: NextRequest) {
  try {
    // Get current user from session (you'll need to implement this based on your auth)
    const url = new URL(request.url);
    const supervisorId = url.searchParams.get('supervisorId');

    if (!supervisorId) {
      return NextResponse.json(
        { error: 'Supervisor ID is required' },
        { status: 400 }
      );
    }

    // Get all proposals for this supervisor's projects
    const proposals = await db.projectSubmission.findMany({
      where: {
        project: {
          supervisorId: supervisorId,
        },
        fileType: 'PROPOSAL',
      },
      include: {
        project: {
          include: {
            group: {
              include: {
                members: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        student: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(proposals);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposals' },
      { status: 500 }
    );
  }
}
