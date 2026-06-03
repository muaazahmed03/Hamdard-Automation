import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      );
    }

    // Get all groups where this teacher is the supervisor (via project link OR accepted supervisor request)
    // First, find all students who have accepted supervisor requests from this teacher
    const acceptedSupervisorRequests = await prisma.supervisorRequest.findMany({
      where: {
        teacherId: teacherId,
        status: 'ACCEPTED'
      },
      include: {
        student: {
          select: { id: true }
        }
      }
    });
    
    const supervisedStudentIds = acceptedSupervisorRequests.map(req => req.student.id);
    
    // Get groups where this teacher is the supervisor (via project link)
    const supervisedGroups = await prisma.group.findMany({
      where: {
        OR: [
          {
            projects: {
              some: {
                supervisorId: teacherId,
              },
            },
          },
          {
            // Also include groups where any member has an accepted supervisor request from this teacher
            members: {
              some: {
                userId: { in: supervisedStudentIds }
              }
            }
          }
        ]
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        projects: {
          where: {
            supervisorId: teacherId,
          },
        },
      },
    });

    if (supervisedGroups.length === 0 && supervisedStudentIds.length === 0) {
      console.warn(`No supervised groups or students found for teacher ${teacherId}`);
      return NextResponse.json({ 
        files: [], 
        groups: [], 
        debug: {
          message: 'No supervised groups or students found',
          teacherId,
          supervisedGroupsCount: 0,
          supervisedStudentIdsCount: 0
        }
      });
    }

    console.log(`Teacher ${teacherId} supervises ${supervisedGroups.length} groups and ${supervisedStudentIds.length} students with accepted requests`);

    // Get all student IDs from supervised groups AND from accepted supervisor requests
    const studentIdsFromGroups = supervisedGroups.flatMap(g => g.members.map(m => m.userId));
    const allStudentIds = [...new Set([...studentIdsFromGroups, ...supervisedStudentIds])];

    // Get all project IDs from supervised groups
    const projectIds = supervisedGroups.flatMap(g => g.projects.map(p => p.id));

    const allFiles: any[] = [];

    // Fetch all files from project submissions that the teacher should see
    // For proposals, show ALL proposals from supervised groups (including PENDING ones)
    // For other files, show all files from supervised groups
    const projectSubmissions = await prisma.projectSubmission.findMany({
      where: {
        OR: [
          // Directly supervised projects
          { project: { supervisorId: teacherId } },
          // Students in supervised groups OR with accepted supervisor requests
          { 
            studentId: { in: allStudentIds },
            // For proposals without projectId, they should still show to supervisor
            // if the student has an accepted supervisor request
          },
          // Projects in supervised groups
          { projectId: { in: projectIds } },
        ],
        // Show proposals regardless of supervisorApprovalStatus (PENDING, APPROVED, REJECTED)
        // Teachers need to see all proposals to review them
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            groupId: true,
            group: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${projectSubmissions.length} submissions for teacher ${teacherId}`);
    console.log(`Supervised student IDs:`, allStudentIds);
    console.log(`Supervised project IDs:`, projectIds);
    if (projectSubmissions.length === 0) {
      console.warn(`No project submissions found for teacher ${teacherId}. Student IDs:`, allStudentIds, 'Project IDs:', projectIds);
    }

    // Add database files (only from supervised students)
    // Use for...of loop to handle async operations properly
    for (const submission of projectSubmissions) {
      // Find the group this student belongs to
      const studentGroup = supervisedGroups.find(group =>
        group.members.some(member => member.userId === submission.studentId)
      );

      // Check if student has an accepted supervisor request (even if not in a supervised group yet)
      const hasAcceptedRequest = supervisedStudentIds.includes(submission.studentId);

      // Add if student is in a supervised group OR has an accepted supervisor request
      if (studentGroup || hasAcceptedRequest) {
        // If student is in a group, use that group info
        // Otherwise, try to find the student's group
        let groupName = studentGroup?.name || 'No Group';
        let groupId = studentGroup?.id || null;

        // If no group found but student has accepted request, try to find their group
        if (!studentGroup && hasAcceptedRequest) {
          const studentGroupMember = await prisma.groupMember.findFirst({
            where: { userId: submission.studentId },
            include: {
              group: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          });
          if (studentGroupMember?.group) {
            groupName = studentGroupMember.group.name;
            groupId = studentGroupMember.group.id;
          }
        }

        allFiles.push({
          id: submission.id,
          name: submission.fileName,
          originalName: submission.fileName,
          fileType: submission.fileType,
          fileUrl: submission.fileUrl,
          fileSize: submission.fileSize || 0,
          uploadedAt: submission.createdAt,
          status: submission.status,
          supervisorApprovalStatus: submission.supervisorApprovalStatus || 'PENDING',
          description: submission.description,
          student: {
            id: submission.student.id,
            name: submission.student.name,
            email: submission.student.email,
          },
          project: submission.project ? {
            id: submission.project.id,
            title: submission.project.title,
          } : null,
          groupName: groupName,
          groupId: groupId,
        });
      }
    }

    console.log(`Returning ${allFiles.length} files for supervised students`);
    console.log(`Files breakdown:`, {
      totalFiles: allFiles.length,
      byType: allFiles.reduce((acc, f) => {
        acc[f.fileType] = (acc[f.fileType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });

    // Return files and group information
    return NextResponse.json({ 
      files: allFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
      groups: supervisedGroups.map(group => ({
        id: group.id,
        name: group.name,
        projectTitle: group.projects?.[0]?.title || 'No Project',
        members: group.members.map(m => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
        })),
      })),
      debug: {
        supervisedGroupsCount: supervisedGroups.length,
        supervisedStudentIdsCount: supervisedStudentIds.length,
        allStudentIdsCount: allStudentIds.length,
        projectIdsCount: projectIds.length,
        projectSubmissionsCount: projectSubmissions.length,
        filesReturned: allFiles.length
      }
    });

  } catch (error) {
    console.error('Error fetching teacher files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}