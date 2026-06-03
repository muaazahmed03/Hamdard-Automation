import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all generated reports
export async function GET(request: NextRequest) {
  try {
    // In a real system, you'd have a Report model
    // For now, we'll return reports based on existing data
    const reports = await db.defenseSchedule.findMany({
      where: {
        status: 'COMPLETED'
      },
      include: {
        juryAssignments: {
          include: {
            defenseSchedule: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    // Transform to report format
    const formattedReports = reports.map((schedule, index) => ({
      id: schedule.id,
      title: `${schedule.defenseType} Defense Report - ${new Date(schedule.defenseDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      type: schedule.defenseType,
      generatedDate: schedule.createdAt.toISOString(),
      status: 'COMPLETED',
      defenseScheduleId: schedule.id
    }));

    return NextResponse.json(formattedReports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

// POST - Generate a new report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, dateRange, department, groupId } = body;

    // Generate report data based on type
    const reportData = await generateReportData(type, dateRange, department, groupId);

    // Create report record (in a real system, you'd save this to a Report model)
    const report = {
      id: `report-${Date.now()}`,
      title: `${type.replace('_', ' ')} Report - ${new Date().toLocaleDateString()}`,
      type,
      generatedDate: new Date().toISOString(),
      status: 'COMPLETED',
      groupId: groupId || null,
      data: reportData
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function generateReportData(type: string, dateRange: string, department: string, groupId?: string) {
  const now = new Date();
  let startDate = new Date();
  
  switch (dateRange) {
    case 'LAST_WEEK':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'LAST_MONTH':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'LAST_QUARTER':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'LAST_YEAR':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate = new Date(0); // All time
  }

  if (type === 'PROJECT_SUMMARY' || type === 'GROUP_REPORT') {
    // Fetch project data for the group
    const where: any = {
      createdAt: { gte: startDate }
    };

    if (groupId) {
      where.groupId = groupId;
    }

    const projects = await db.project.findMany({
      where,
      include: {
        group: {
          include: {
            members: {
              include: {
                user: true
              }
            }
          }
        },
        supervisor: true,
        submissions: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    // Fetch evaluations
    const evaluations = await db.evaluation.findMany({
      where: groupId ? { groupId } : {},
      include: {
        announcement: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Fetch defense schedules and jury assignments
    const defenseSchedules = await db.defenseSchedule.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      include: {
        juryAssignments: {
          where: groupId ? { groupId } : {}
        }
      }
    });

    // Fetch jury assignments with evaluation details
    const juryAssignments = await db.juryAssignment.findMany({
      where: groupId ? { groupId } : {},
      include: {
        defenseSchedule: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      projects,
      evaluations,
      defenseSchedules,
      juryAssignments,
      generatedAt: new Date().toISOString()
    };
  }

  // For other report types, return general data
  return {
    generatedAt: new Date().toISOString()
  };
}

