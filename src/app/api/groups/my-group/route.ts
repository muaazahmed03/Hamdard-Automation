import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Find the user's active group membership
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId: userId,
        group: {
          isActive: true
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ hasGroup: false, group: null });
    }

    // Get the full group data with members and projects
    const groupData = await prisma.group.findUnique({
      where: {
        id: membership.groupId
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                rollNumber: true,
                department: true,
                gpa: true,
                profileImage: true,
                role: true
              }
            }
          }
        },
        projects: {
          where: {
            OR: [
              { status: 'PROPOSED' },
              { status: 'APPROVED' },
              { status: 'IN_PROGRESS' },
              { status: 'COMPLETED' }
            ]
          },
          include: {
            supervisor: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
                profileImage: true
              }
            }
          }
        }
      }
    });

    if (!groupData) {
      return NextResponse.json({ hasGroup: false, group: null });
    }
    
    // Get the leader (first member or member with LEADER role)
    const leader = groupData.members.find(m => m.role === 'LEADER') || groupData.members[0];
    
    // Map members
    const members = groupData.members.map(member => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      rollNumber: member.user.rollNumber,
      department: member.user.department,
      gpa: member.user.gpa,
      profileImage: member.user.profileImage,
      role: member.role,
      isLeader: leader ? member.id === leader.id : false
    }));

    // Get supervisor from the project if exists
    const project = groupData.projects[0]; // Assuming one project per group
    let supervisor = project?.supervisor || null;

    // If no supervisor in project, check for approved supervisor requests from any group member
    if (!supervisor) {
      const approvedRequest = await prisma.supervisorRequest.findFirst({
        where: {
          studentId: {
            in: members.map(m => m.id)
          },
          status: 'ACCEPTED'
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              profileImage: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      if (approvedRequest?.teacher) {
        supervisor = approvedRequest.teacher;
      }
    }

    return NextResponse.json({
      hasGroup: true,
      group: {
        id: groupData.id,
        name: groupData.name,
        description: groupData.description,
        maxMembers: groupData.maxMembers,
        memberCount: members.length,
        members: members,
        supervisor: supervisor,
        isLeader: leader ? leader.userId === userId : false,
        isApproved: groupData.isApproved || false,
        approvedBy: groupData.approvedBy,
        approvedAt: groupData.approvedAt,
        createdAt: groupData.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching group info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group information' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { groupName } = body;

    if (!groupName || groupName.trim().length === 0) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    // Find the user's group
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId: userId,
        group: {
          isActive: true
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is the leader
    if (membership.role !== 'LEADER') {
      return NextResponse.json({ error: 'Only the group leader can change the group name' }, { status: 403 });
    }

    // Update the group name
    const updatedGroup = await prisma.group.update({
      where: {
        id: membership.groupId
      },
      data: {
        name: groupName.trim()
      }
    });

    return NextResponse.json({
      success: true,
      group: {
        id: updatedGroup.id,
        name: updatedGroup.name
      }
    });
  } catch (error) {
    console.error('Error updating group name:', error);
    return NextResponse.json(
      { error: 'Failed to update group name' },
      { status: 500 }
    );
  }
}
