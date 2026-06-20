import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createNotification, NotificationTemplates } from '@/lib/notification-service';

const createSupervisionRequestSchema = z.object({
  teacherId: z.string(),
  projectId: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
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

    // If teacher, get requests sent TO them (with group + proposal context)
    if (userRole === 'TEACHER') {
      const rawRequests = await db.supervisorRequest.findMany({
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
              requirements: true,
              proposalDocument: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const studentIds = rawRequests.map((req) => req.studentId);
      const groupMembers = studentIds.length
        ? await db.groupMember.findMany({
            where: { userId: { in: studentIds } },
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
          })
        : [];

      const proposals = studentIds.length
        ? await db.projectSubmission.findMany({
            where: {
              studentId: { in: studentIds },
              fileType: 'PROPOSAL',
            },
            orderBy: { createdAt: 'desc' },
          })
        : [];

      const groupByStudent = new Map(
        groupMembers.map((member) => [member.userId, member.group]),
      );
      const proposalByStudent = new Map<string, (typeof proposals)[0]>();
      for (const proposal of proposals) {
        if (!proposalByStudent.has(proposal.studentId)) {
          proposalByStudent.set(proposal.studentId, proposal);
        }
      }

      supervisionRequests = rawRequests.map((req) => {
        const group = groupByStudent.get(req.studentId);
        const members =
          group?.members.map((member) => ({
            id: member.user.id,
            name: member.user.name,
            email: member.user.email,
            rollNumber: member.user.rollNumber,
            role: member.role,
          })) ?? [];
        const leader =
          members.find((member) => member.role?.toUpperCase() === 'LEADER') ??
          members[0] ??
          null;
        const proposal = proposalByStudent.get(req.studentId);

        return {
          ...req,
          group: group
            ? {
                id: group.id,
                name: group.name,
                leader,
                members,
              }
            : null,
          proposalFile: proposal
            ? {
                id: proposal.id,
                fileName: proposal.fileName,
                fileUrl: proposal.fileUrl,
                status: proposal.status,
                supervisorApprovalStatus: proposal.supervisorApprovalStatus,
              }
            : req.project?.proposalDocument
              ? {
                  id: req.project.id,
                  fileName: 'Proposal Document',
                  fileUrl: req.project.proposalDocument,
                  status: req.status,
                  supervisorApprovalStatus: 'PENDING',
                }
              : null,
        };
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
        group: { isActive: true },
      },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
            projects: {
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!studentGroup) {
      return NextResponse.json(
        { error: 'You must be in a group before sending a supervision request' },
        { status: 400 },
      );
    }

    const membership = studentGroup.group.members.find((m) => m.userId === userId);
    if (membership?.role !== 'LEADER') {
      return NextResponse.json(
        { error: 'Only the group leader can send supervision requests' },
        { status: 403 },
      );
    }

    const groupProject = studentGroup.group.projects[0] ?? null;
    const resolvedProjectId = validatedData.projectId || groupProject?.id || undefined;

    if (!resolvedProjectId) {
      return NextResponse.json(
        {
          error:
            'Your group does not have project details yet. Complete a group request with project information first.',
        },
        { status: 400 },
      );
    }

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
        projectId: resolvedProjectId,
        message: validatedData.message.trim(),
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
            requirements: true,
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