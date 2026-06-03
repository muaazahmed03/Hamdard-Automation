import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/groups/check-member - Check if a user is already in a group
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user is already in a group
    const groupMember = await db.groupMember.findFirst({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    rollNumber: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (groupMember) {
      return NextResponse.json({
        hasGroup: true,
        group: groupMember.group,
      });
    }

    return NextResponse.json({
      hasGroup: false,
      group: null,
    });
  } catch (error) {
    console.error('Error checking group membership:', error);
    return NextResponse.json(
      { error: 'Failed to check group membership' },
      { status: 500 }
    );
  }
}
