import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createNotification, NotificationTemplates } from '@/lib/notification-service';

const createSupervisionRequestSchema = z.object({
  teacherId: z.string(),
  projectId: z.string().optional(),
  message: z.string(),
});

// GET /api/supervision/requests - Get current user's supervision requests
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let supervisionRequests;

    // If teacher, get requests sent TO them
    if (userRole === 'TEACHER') {
      supervisionRequests = await db.supervisorRequest.findMany({
        where: {
          teacherId: userId,
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              rollNumber: true,
              department: true,
            },
          },
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } else {
      // If student, get requests sent BY them or any group member
      const studentGroup = await db.groupMember.findFirst({
        where: {
          userId: userId,
        },
        include: {
          group: {
            include: {
              members: true,
            },
          },
        },
      });

      let studentIds = [userId];
      if (studentGroup) {
        studentIds = studentGroup.group.members.map(m => m.userId);
      }

      supervisionRequests = await db.supervisorRequest.findMany({
        where: {
          studentId: {
            in: studentIds,
          },
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              rollNumber: true,
              department: true,
            },
          },
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              specialization: true,
              profileImage: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    return NextResponse.json(supervisionRequests);
  } catch (error) {
    console.error('Error fetching supervision requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supervision requests' },
      { status: 500 }
    );
  }
}

// POST /api/supervision/requests - Create a new supervision request
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createSupervisionRequestSchema.parse(body);

    // Get student's group membership
    const studentGroup = await db.groupMember.findFirst({
      where: {
        userId: userId,
      },
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
    });

    // Check if any group member already has an accepted supervisor
    if (studentGroup) {
      const groupMemberIds = studentGroup.group.members.map(m => m.userId);
      
      const groupSupervision = await db.supervisorRequest.findFirst({
        where: {
          studentId: {
            in: groupMemberIds,
          },
          status: 'ACCEPTED',
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
          student: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (groupSupervision) {
        return NextResponse.json(
          { 
            error: 'Your group already has a supervisor',
            supervisor: groupSupervision.teacher,
            acceptedBy: groupSupervision.student,
          },
          { status: 400 }
        );
      }
    }

    // Check if a request already exists for this teacher and student
    const existingRequest = await db.supervisorRequest.findFirst({
      where: {
        studentId: userId,
        teacherId: validatedData.teacherId,
        status: {
          in: ['PENDING', 'ACCEPTED'],
        },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'A supervision request already exists for this teacher' },
        { status: 400 }
      );
    }

    // Create the supervision request
    const supervisionRequest = await db.supervisorRequest.create({
      data: {
        studentId: userId,
        teacherId: validatedData.teacherId,
        projectId: validatedData.projectId,
        message: validatedData.message,
        status: 'PENDING',
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            department: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    // Create notification for the teacher (receiver)
    const teacherTemplate = NotificationTemplates.supervisionRequestReceived(
      supervisionRequest.student.name || 'A student',
      supervisionRequest.project?.title || 'a project'
    );
    
    await createNotification({
      userId: validatedData.teacherId,
      ...teacherTemplate
    }).catch(err => console.warn('Failed to send notification to teacher:', err));

    // Create notification for the student (sender)
    const studentTemplate = {
      title: 'Supervision Request Sent',
      message: `Your supervision request has been sent to ${supervisionRequest.teacher.name || 'the teacher'}`,
      type: 'INFO' as const,
      category: 'REQUEST' as const
    };
    
    await createNotification({
      userId: userId,
      ...studentTemplate
    }).catch(err => console.warn('Failed to send notification to student:', err));

    return NextResponse.json(supervisionRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating supervision request:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create supervision request' },
      { status: 500 }
    );
  }
}