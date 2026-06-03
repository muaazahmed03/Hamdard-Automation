import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/messages/groups - Create group conversation
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { groupName, memberIds } = body;

    if (!groupName || !memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: 'Group name and at least one member required' },
        { status: 400 }
      );
    }

    // Verify all members exist and are in the same project group
    const members = await db.user.findMany({
      where: {
        id: { in: memberIds },
        status: 'APPROVED'
      },
      include: {
        groupMemberships: {
          include: {
            group: true
          }
        }
      }
    });

    if (members.length !== memberIds.length) {
      return NextResponse.json(
        { error: 'Some members not found or not approved' },
        { status: 400 }
      );
    }

    // Get current user's group memberships
    const currentUser = await db.user.findUnique({
      where: { id: userId },
      include: {
        groupMemberships: {
          include: {
            group: true
          }
        }
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify all members are in the same project group (if current user is a student)
    if (currentUser.role === 'STUDENT') {
      const currentUserGroupIds = currentUser.groupMemberships.map(gm => gm.groupId);
      
      for (const member of members) {
        const memberGroupIds = member.groupMemberships.map(gm => gm.groupId);
        const hasCommonGroup = currentUserGroupIds.some(gid => memberGroupIds.includes(gid));
        
        // Allow teachers to be added, but students must be in the same group
        if (member.role === 'STUDENT' && !hasCommonGroup) {
          return NextResponse.json(
            { error: `Group chats can only be created with your project team members` },
            { status: 403 }
          );
        }
      }
    }

    // Create conversation
    const conversation = await db.conversation.create({
      data: {
        isGroup: true,
        groupName: groupName,
        adminId: userId, // Set creator as admin
        participants: {
          create: [
            { userId: userId }, // Current user
            ...memberIds.map((memberId: string) => ({ userId: memberId }))
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        groupName: conversation.groupName,
        isGroup: conversation.isGroup,
        adminId: conversation.adminId,
        participants: conversation.participants.map(p => ({
          id: p.user.id,
          name: p.user.name,
          profileImage: p.user.profileImage
        }))
      }
    });
  } catch (error) {
    console.error('Error creating group conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create group conversation' },
      { status: 500 }
    );
  }
}
