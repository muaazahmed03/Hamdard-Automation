import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/supervision/capacity - Check teacher's supervision capacity
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a teacher
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        teacherProfile: true
      }
    });

    if (!user || user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can check supervision capacity' }, { status: 403 });
    }

    // Get teacher's capacity (default 4)
    const capacity = (user.teacherProfile as any)?.supervisionCapacity || 4;

    // Get current active supervisions
    const currentSupervisions = await prisma.project.findMany({
      where: {
        supervisorId: userId,
        status: {
          in: ['PROPOSED', 'APPROVED', 'IN_PROGRESS']
        }
      },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    rollNumber: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const currentCount = currentSupervisions.length;
    const available = capacity - currentCount;
    const isAtCapacity = currentCount >= capacity;

    return NextResponse.json({
      capacity,
      currentCount,
      available,
      isAtCapacity,
      supervisions: currentSupervisions.map(p => ({
        id: p.id,
        title: p.title,
        status: p.status,
        groupName: p.group?.name,
        memberCount: p.group?.members.length || 0
      }))
    });

  } catch (error) {
    console.error('Failed to check supervision capacity:', error);
    return NextResponse.json({ error: 'Failed to check supervision capacity' }, { status: 500 });
  }
}
