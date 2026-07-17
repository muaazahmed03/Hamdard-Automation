import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  generateCommitteeReportPdf,
  generateGenericReportPdf,
} from '@/lib/reportPdf';

export const runtime = 'nodejs';

function pdfResponse(buffer: Buffer, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Content-Length': String(buffer.length),
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;

    // Ad-hoc generated reports carry a "report-" id and an optional groupId.
    if (reportId.startsWith('report-')) {
      const groupId = request.nextUrl.searchParams.get('groupId');

      // Reports without a target group (e.g. performance/analysis) still
      // produce a valid PDF instead of failing the download.
      if (!groupId) {
        const genericPdf = await generateGenericReportPdf(
          'Committee Report',
          new Date().toISOString(),
        );
        return pdfResponse(genericPdf, `committee-report-${Date.now()}.pdf`);
      }

      const projectData = await fetchCompleteProjectData(groupId);
      const pdfBuffer = await generateCommitteeReportPdf(projectData);
      return pdfResponse(pdfBuffer, `project-report-${groupId}-${Date.now()}.pdf`);
    }

    // For defense schedule reports
    const defenseSchedule = await db.defenseSchedule.findUnique({
      where: { id: reportId },
      include: {
        juryAssignments: {
          include: {
            defenseSchedule: true
          }
        }
      }
    });

    if (!defenseSchedule) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Get group ID from first assignment
    const firstAssignment = defenseSchedule.juryAssignments[0];
    if (!firstAssignment) {
      return NextResponse.json(
        { error: 'No assignments found for this report' },
        { status: 404 }
      );
    }

    const projectData = await fetchCompleteProjectData(firstAssignment.groupId);
    const pdfBuffer = await generateCommitteeReportPdf(projectData);
    return pdfResponse(pdfBuffer, `defense-report-${reportId}-${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error downloading report:', error);
    return NextResponse.json(
      { error: 'Failed to download report' },
      { status: 500 }
    );
  }
}

async function fetchCompleteProjectData(groupId: string) {
  // Fetch group with members
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: true
        }
      },
      projects: {
        include: {
          supervisor: true,
          submissions: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      }
    }
  });

  if (!group) {
    throw new Error('Group not found');
  }

  // Fetch all project submissions
  const submissions = await db.projectSubmission.findMany({
    where: {
      project: {
        groupId: groupId
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Fetch evaluations
  const evaluations = await db.evaluation.findMany({
    where: { groupId },
    include: {
      announcement: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Fetch defense schedules for this group
  const juryAssignments = await db.juryAssignment.findMany({
    where: { groupId },
    include: {
      defenseSchedule: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Fetch notifications related to this group (as chat logs/meeting history)
  const notifications = await db.notification.findMany({
    where: {
      OR: [
        { relatedId: { in: group.projects.map(p => p.id) } },
        { message: { contains: group.name } }
      ]
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 100
  });

  return {
    group,
    submissions,
    evaluations,
    juryAssignments,
    notifications,
    generatedAt: new Date().toISOString()
  };
}
