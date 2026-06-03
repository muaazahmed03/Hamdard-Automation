import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createNotification, NotificationTemplates } from '@/lib/notification-service';

// GET /api/messages/groups/[id]/messages - Get all messages for a group conversation
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
      include: {
        messages: {
          include: {
            sender: { select: { id: true, name: true, profileImage: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        participants: true
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Only allow participants to view messages
    const isParticipant = conversation.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formattedMessages = conversation.messages.map(m => ({
      id: m.id,
      content: m.content,
      senderId: m.senderId,
      receiverId: m.receiverId,
      isRead: m.isRead,
      createdAt: m.createdAt,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      fileType: m.fileType,
      fileSize: m.fileSize,
      deletedAt: m.deletedAt,
      sender: {
        id: m.sender.id,
        name: m.sender.name,
        profileImage: m.sender.profileImage,
      },
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching group messages:', error);
    return NextResponse.json({ error: 'Failed to fetch group messages' }, { status: 500 });
  }
}

// POST /api/messages/groups/[id]/messages - Send a message to a group conversation
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: conversationId } = await params;
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, fileUrl, fileName, fileType, fileSize } = body;

    if (!content && !fileUrl) {
      return NextResponse.json({ error: 'Message content or file is required' }, { status: 400 });
    }

    // Verify user is a participant in this conversation
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const isParticipant = conversation.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find a participant to use as receiver for message storage
    // (Group messages still need a receiverId in the current schema)
    const otherParticipant = conversation.participants.find(p => p.userId !== userId);
    const receiverId = otherParticipant?.userId || userId;

    // Create the message
    const message = await db.message.create({
      data: {
        conversationId: conversationId,
        senderId: userId,
        receiverId: receiverId,
        content: content || (fileUrl ? '📎 File attachment' : ''),
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
            profileImage: true
          }
        }
      }
    });

    // Update conversation timestamp
    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Create notifications for all participants except sender
    const recipientIds = conversation.participants
      .filter(p => p.userId !== userId)
      .map(p => p.userId);

    const sender = await db.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    const template = NotificationTemplates.messageReceived(
      sender?.name || 'Someone',
      content || '📎 File attachment'
    );

    for (const recipientId of recipientIds) {
      await createNotification({
        userId: recipientId,
        ...template,
        link: '/messages'
      }).catch(err => console.error('Failed to create group message notification:', err));
    }

    return NextResponse.json({
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
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        profileImage: message.sender.profileImage,
      },
    });
  } catch (error) {
    console.error('Error sending group message:', error);
    return NextResponse.json({ error: 'Failed to send group message' }, { status: 500 });
  }
}
