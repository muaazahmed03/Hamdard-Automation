import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get all projects with approved proposals for Super Admin review
export async function GET(request: NextRequest) {
  try {
    // Fetch all project submissions that are proposals and have been approved by Committee Head or Super Admin
    const approvedProposals = await db.projectSubmission.findMany({
      where: {
        fileType: 'PROPOSAL',
        status: {
          in: ['COMMITTEE_APPROVED', 'ADMIN_APPROVED']
        }
      },
      include: {
        project: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
              },
            },
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
                      },
                    },
                  },
                },
              },
            },
            supervisor: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            department: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Transform the data to show proposal details with project information
    const projectsWithProposals = approvedProposals.map((proposal) => ({
      id: proposal.id, // Use proposal ID as the main ID
      proposalId: proposal.id,
      proposalTitle: proposal.title, // The title from the proposal submission
      proposalDescription: proposal.description,
      projectId: proposal.projectId,
      projectTitle: proposal.project?.title || proposal.title, // Fallback to proposal title if no project
      projectStatus: proposal.project?.status || 'PROPOSED',
      projectDescription: proposal.project?.description || proposal.description,
      status: proposal.status, // COMMITTEE_APPROVED or ADMIN_APPROVED
      fileUrl: proposal.fileUrl,
      fileName: proposal.fileName,
      submittedDate: proposal.createdAt,
      approvedDate: proposal.updatedAt,
      supervisorRemarks: proposal.supervisorRemarks,
      adminRemarks: proposal.adminRemarks,
      committeeRemarks: proposal.committeeRemarks,
      // Teacher information
      teacher: proposal.project?.teacher || null,
      // Group information
      group: proposal.project?.group ? {
        id: proposal.project.group.id,
        name: proposal.project.group.name,
        members: proposal.project.group.members.map((member: any) => ({
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          rollNumber: member.user.rollNumber,
          department: member.user.department,
        })),
      } : null,
      // Supervisor information
      supervisor: proposal.project?.supervisor || null,
      // Student who submitted
      submittedBy: {
        id: proposal.student.id,
        name: proposal.student.name,
        email: proposal.student.email,
        rollNumber: proposal.student.rollNumber,
        department: proposal.student.department,
      },
    }));

    return NextResponse.json(projectsWithProposals);
  } catch (error) {
    console.error('Error fetching approved projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approved projects' },
      { status: 500 }
    );
  }
}

