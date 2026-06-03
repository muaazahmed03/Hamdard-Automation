import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/messages/groups/[id] - Get group details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                profileImage: true,
                rollNumber: true,
                department: true
              }
            }
          }
        }
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      id: conversation.id,
      groupName: conversation.groupName,
      groupImage: conversation.groupImage,
      adminId: conversation.adminId,
      isGroup: conversation.isGroup,
      createdAt: conversation.createdAt,
      participants: conversation.participants.map(p => ({
        id: p.user.id,
        name: p.user.name,
        email: p.user.email,
        role: p.user.role,
        profileImage: p.user.profileImage,
        rollNumber: p.user.rollNumber,
        department: p.user.department,
        isAdmin: p.user.id === conversation.adminId
      }))
    });
  } catch (error) {
    console.error('Error fetching group details:', error);
    return NextResponse.json({ error: 'Failed to fetch group details' }, { status: 500 });
  }
}

// PATCH /api/messages/groups/[id] - Update group details
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { groupName, groupImage, adminId } = body;

    // Check if user is admin or participant
    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
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

    // Only admin can change group name, image, or transfer admin
    if (conversation.adminId && conversation.adminId !== userId) {
      return NextResponse.json({ error: 'Only admin can modify group settings' }, { status: 403 });
    }

    // Validate new admin if changing
    if (adminId && adminId !== conversation.adminId) {
      const isNewAdminParticipant = conversation.participants.some(p => p.userId === adminId);
      if (!isNewAdminParticipant) {
        return NextResponse.json({ error: 'New admin must be a group member' }, { status: 400 });
      }
    }

    const updatedConversation = await db.conversation.update({
      where: { id: params.id },
      data: {
        ...(groupName && { groupName }),
        ...(groupImage !== undefined && { groupImage }),
        ...(adminId && { adminId })
      }
    });

    return NextResponse.json({
      success: true,
      conversation: updatedConversation
    });
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}
