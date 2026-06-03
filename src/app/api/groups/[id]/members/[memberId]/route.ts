import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DELETE /api/groups/[id]/members/[memberId] - Remove a member from group (leader only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { id: groupId, memberId } = params;

    // Check if the user is the leader of this group
    const leaderMembership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: userId,
        role: 'LEADER',
        group: {
          isActive: true
        }
      }
    });

    if (!leaderMembership) {
      return NextResponse.json(
        { error: 'Only the group leader can remove members' },
        { status: 403 }
      );
    }

    // Check if the member to be removed exists in this group
    const memberToRemove = await prisma.groupMember.findFirst({
      where: {
        userId: memberId,
        groupId: groupId
      },
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    });

    if (!memberToRemove) {
      return NextResponse.json(
        { error: 'Member not found in this group' },
        { status: 404 }
      );
    }

    // Prevent removing the leader
    if (memberToRemove.role === 'LEADER') {
      return NextResponse.json(
        { error: 'Cannot remove the group leader' },
        { status: 400 }
      );
    }

    // Get all group members before removal
    const allMembers = await prisma.groupMember.findMany({
      where: { groupId: groupId },
      select: { userId: true }
    });
    const allMemberIds = allMembers.map(m => m.userId);

    // Delete any group requests associated with the removed member and other group members
    // This ensures the removed member can receive new requests after being removed
    await prisma.groupRequest.deleteMany({
      where: {
        OR: [
          // Delete requests sent TO the removed member FROM any group member
          {
            toUserId: memberId,
            fromUserId: { in: allMemberIds }
          },
          // Delete requests sent FROM the removed member TO any group member
          {
            fromUserId: memberId,
            toUserId: { in: allMemberIds }
          }
        ]
      }
    });

    // Remove the member
    await prisma.groupMember.delete({
      where: {
        id: memberToRemove.id
      }
    });

    // Check if group has less than 2 members after removal
    const remainingMembers = await prisma.groupMember.count({
      where: {
        groupId: groupId
      }
    });

    // If less than 2 members remain, deactivate the group
    if (remainingMembers < 2) {
      await prisma.group.update({
        where: { id: groupId },
        data: { isActive: false }
      });

      return NextResponse.json({
        success: true,
        message: `${memberToRemove.user.name} removed. Group deactivated due to insufficient members.`,
        groupDeactivated: true
      });
    }

    return NextResponse.json({
      success: true,
      message: `${memberToRemove.user.name} has been removed from the group`,
      groupDeactivated: false
    });
  } catch (error: any) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member from group' },
      { status: 500 }
    );
  }
}
