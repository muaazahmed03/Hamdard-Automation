import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/messages/conversations - Get current user's conversations
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all conversations where the current user is a participant
    const conversations = await db.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
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
                rollNumber: true,
                department: true,
                profileImage: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Get unread counts for each conversation
    const conversationUnreadCounts = await Promise.all(
      conversations.map(async (conv) => {
        const count = await db.message.count({
          where: {
            conversationId: conv.id,
            isRead: false,
            senderId: { not: userId }
          }
        });
        return { conversationId: conv.id, unreadCount: count };
      })
    );

    const unreadCountMap = new Map(
      conversationUnreadCounts.map(item => [item.conversationId, item.unreadCount])
    );

    // Format the conversations for the frontend
    const formattedConversations = conversations.map((conversation) => {
      const lastMessage = conversation.messages[0];
      const unreadCount = unreadCountMap.get(conversation.id) || 0;

      // Handle group conversations
      if (conversation.isGroup) {
        return {
          id: conversation.id,
          isGroup: true,
          groupName: conversation.groupName,
          participantId: conversation.id, // Use conversation ID for group chats
          participantName: conversation.groupName || 'Group Chat',
          participantRole: 'group',
          lastMessage: lastMessage?.content || 'No messages yet',
          lastMessageTime: lastMessage?.createdAt || conversation.createdAt,
          unreadCount: unreadCount,
          isOnline: true,
          profileImage: null,
          participantCount: conversation.participants.length
        };
      }

      // Handle individual conversations
      const otherParticipant = conversation.participants.find(
        (p) => p.userId !== userId
      );

      return {
        id: conversation.id,
        isGroup: false,
        participantId: otherParticipant?.userId,
        participantName: otherParticipant?.user?.name || 'Unknown',
        participantRole: otherParticipant?.user?.role?.toLowerCase() || 'student',
        lastMessage: lastMessage?.content || 'No messages yet',
        lastMessageTime: lastMessage?.createdAt || conversation.createdAt,
        unreadCount: unreadCount,
        isOnline: true, // Will be updated via socket presence events
        profileImage: otherParticipant?.user?.profileImage || null,
      };
    });

    return NextResponse.json(formattedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}