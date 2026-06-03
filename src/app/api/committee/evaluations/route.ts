import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - List evaluations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const announcementId = searchParams.get('announcementId')
    const type = searchParams.get('type')
    const groupId = searchParams.get('groupId')

    const where: any = {}
    if (announcementId) where.announcementId = announcementId
    if (type) where.evaluationType = type
    if (groupId) where.groupId = groupId

    const evaluations = await prisma.evaluation.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        announcement: {
          select: {
            title: true,
            type: true
          }
        }
      }
    })

    // Fetch group details
    const evaluationsWithDetails = await Promise.all(
      evaluations.map(async (evaluation) => {
        const group = await prisma.group.findUnique({
          where: { id: evaluation.groupId },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        })

        return {
          ...evaluation,
          group
        }
      })
    )

    return NextResponse.json(evaluationsWithDetails)
  } catch (error) {
    console.error('Error fetching evaluations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch evaluations' },
      { status: 500 }
    )
  }
}

// POST - Create evaluation
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      announcementId,
      groupId,
      evaluationType,
      defenseDate,
      defenseLocation,
      score,
      finalMarks,
      feedback,
      isPassed,
      needsReEvaluation,
      juryMembers,
      reportUrl,
      codeUrl,
      presentationUrl
    } = body

    if (!announcementId || !groupId || !evaluationType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Count existing attempts
    const existingAttempts = await prisma.evaluation.count({
      where: {
        announcementId,
        groupId,
        evaluationType
      }
    })

    if (existingAttempts >= 3) {
      return NextResponse.json(
        { error: 'Maximum 3 attempts exceeded' },
        { status: 400 }
      )
    }

    const evaluation = await prisma.evaluation.create({
      data: {
        announcementId,
        groupId,
        evaluationType,
        defenseDate: defenseDate ? new Date(defenseDate) : null,
        defenseLocation,
        score: score ? parseFloat(score) : null,
        finalMarks: finalMarks ? parseFloat(finalMarks) : null,
        feedback,
        isPassed: isPassed || false,
        needsReEvaluation: needsReEvaluation || false,
        juryMembers,
        reportUrl,
        codeUrl,
        presentationUrl,
        attemptNumber: existingAttempts + 1,
        status: isPassed && !needsReEvaluation ? 'COMPLETED' : 
                needsReEvaluation ? 'RE_EVALUATION_REQUIRED' : 
                !isPassed ? 'FAILED' : 'IN_PROGRESS'
      }
    })

    // Notify group members
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: true
      }
    })

    if (group) {
      for (const member of group.members) {
        await prisma.notification.create({
          data: {
            userId: member.userId,
            title: `${evaluationType} Evaluation Result`,
            message: isPassed && !needsReEvaluation
              ? `Congratulations! Your group "${group.name}" has passed ${evaluationType}.`
              : needsReEvaluation
              ? `Your group "${group.name}" requires re-evaluation for ${evaluationType}.`
              : `Your group "${group.name}" did not pass ${evaluationType}. Please review feedback.`,
            type: 'EVALUATION_RESULT'
          }
        })
      }
    }

    return NextResponse.json(evaluation, { status: 201 })
  } catch (error) {
    console.error('Error creating evaluation:', error)
    return NextResponse.json(
      { error: 'Failed to create evaluation' },
      { status: 500 }
    )
  }
}
