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
      },
      include: {
        group: {
          include: {
            members: {
              where: {
                userId: {
                  not: userId // Exclude current user
                }
              },
              include: {
                user: {
                  include: {
                    studentProfile: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!membership || !membership.group) {
      return NextResponse.json([]);
    }

    // Map group members to user data
    const groupMembers = membership.group.members.map(member => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.user.role,
      profileImage: member.user.profileImage,
      rollNumber: member.user.rollNumber,
      department: member.user.department,
      gpa: member.user.gpa,
      skills: member.user.studentProfile?.skills,
      interests: member.user.studentProfile?.interests
    }));

    return NextResponse.json(groupMembers);
  } catch (error) {
    console.error('Error fetching group members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group members' },
      { status: 500 }
    );
  }
}
