import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createNotification, NotificationTemplates } from '@/lib/notification-service';

const createGroupRequestSchema = z.object({
  toUserId: z.string(),
  message: z.string().optional(),
  groupName: z.string().optional(),
  projectTitle: z.string().min(1).optional(),
  projectDescription: z.string().min(1).optional(),
  projectRequirements: z.string().min(1).optional(),
});

// GET /api/groups/requests - Get current user's group requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'sent' or 'received'
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let groupRequests;

    if (type === 'sent') {
      groupRequests = await db.groupRequest.findMany({
        where: {
          fromUserId: userId,
        },
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
        orderBy: {
          createdAt: 'desc',
        },
      });
    } else if (type === 'received') {
      groupRequests = await db.groupRequest.findMany({
        where: {
          toUserId: userId,
        },
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
        orderBy: {
          createdAt: 'desc',
        },
      });
    } else {
      // Get all requests for the current user
      groupRequests = await db.groupRequest.findMany({
        where: {
          OR: [
            { fromUserId: userId },
            { toUserId: userId },
          ],
        },
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
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    return NextResponse.json(groupRequests);
  } catch (error) {
    console.error('Error fetching group requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group requests' },
      { status: 500 }
    );
  }
}

// POST /api/groups/requests - Create a new group request
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createGroupRequestSchema.parse(body);

    // Check if sender's group has reached maximum size (3 members)
    const senderGroup = await db.groupMember.findFirst({
      where: { 
        userId: userId,
        group: {
          isActive: true
        }
      },
      include: {
        group: {
          include: {
            members: true
          }
        }
      }
    });

    if (senderGroup && senderGroup.group.members.length >= 3) {
      return NextResponse.json(
        { error: 'Your group has reached maximum size (3 members). Cannot send more requests.' },
        { status: 400 }
      );
    }

    if (
      !senderGroup &&
      (!validatedData.projectTitle?.trim() ||
        !validatedData.projectDescription?.trim() ||
        !validatedData.projectRequirements?.trim())
    ) {
      return NextResponse.json(
        {
          error:
            'Project name, description, and requirements are required for your first group request.',
        },
        { status: 400 },
      );
    }

    // Check if recipient's group has reached maximum size
    const recipientGroup = await db.groupMember.findFirst({
      where: { 
        userId: validatedData.toUserId,
        group: {
          isActive: true
        }
      },
      include: {
        group: {
          include: {
            members: true
          }
        }
      }
    });

    if (recipientGroup && recipientGroup.group.members.length >= 3) {
      return NextResponse.json(
        { error: 'The recipient\'s group has reached maximum size (3 members).' },
        { status: 400 }
      );
    }

    // Check if a request already exists between these users
    // Only block if both users are still in active groups
    const existingRequest = await db.groupRequest.findFirst({
      where: {
        OR: [
          { fromUserId: userId, toUserId: validatedData.toUserId },
          { fromUserId: validatedData.toUserId, toUserId: userId },
        ],
        status: {
          in: ['PENDING', 'ACCEPTED'],
        },
      },
    });

    if (existingRequest) {
      // Check if both users are still in active groups
      const fromUserInActiveGroup = await db.groupMember.findFirst({
        where: {
          userId: existingRequest.fromUserId,
          group: { isActive: true }
        }
      });

      const toUserInActiveGroup = await db.groupMember.findFirst({
        where: {
          userId: existingRequest.toUserId,
          group: { isActive: true }
        }
      });

      // If both users are still in active groups, block the request
      if (fromUserInActiveGroup && toUserInActiveGroup) {
        return NextResponse.json(
          { error: 'A group request already exists between these users' },
          { status: 400 }
        );
      } else {
        // One or both users left their group, delete the old request
        await db.groupRequest.delete({
          where: { id: existingRequest.id }
        });
      }
    }

    // Create the group request
    const groupRequest = await db.groupRequest.create({
      data: {
        fromUserId: userId,
        toUserId: validatedData.toUserId,
        message:
          validatedData.message ||
          'Hi! I would like to team up with you for the FYP project.',
        groupName: validatedData.groupName || validatedData.projectTitle,
        projectTitle: validatedData.projectTitle,
        projectDescription: validatedData.projectDescription,
        projectRequirements: validatedData.projectRequirements,
        status: 'PENDING',
      },
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

    // Create notification for the receiver
    const receiverTemplate = NotificationTemplates.groupInviteReceived(
      'your group',
      groupRequest.fromUser.name || 'A student'
    );
    
    await createNotification({
      userId: validatedData.toUserId,
      ...receiverTemplate
    }).catch(err => console.warn('Failed to send notification to receiver:', err));

    // Create notification for the sender
    const senderTemplate = {
      title: 'Group Request Sent',
      message: `Your group request has been sent to ${groupRequest.toUser.name || 'the student'}`,
      type: 'INFO' as const,
      category: 'REQUEST' as const
    };
    
    await createNotification({
      userId: userId,
      ...senderTemplate
    }).catch(err => console.warn('Failed to send notification to sender:', err));

    return NextResponse.json(groupRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating group request:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create group request' },
      { status: 500 }
    );
  }
}