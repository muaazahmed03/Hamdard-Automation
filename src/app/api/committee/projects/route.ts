import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { matchesReviewStatus, parseReviewStatusFilter } from '@/lib/submission-review';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reviewStatus = parseReviewStatusFilter(searchParams.get('reviewStatus'));

    const proposals = await db.projectSubmission.findMany({
      where: {
        fileType: 'PROPOSAL',
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

    const visible = proposals.filter((proposal) =>
      matchesReviewStatus(proposal.status, reviewStatus),
    );

    const projectsWithProposals = visible.map((proposal) => ({
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
