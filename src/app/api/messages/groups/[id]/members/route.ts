import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/messages/groups/[id]/members - Add member to group
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    // Get conversation and check permissions
    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
      include: {
        participants: {
          include: {
            user: {
              include: {
                groupMemberships: {
                  include: {
                    group: true
                  }
                }
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

    // Check if member already exists
    const memberExists = conversation.participants.some(p => p.userId === memberId);
    if (memberExists) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
    }

    // Get the user to add
    const newMember = await db.user.findUnique({
      where: { id: memberId },
      include: {
        groupMemberships: {
          include: {
            group: true
          }
        }
      }
    });

    if (!newMember) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If adding a student, verify they're in the same project group
    if (newMember.role === 'STUDENT') {
      const currentUser = conversation.participants.find(p => p.userId === userId);
      if (currentUser?.user?.groupMemberships) {
        const currentUserGroupIds = currentUser.user.groupMemberships.map(gm => gm.groupId);
        const newMemberGroupIds = newMember.groupMemberships.map(gm => gm.groupId);
        const hasCommonGroup = currentUserGroupIds.some(gid => newMemberGroupIds.includes(gid));
        
        if (!hasCommonGroup) {
          return NextResponse.json(
            { error: 'Can only add students from your project group' },
            { status: 403 }
          );
        }
      }
    }

    // Add participant
    await db.conversationParticipant.create({
      data: {
        conversationId: params.id,
        userId: memberId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Member added successfully'
    });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}

// DELETE /api/messages/groups/[id]/members - Remove member from group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    // Get conversation
    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
      include: {
        participants: true
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Only admin can remove others, or users can remove themselves
    if (memberId !== userId && conversation.adminId !== userId) {
      return NextResponse.json({ error: 'Only admin can remove other members' }, { status: 403 });
    }

    // Cannot remove the admin
    if (memberId === conversation.adminId && conversation.participants.length > 1) {
      return NextResponse.json({ error: 'Transfer admin role before leaving' }, { status: 400 });
    }

    // Remove participant
    await db.conversationParticipant.deleteMany({
      where: {
        conversationId: params.id,
        userId: memberId
      }
    });

    // If this was the last member, delete the conversation
    const remainingParticipants = await db.conversationParticipant.count({
      where: { conversationId: params.id }
    });

    if (remainingParticipants === 0) {
      await db.conversation.delete({
        where: { id: params.id }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
