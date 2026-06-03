import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createNotification, NotificationTemplates } from '@/lib/notification-service';

const sendMessageSchema = z.object({
  content: z.string().min(1),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
});

// GET /api/messages/[participantId] - Get messages with a specific participant
export async function GET(
  request: NextRequest,
  { params }: { params: { participantId: string } }
) {
  try {
    const { participantId } = await params;
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find or create conversation between these users
    let conversation = await db.conversation.findFirst({
      where: {
        participants: {
          every: {
            userId: {
              in: [userId, participantId],
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
                rollNumber: true,
                department: true,
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
                profileImage: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    // If no conversation exists, create one
    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          participants: {
            createMany: {
              data: [
                { userId: userId },
                { userId: participantId },
              ],
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
                  rollNumber: true,
                  department: true,
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
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
    }

    // Mark unread messages as read
    const unreadMessages = conversation.messages.filter(
      (m) => !m.isRead && m.senderId !== userId
    );

    if (unreadMessages.length > 0) {
      await db.message.updateMany({
        where: {
          id: {
            in: unreadMessages.map((m) => m.id),
          },
        },
        data: {
          isRead: true,
        },
      });
    }

    // Format messages for frontend
    const formattedMessages = conversation.messages.map((message) => ({
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      isRead: message.isRead,
      createdAt: message.createdAt,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileType: message.fileType,
      fileSize: message.fileSize,
      deletedAt: message.deletedAt,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        profileImage: message.sender.profileImage || null,
      },
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/messages/[participantId] - Send a message to a specific participant
export async function POST(
  request: NextRequest,
  { params }: { params: { participantId: string } }
) {
  try {
    const { participantId } = await params;
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, fileUrl, fileName, fileType, fileSize } = sendMessageSchema.parse(body);

    // Find or create conversation
    let conversation = await db.conversation.findFirst({
      where: {
        participants: {
          every: {
            userId: {
              in: [userId, participantId],
            },
          },
        },
      },
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          participants: {
            createMany: {
              data: [
                { userId: userId },
                { userId: participantId },
              ],
            },
          },
        },
      });
    }

    // Create the message
    const message = await db.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        receiverId: participantId,
        content: content,
        isRead: false,
        fileUrl,
        fileName,
        fileType,
        fileSize,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Update conversation timestamp
    await db.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // Create notification for recipient
    const template = NotificationTemplates.messageReceived(
      message.sender.name || 'Someone',
      content
    );
    
    console.log('Creating message notification for:', participantId);
    console.log('Notification template:', template);
    
    await createNotification({
      userId: participantId,
      ...template,
    }).catch(err => console.error('Failed to send message notification:', err));

    // Format message for frontend
    const formattedMessage = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      isRead: message.isRead,
      createdAt: message.createdAt,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        profileImage: message.sender.profileImage || null,
      },
    };

    return NextResponse.json(formattedMessage, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}