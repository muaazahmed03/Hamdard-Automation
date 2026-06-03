import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching supervised groups for teacher:', userId);

    // Find projects where this teacher is the supervisor
    const projects = await db.project.findMany({
      where: {
        supervisorId: userId,
      },
      include: {
        group: {
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
                    status: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`Found ${projects.length} supervised projects`);

    // Extract unique groups from projects (a group might have multiple projects)
    const groupsMap = new Map();
    
    projects.forEach(project => {
      if (project.group && !groupsMap.has(project.group.id)) {
        groupsMap.set(project.group.id, {
          ...project.group,
          projects: []
        });
      }
      if (project.group) {
        groupsMap.get(project.group.id).projects.push({
          id: project.id,
          title: project.title,
          description: project.description,
          status: project.status
        });
      }
    });

    const groups = Array.from(groupsMap.values());
    console.log(`Found ${groups.length} unique supervised groups`);

    // Format the response
    const formattedGroups = groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      isApproved: group.isApproved,
      isActive: group.isActive,
      createdAt: group.createdAt,
      projects: group.projects,
      memberCount: group.members?.length || 0,
      members: group.members?.map(member => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        rollNumber: member.user.rollNumber,
        department: member.user.department,
        gpa: member.user.gpa,
        profileImage: member.user.profileImage,
        status: member.user.status,
        role: member.role,
        joinedAt: member.joinedAt
      })) || []
    }));

    console.log('Returning groups:', formattedGroups.map(g => ({ id: g.id, name: g.name, memberCount: g.memberCount, projectCount: g.projects?.length })));

    return NextResponse.json(formattedGroups);
  } catch (error) {
    console.error('Error fetching supervised groups:', error);
    return NextResponse.json(
      { message: 'Failed to fetch supervised groups', error: error.message },
      { status: 500 }
    );
  }
}
