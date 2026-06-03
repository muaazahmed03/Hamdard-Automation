import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/messages/available-users - Get users current user can chat with based on role
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user with role
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        groupMemberships: {
          include: {
            group: {
              include: {
                members: {
                  include: {
                    user: true
                  }
                },
                projects: {
                  include: {
                    supervisor: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let availableUsers: any[] = [];

    switch (currentUser.role) {
      case 'STUDENT':
        // Students can chat with:
        // 1. Group members
        // 2. Their supervisor
        const groupMemberIds: string[] = [];
        const supervisorIds: string[] = [];

        currentUser.groupMemberships.forEach(membership => {
          // Get all group members except self
          membership.group.members.forEach(member => {
            if (member.userId !== userId && !groupMemberIds.includes(member.userId)) {
              groupMemberIds.push(member.userId);
            }
          });

          // Get supervisors from group projects
          membership.group.projects.forEach(project => {
            if (project.supervisorId && !supervisorIds.includes(project.supervisorId)) {
              supervisorIds.push(project.supervisorId);
            }
          });
        });

        const allowedStudentUserIds = [...new Set([...groupMemberIds, ...supervisorIds])];

        availableUsers = await prisma.user.findMany({
          where: {
            id: { in: allowedStudentUserIds },
            status: 'APPROVED'
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profileImage: true,
            rollNumber: true,
            department: true
          }
        });
        break;

      case 'TEACHER':
        // Teachers can chat with:
        // 1. All students (those they supervise or all approved students)
        // 2. Admin
        // 3. Committee Head
        availableUsers = await prisma.user.findMany({
          where: {
            status: 'APPROVED',
            id: { not: userId },
            OR: [
              { role: 'STUDENT' },
              { role: 'ADMIN' },
              { role: 'COMMITTEE_HEAD' }
            ]
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profileImage: true,
            rollNumber: true,
            department: true
          }
        });
        break;

      case 'COMMITTEE_HEAD':
        // Committee Head can chat with:
        // 1. Admin
        // 2. All Teachers
        availableUsers = await prisma.user.findMany({
          where: {
            status: 'APPROVED',
            id: { not: userId },
            OR: [
              { role: 'ADMIN' },
              { role: 'TEACHER' }
            ]
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profileImage: true,
            rollNumber: true,
            department: true
          }
        });
        break;

      case 'ADMIN':
        // Admin can chat with:
        // 1. Teachers
        // 2. Committee Head
        availableUsers = await prisma.user.findMany({
          where: {
            status: 'APPROVED',
            id: { not: userId },
            OR: [
              { role: 'TEACHER' },
              { role: 'COMMITTEE_HEAD' }
            ]
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profileImage: true,
            rollNumber: true,
            department: true
          }
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    return NextResponse.json(availableUsers);

  } catch (error) {
    console.error('Error fetching available users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available users' },
      { status: 500 }
    );
  }
}
