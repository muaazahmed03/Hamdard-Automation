import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get current student's group
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find group where user is a member
    const groupMember = await db.groupMember.findFirst({
      where: {
        userId: userId
      },
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
                    rollNumber: true
                  }
                }
              }
            },
            projects: {
              include: {
                supervisor: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!groupMember) {
      return NextResponse.json({ error: 'No group found' }, { status: 404 });
    }

    return NextResponse.json(groupMember.group);
  } catch (error) {
    console.error('Error fetching student group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group' },
      { status: 500 }
    );
  }
}

