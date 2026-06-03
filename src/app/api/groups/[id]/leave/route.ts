import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createNotification } from '@/lib/notification-service';

// DELETE /api/groups/[id]/leave - Leave a group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: groupId } = params;

    // Check if group is approved
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Find the member
    const member = group.members.find(m => m.userId === userId);
    
    if (!member) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 400 }
      );
    }

    const userName = member.user.name;

    // Delete any group requests associated with this user and group members
    // This ensures the user can receive new requests after leaving
    const allMemberIds = group.members.map(m => m.userId);
    
    await db.groupRequest.deleteMany({
      where: {
        OR: [
          // Delete requests sent TO the leaving member FROM any group member
          {
            toUserId: userId,
            fromUserId: { in: allMemberIds }
          },
          // Delete requests sent FROM the leaving member TO any group member
          {
            fromUserId: userId,
            toUserId: { in: allMemberIds }
          }
        ]
      }
    });

    // Remove the member
    await db.groupMember.delete({
      where: { id: member.id }
    });

    // Check remaining members
    const remainingMembers = await db.groupMember.count({
      where: { groupId }
    });

    // If no members left or less than 2, deactivate the group
    if (remainingMembers < 2) {
      await db.group.update({
        where: { id: groupId },
        data: { isActive: false }
      });
    }

    // Notify remaining group members
    for (const otherMember of group.members) {
      if (otherMember.userId !== userId) {
        await createNotification({
          userId: otherMember.userId,
          title: 'Member Left Group',
          message: `${userName} has left the group "${group.name}".`,
          type: 'WARNING',
          category: 'GROUP'
        }).catch(err => console.warn('Failed to send notification:', err));
      }
    }

    return NextResponse.json({ 
      success: true,
      remainingMembers,
      groupDeactivated: remainingMembers < 2
    });
  } catch (error: any) {
    console.error('Error leaving group:', error);
    
    return NextResponse.json(
      { error: 'Failed to leave group' },
      { status: 500 }
    );
  }
}
