import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Calculate Project Completion Rate (last 30 days)
    const totalProjects = await db.project.count({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      }
    });

    const completedProjects = await db.project.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: 'COMPLETED'
      }
    });

    const completionRate = totalProjects > 0 
      ? Math.round((completedProjects / totalProjects) * 100) 
      : 0;

    // Calculate Average Review Score
    const evaluations = await db.evaluation.findMany({
      where: {
        score: { not: null }
      },
      select: {
        score: true
      }
    });

    const averageScore = evaluations.length > 0
      ? evaluations.reduce((sum, e) => sum + (e.score || 0), 0) / evaluations.length
      : 0;

    // Calculate Committee Efficiency (based on defense schedules and jury assignments)
    const totalDefenses = await db.defenseSchedule.count({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      }
    });

    const completedDefenses = await db.defenseSchedule.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: 'COMPLETED'
      }
    });

    const efficiency = totalDefenses > 0
      ? Math.round((completedDefenses / totalDefenses) * 100)
      : 0;

    return NextResponse.json({
      projectCompletionRate: completionRate,
      averageReviewScore: Math.round(averageScore * 10) / 10,
      committeeEfficiency: efficiency
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

