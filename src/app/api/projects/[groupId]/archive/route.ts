import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateArchiveResultPdf } from '@/lib/reportPdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Generate and retrieve project archive
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    // Get user ID from header or query parameter (for new tab opens)
    const userId = request.headers.get('x-user-id') || request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch group with all related data
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                rollNumber: true,
                department: true,
              },
            },
          },
        },
        projects: {
          include: {
            supervisor: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
              },
            },
            submissions: {
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    rollNumber: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is a member of the group
    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const project = group.projects?.[0];
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if project is completed (FYP II accepted)
    if (project.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Project is not completed yet' },
        { status: 400 }
      );
    }

    // Fetch all defense schedules and evaluations
    const defenseSchedules = await db.defenseSchedule.findMany({
      where: {
        juryAssignments: {
          some: {
            groupId: groupId,
          },
        },
      },
      include: {
        juryAssignments: {
          where: {
            groupId: groupId,
          },
          include: {
            defenseSchedule: {
              select: {
                defenseType: true,
                defenseDate: true,
                defenseTime: true,
                venue: true,
              },
            },
          },
        },
      },
      orderBy: {
        defenseDate: 'asc',
      },
    });

    // Fetch chat logs (conversations involving group members)
    const groupMemberIds = group.members.map((m) => m.userId);
    const conversations = await db.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: {
              in: groupMemberIds,
            },
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            receiver: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    // Fetch meetings involving group members
    const meetings = await db.meeting.findMany({
      where: {
        attendees: {
          some: {
            userId: {
              in: groupMemberIds,
            },
          },
        },
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendees: {
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
      orderBy: {
        startTime: 'asc',
      },
    });

    // Fetch supervisor requests and remarks
    const supervisorRequests = await db.supervisorRequest.findMany({
      where: {
        projectId: project.id,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Compile archive data
    const archiveData = {
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        domain: project.domain,
        objectives: project.objectives,
        abstract: project.abstract,
        tools: project.tools,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      group: {
        id: group.id,
        name: group.name,
        members: group.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          rollNumber: m.user.rollNumber,
          department: m.user.department,
          joinedAt: m.joinedAt,
        })),
      },
      supervisor: project.supervisor
        ? {
            id: project.supervisor.id,
            name: project.supervisor.name,
            email: project.supervisor.email,
            department: project.supervisor.department,
          }
        : null,
      submissions: project.submissions.map((sub) => ({
        id: sub.id,
        title: sub.title,
        description: sub.description,
        fileType: sub.fileType,
        fileName: sub.fileName,
        fileUrl: sub.fileUrl,
        status: sub.status,
        supervisorApprovalStatus: sub.supervisorApprovalStatus,
        supervisorRemarks: sub.supervisorRemarks,
        adminRemarks: sub.adminRemarks,
        committeeRemarks: sub.committeeRemarks,
        conditionalApprovalRemarks: sub.conditionalApprovalRemarks,
        defenseAttempts: sub.defenseAttempts,
        defenseStatus: sub.defenseStatus,
        approvedBySupervisorAt: sub.approvedBySupervisorAt,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      })),
      defenses: defenseSchedules.map((schedule) => ({
        id: schedule.id,
        defenseType: schedule.defenseType,
        title: schedule.title,
        description: schedule.description,
        defenseDate: schedule.defenseDate,
        defenseTime: schedule.defenseTime,
        venue: schedule.venue,
        status: schedule.status,
        assignments: schedule.juryAssignments.map((assignment) => ({
          id: assignment.id,
          projectTitle: assignment.projectTitle,
          evaluationStatus: assignment.evaluationStatus,
          marks: assignment.marks,
          feedback: assignment.feedback,
          juryEvaluations: assignment.juryEvaluations
            ? JSON.parse(assignment.juryEvaluations)
            : null,
          createdAt: assignment.createdAt,
          updatedAt: assignment.updatedAt,
        })),
      })),
      chatLogs: conversations.map((conv) => ({
        id: conv.id,
        isGroup: conv.isGroup,
        groupName: conv.groupName,
        participants: conv.participants.map((p) => ({
          id: p.user.id,
          name: p.user.name,
          email: p.user.email,
          role: p.user.role,
        })),
        messages: conv.messages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          sender: {
            id: msg.sender.id,
            name: msg.sender.name,
            email: msg.sender.email,
          },
          receiver: {
            id: msg.receiver.id,
            name: msg.receiver.name,
            email: msg.receiver.email,
          },
          fileUrl: msg.fileUrl,
          fileName: msg.fileName,
          fileType: msg.fileType,
          createdAt: msg.createdAt,
        })),
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })),
      meetings: meetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        location: meeting.location,
        isOnline: meeting.isOnline,
        meetingLink: meeting.meetingLink,
        status: meeting.status,
        organizer: {
          id: meeting.organizer.id,
          name: meeting.organizer.name,
          email: meeting.organizer.email,
        },
        attendees: meeting.attendees.map((a) => ({
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
          status: a.status,
        })),
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
      })),
      supervisorRequests: supervisorRequests.map((req) => ({
        id: req.id,
        message: req.message,
        status: req.status,
        student: {
          id: req.student.id,
          name: req.student.name,
          email: req.student.email,
        },
        teacher: {
          id: req.teacher.id,
          name: req.teacher.name,
          email: req.teacher.email,
        },
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
      })),
      archiveGeneratedAt: new Date().toISOString(),
    };

    // Generate a real PDF result document that mobile/desktop viewers can open.
    const pdfBuffer = await generateArchiveResultPdf(archiveData);
    const safeGroupName = (group.name || 'Group').replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `Project_Result_${safeGroupName}_${new Date().toISOString().split('T')[0]}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error('Error generating archive:', error);
    return NextResponse.json(
      { error: 'Failed to generate archive' },
      { status: 500 }
    );
  }
}
