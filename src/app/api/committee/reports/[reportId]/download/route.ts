import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  generateCommitteeReportPdf,
  generateGenericReportPdf,
  createMinimalPdf,
} from '@/lib/reportPdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function pdfResponse(buffer: Buffer, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    const groupId = request.nextUrl.searchParams.get('groupId');

    // Ad-hoc generated reports carry a "report-" id and an optional groupId.
    if (reportId.startsWith('report-')) {
      if (groupId) {
        try {
          const projectData = await fetchCompleteProjectData(groupId);
          const pdfBuffer = await generateCommitteeReportPdf(projectData);
          return pdfResponse(
            pdfBuffer,
            `project-report-${groupId}-${Date.now()}.pdf`,
          );
        } catch (error) {
          console.error(
            '[Committee Report] Group report failed, falling back to generic PDF:',
            error,
          );
        }
      }

      const genericPdf = await generateGenericReportPdf(
        'Committee Report',
        new Date().toISOString(),
      );
      return pdfResponse(genericPdf, `committee-report-${Date.now()}.pdf`);
    }

    // For defense schedule reports
    const defenseSchedule = await db.defenseSchedule.findUnique({
      where: { id: reportId },
      include: {
        juryAssignments: {
          include: {
            defenseSchedule: true,
          },
        },
      },
    });

    if (!defenseSchedule) {
      // Still return a valid PDF so the mobile app can open something.
      const genericPdf = await generateGenericReportPdf(
        'Committee Report',
        new Date().toISOString(),
      );
      return pdfResponse(genericPdf, `committee-report-${Date.now()}.pdf`);
    }

    const targetGroupId =
      groupId || defenseSchedule.juryAssignments[0]?.groupId || null;

    if (!targetGroupId) {
      const genericPdf = await generateGenericReportPdf(
        `${defenseSchedule.defenseType || 'Defense'} Report`,
        new Date().toISOString(),
      );
      return pdfResponse(genericPdf, `defense-report-${reportId}-${Date.now()}.pdf`);
    }

    try {
      const projectData = await fetchCompleteProjectData(targetGroupId);
      const pdfBuffer = await generateCommitteeReportPdf(projectData);
      return pdfResponse(pdfBuffer, `defense-report-${reportId}-${Date.now()}.pdf`);
    } catch (error) {
      console.error(
        '[Committee Report] Defense report failed, falling back to generic PDF:',
        error,
      );
      const genericPdf = await generateGenericReportPdf(
        `${defenseSchedule.defenseType || 'Defense'} Report`,
        new Date().toISOString(),
      );
      return pdfResponse(genericPdf, `defense-report-${reportId}-${Date.now()}.pdf`);
    }
  } catch (error) {
    console.error('Error downloading report:', error);
    try {
      const fallback = await generateGenericReportPdf(
        'Committee Report',
        new Date().toISOString(),
      );
      return pdfResponse(fallback, `committee-report-${Date.now()}.pdf`);
    } catch (fallbackError) {
      console.error('Fallback PDF generation also failed:', fallbackError);
      const minimal = createMinimalPdf(
        'Committee Report',
        new Date().toLocaleString(),
      );
      return pdfResponse(minimal, `committee-report-${Date.now()}.pdf`);
    }
  }
}

async function fetchCompleteProjectData(groupId: string) {
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: true,
        },
      },
      projects: {
        include: {
          supervisor: true,
          submissions: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      },
    },
  });

  if (!group) {
    throw new Error('Group not found');
  }

  const submissions = await db.projectSubmission.findMany({
    where: {
      project: {
        groupId: groupId,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const evaluations = await db.evaluation.findMany({
    where: { groupId },
    include: {
      announcement: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const juryAssignments = await db.juryAssignment.findMany({
    where: { groupId },
    include: {
      defenseSchedule: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  let notifications: Array<{
    createdAt: Date;
    type: string;
    title: string;
    message: string;
  }> = [];
  try {
    const projectIds = group.projects.map((p) => p.id);
    notifications = await db.notification.findMany({
      where: {
        OR: [
          ...(projectIds.length ? [{ relatedId: { in: projectIds } }] : []),
          { message: { contains: group.name } },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  } catch (error) {
    console.warn('[Committee Report] Skipping notifications section:', error);
  }

  return {
    group,
    submissions,
    evaluations,
    juryAssignments,
    notifications,
    generatedAt: new Date().toISOString(),
  };
}
