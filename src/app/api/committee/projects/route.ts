import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const proposals = await db.projectSubmission.findMany({
      where: {
        fileType: 'PROPOSAL',
        OR: [
          {
            supervisorApprovalStatus: 'APPROVED',
            status: { notIn: ['ADMIN_APPROVED', 'ADMIN_REJECTED'] },
          },
          {
            status: {
              in: ['COMMITTEE_APPROVED', 'COMMITTEE_REJECTED', 'ADMIN_APPROVED', 'APPROVED'],
            },
          },
        ],
      },
      include: {
        project: {
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

    const projectsWithProposals = proposals.map((proposal) => ({
      id: proposal.id,
      proposalId: proposal.id,
      proposalTitle: proposal.title,
      proposalDescription: proposal.description,
      projectId: proposal.projectId,
      projectTitle: proposal.project?.title || proposal.title,
      projectStatus: proposal.project?.status || 'PROPOSED',
      projectDescription: proposal.project?.description || proposal.description,
      status: proposal.status,
      fileUrl: proposal.fileUrl,
      fileName: proposal.fileName,
      submittedDate: proposal.createdAt,
      approvedDate: proposal.updatedAt,
      group: proposal.project?.group
        ? {
            id: proposal.project.group.id,
            name: proposal.project.group.name,
            members: proposal.project.group.members.map((member: any) => ({
              id: member.user.id,
              name: member.user.name,
              email: member.user.email,
              rollNumber: member.user.rollNumber,
              department: member.user.department,
            })),
          }
        : null,
      supervisor: proposal.project?.supervisor || null,
      submittedBy: proposal.student,
    }));

    return NextResponse.json(projectsWithProposals);
  } catch (error) {
    console.error('Error fetching committee projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 },
    );
  }
}
