import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - List proof submissions for an announcement
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const announcementId = searchParams.get('announcementId')

    if (!announcementId) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
      )
    }

    const submissions = await prisma.proofSubmission.findMany({
      where: {
        announcementId
      },
      include: {
        announcement: {
          select: {
            title: true,
            type: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Fetch student and group details
    const submissionsWithDetails = await Promise.all(
      submissions.map(async (submission) => {
        const student = await prisma.user.findUnique({
          where: { id: submission.studentId },
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        })

        let group = null
        if (submission.groupId) {
          group = await prisma.group.findUnique({
            where: { id: submission.groupId },
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
        }

        return {
          ...submission,
          student,
          group
        }
      })
    )

    return NextResponse.json(submissionsWithDetails)
  } catch (error) {
    console.error('Error fetching proof submissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch proof submissions' },
      { status: 500 }
    )
  }
}

// POST - Create proof submission (for students)
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
      proofFileUrl,
      proofFileName,
      proofFileSize,
      transcriptUrl,
      cgpa,
      remarks
    } = body

    if (!announcementId || !proofFileUrl || !proofFileName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const submission = await prisma.proofSubmission.create({
      data: {
        announcementId,
        studentId: userId,
        groupId,
        proofFileUrl,
        proofFileName,
        proofFileSize: proofFileSize || 0,
        transcriptUrl,
        cgpa: cgpa ? parseFloat(cgpa) : null,
        remarks,
        status: 'PENDING'
      }
    })

    return NextResponse.json(submission, { status: 201 })
  } catch (error) {
    console.error('Error creating proof submission:', error)
    return NextResponse.json(
      { error: 'Failed to create proof submission' },
      { status: 500 }
    )
  }
}
