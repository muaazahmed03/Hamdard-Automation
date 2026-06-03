import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';

// GET /api/projects - Get all project ideas (for students)
export async function GET(request: NextRequest) {
  try {
    // Fetch all projects from database
    const projects = await db.project.findMany({
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            specialization: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project (for students/groups)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, requirements, teacherId, supervisorId, groupId, studentId } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // If no teacherId provided, this is a student-initiated project
    // We'll need to assign it to a teacher or mark it as PROPOSED
    const newProject = await db.project.create({
      data: {
        title,
        description,
        requirements: requirements || '',
        status: 'PROPOSED',
        teacherId: teacherId || studentId, // Temporary: use student ID if no teacher assigned
        supervisorId: supervisorId || null,
        groupId: groupId || null,
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Send notification
    try {
      const { createNotification, notifyUsersByRole } = await import('@/lib/notification-service');
      
      // Notify admins and committee heads about new project
      await notifyUsersByRole('ADMIN', {
        title: 'New Project Created',
        message: `A new project "${title}" has been submitted`,
        type: 'info',
        category: 'project',
      });
      
      await notifyUsersByRole('COMMITTEE_HEAD', {
        title: 'New Project Created',
        message: `A new project "${title}" has been submitted`,
        type: 'info',
        category: 'project',
      });
    } catch (notifError) {
      console.error('Failed to send notifications:', notifError);
    }

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}