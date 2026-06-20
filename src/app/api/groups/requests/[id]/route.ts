import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createNotification, NotificationTemplates } from '@/lib/notification-service';

const updateGroupRequestSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
  groupName: z.string().optional(),
});

async function resolveGroupProjectTeacherId(groupId: string, leaderId: string) {
  const members = await db.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  });
  const memberIds = members.map((member) => member.userId);

  const acceptedSupervisor = await db.supervisorRequest.findFirst({
    where: {
      studentId: { in: memberIds.length ? memberIds : [leaderId] },
      status: 'ACCEPTED',
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (acceptedSupervisor?.teacherId) {
    return {
      teacherId: acceptedSupervisor.teacherId,
      supervisorId: acceptedSupervisor.teacherId,
    };
  }

  return {
    teacherId: leaderId,
    supervisorId: null as string | null,
  };
}

async function ensureGroupProject(
  groupId: string,
  leaderId: string,
  projectData: {
    title: string;
    description: string;
    requirements?: string | null;
  },
) {
  const existing = await db.project.findFirst({
    where: { groupId },
    orderBy: { createdAt: 'asc' },
  });

  const teacherInfo = await resolveGroupProjectTeacherId(groupId, leaderId);

  if (existing) {
    return db.project.update({
      where: { id: existing.id },
      data: {
        title: projectData.title,
        description: projectData.description,
        requirements: projectData.requirements ?? existing.requirements,
        isFacultyProposed: false,
        ...(teacherInfo.supervisorId
          ? {
              teacherId: teacherInfo.teacherId,
              supervisorId: teacherInfo.supervisorId,
            }
          : {}),
      },
    });
  }

  return db.project.create({
    data: {
      title: projectData.title,
      description: projectData.description,
      requirements: projectData.requirements ?? null,
      teacherId: teacherInfo.teacherId,
      supervisorId: teacherInfo.supervisorId,
      groupId,
      status: 'PROPOSED',
      isFacultyProposed: false,
    },
  });
}

// PUT /api/groups/requests/[id] - Update group request status (accept/reject)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: requestId } = await params;
    const body = await request.json();
    const { status, groupName } = updateGroupRequestSchema.parse(body);

    // Find the group request
    const groupRequest = await db.groupRequest.findUnique({
      where: { id: requestId },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        toUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!groupRequest) {
      return NextResponse.json(
        { error: 'Group request not found' },
        { status: 404 }
      );
    }

    // Check if the current user is the receiver of the request
    if (groupRequest.toUserId !== userId) {
      return NextResponse.json(
        { error: 'You can only respond to requests sent to you' },
        { status: 403 }
      );
    }

    // Check if the request is still pending
    if (groupRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This request has already been responded to' },
        { status: 400 }
      );
    }

    // Update the request status
    const updatedRequest = await db.groupRequest.update({
      where: { id: requestId },
      data: { status },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            department: true,
          },
        },
        toUser: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            department: true,
          },
        },
      },
    });

    // Create notification for the sender
    const template = status === 'ACCEPTED'
      ? NotificationTemplates.groupInviteAccepted(
          groupRequest.toUser.name || 'Student',
          'your group'
        )
      : NotificationTemplates.groupInviteRejected(
          groupRequest.toUser.name || 'Student',
          'your group'
        );
    
    await createNotification({
      userId: groupRequest.fromUserId,
      ...template
    }).catch(err => console.warn('Failed to send notification:', err));

    // If accepted, create a group membership
    if (status === 'ACCEPTED') {
      // First check if either user's group has reached max size (3 members)
      const senderGroup = await db.groupMember.findFirst({
        where: { userId: groupRequest.fromUserId },
        include: {
          group: {
            include: { members: true }
          }
        }
      });

      if (senderGroup && senderGroup.group.members.length >= 3) {
        return NextResponse.json(
          { error: 'The sender\'s group has reached maximum size (3 members). Cannot accept request.' },
          { status: 400 }
        );
      }

      const recipientGroup = await db.groupMember.findFirst({
        where: { userId: groupRequest.toUserId },
        include: {
          group: {
            include: { members: true }
          }
        }
      });

      if (recipientGroup && recipientGroup.group.members.length >= 3) {
        return NextResponse.json(
          { error: 'Your group has reached maximum size (3 members). Cannot accept more members.' },
          { status: 400 }
        );
      }

      let groupId = null;
      let groupFormed = false;
      
      // Check if either user already has a group
      const existingGroup = await db.group.findFirst({
        where: {
          members: {
            some: {
              userId: {
                in: [groupRequest.fromUserId, groupRequest.toUserId],
              },
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });

      if (existingGroup) {
        // Check if adding these users would exceed max size
        const currentMemberCount = existingGroup.members.length;
        const usersToAdd = [groupRequest.fromUserId, groupRequest.toUserId].filter(userId => 
          !existingGroup.members.some(m => m.userId === userId)
        );
        
        if (currentMemberCount + usersToAdd.length > 3) {
          return NextResponse.json(
            { error: 'Cannot accept request. Group would exceed maximum size of 3 members.' },
            { status: 400 }
          );
        }

        groupId = existingGroup.id;
        
        // Add both users to the existing group if not already members
        for (const userId of [groupRequest.fromUserId, groupRequest.toUserId]) {
          const existingMembership = await db.groupMember.findUnique({
            where: {
              groupId_userId: {
                groupId: existingGroup.id,
                userId: userId,
              },
            },
          });

          if (!existingMembership) {
            await db.groupMember.create({
              data: {
                groupId: existingGroup.id,
                userId: userId,
                role: 'MEMBER',
              },
            });
          }
        }
        
        // Check if group now has 2-3 members and mark as formed
        const updatedGroup = await db.group.findUnique({
          where: { id: existingGroup.id },
          include: { members: true }
        });
        
        if (updatedGroup && updatedGroup.members.length >= 2 && updatedGroup.members.length <= 3) {
          await db.group.update({
            where: { id: existingGroup.id },
            data: { isActive: true }
          });
          groupFormed = true;
        }
      } else {
        // Create a new group with the initiator as leader
        const finalGroupName =
          groupRequest.projectTitle ||
          groupRequest.groupName ||
          groupName ||
          `Group ${groupRequest.fromUser.name} & ${groupRequest.toUser.name}`;
        const finalDescription =
          groupRequest.projectDescription?.trim() ||
          'FYP Project Group';

        const newGroup = await db.group.create({
          data: {
            name: finalGroupName,
            description: finalDescription,
            maxMembers: 3,
            isActive: true,
          },
        });

        groupId = newGroup.id;

        // Add both users to the new group
        await db.groupMember.createMany({
          data: [
            {
              groupId: newGroup.id,
              userId: groupRequest.fromUserId,
              role: 'LEADER',
            },
            {
              groupId: newGroup.id,
              userId: groupRequest.toUserId,
              role: 'MEMBER',
            },
          ],
        });

        groupFormed = true;
      }

      if (groupId && groupRequest.projectTitle && groupRequest.projectDescription) {
        const leaderMembership = await db.groupMember.findFirst({
          where: { groupId, role: 'LEADER' },
        });
        await ensureGroupProject(
          groupId,
          leaderMembership?.userId || groupRequest.fromUserId,
          {
            title: groupRequest.projectTitle,
            description: groupRequest.projectDescription,
            requirements: groupRequest.projectRequirements,
          },
        );
      }
      
      // Get the final group details to return
      const finalGroup = await db.group.findUnique({
        where: { id: groupId },
        select: { id: true, name: true }
      });
      
      return NextResponse.json({ 
        ...updatedRequest, 
        groupFormed,
        groupId,
        groupName: finalGroup?.name || null
      });
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating group request:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update group request' },
      { status: 500 }
    );
  }
}

// PATCH /api/groups/requests/[id] - Update group request status (alias to PUT)
export const PATCH = PUT;

// DELETE /api/groups/requests/[id] - Cancel a sent group request
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: requestId } = await params;

    // Find the group request
    const groupRequest = await db.groupRequest.findUnique({
      where: { id: requestId },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });

    if (!groupRequest) {
      return NextResponse.json(
        { error: 'Group request not found' },
        { status: 404 }
      );
    }

    // Check if the current user is the sender of the request
    if (groupRequest.fromUserId !== userId) {
      return NextResponse.json(
        { error: 'You can only cancel requests you sent' },
        { status: 403 }
      );
    }

    // Delete the request
    await db.groupRequest.delete({
      where: { id: requestId },
    });

    // Notify the receiver that the request was cancelled
    const template = {
      title: 'Group Request Cancelled',
      message: `${groupRequest.fromUser.name || 'A student'} has cancelled their group request.`,
      type: 'INFO' as const,
      category: 'REQUEST' as const,
    };

    await createNotification({
      userId: groupRequest.toUserId,
      ...template,
    }).catch(err => console.warn('Failed to send notification:', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting group request:', error);
    return NextResponse.json(
      { error: 'Failed to delete group request' },
      { status: 500 }
    );
  }
}