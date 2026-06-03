import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs/promises'

const prisma = new PrismaClient()

// POST - Archive project after FYP-II completion
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get evaluation details
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: params.id },
      include: {
        announcement: true
      }
    })

    if (!evaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      )
    }

    // Get group details with all members
    const group = await prisma.group.findUnique({
      where: { id: evaluation.groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true
              }
            }
          }
        },
        projects: true
      }
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Get all project submissions
    const projectIds = group.projects.map(p => p.id)
    const submissions = await prisma.projectSubmission.findMany({
      where: {
        projectId: { in: projectIds }
      },
      include: {
        student: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Get all messages/chat logs for group members
    const memberIds = group.members.map(m => m.userId)
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: { in: memberIds }
          }
        }
      },
      include: {
        messages: {
          include: {
            sender: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        participants: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    // Get all meetings
    const meetings = await prisma.meeting.findMany({
      where: {
        attendees: {
          some: {
            userId: { in: memberIds }
          }
        }
      },
      include: {
        organizer: {
          select: {
            name: true,
            email: true
          }
        },
        attendees: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    // Get all evaluations for this group
    const allEvaluations = await prisma.evaluation.findMany({
      where: {
        groupId: group.id
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Get student profile info
    const studentProfiles = await prisma.studentProfile.findMany({
      where: {
        userId: { in: memberIds }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            department: true
          }
        }
      }
    })

    // Determine faculty and session from student profiles
    const faculty = studentProfiles[0]?.faculty || 'Unknown'
    const session = studentProfiles[0]?.session || new Date().getFullYear().toString()

    // Create archive path
    const archivePath = `/FYPAS/Archive/${faculty}/${session}/${group.id}`

    // Create archive object
    const archiveData = {
      metadata: {
        groupId: group.id,
        groupName: group.name,
        faculty,
        session,
        archiveDate: new Date().toISOString(),
        archivedBy: userId
      },
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        createdAt: group.createdAt,
        members: group.members.map(m => ({
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
          department: m.user.department,
          role: m.role,
          joinedAt: m.joinedAt
        }))
      },
      projects: group.projects,
      submissions: submissions.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        fileUrl: s.fileUrl,
        fileName: s.fileName,
        fileType: s.fileType,
        status: s.status,
        student: s.student,
        createdAt: s.createdAt
      })),
      evaluations: allEvaluations.map(e => ({
        id: e.id,
        type: e.evaluationType,
        defenseDate: e.defenseDate,
        defenseLocation: e.defenseLocation,
        score: e.score,
        finalMarks: e.finalMarks,
        feedback: e.feedback,
        isPassed: e.isPassed,
        needsReEvaluation: e.needsReEvaluation,
        attemptNumber: e.attemptNumber,
        juryMembers: e.juryMembers,
        status: e.status,
        reportUrl: e.reportUrl,
        codeUrl: e.codeUrl,
        presentationUrl: e.presentationUrl,
        createdAt: e.createdAt
      })),
      chatLogs: conversations.map(c => ({
        id: c.id,
        isGroup: c.isGroup,
        groupName: c.groupName,
        participants: c.participants.map(p => ({
          name: p.user.name,
          email: p.user.email
        })),
        messages: c.messages.map(m => ({
          content: m.content,
          sender: m.sender.name,
          createdAt: m.createdAt,
          fileUrl: m.fileUrl,
          fileName: m.fileName
        }))
      })),
      meetings: meetings.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        startTime: m.startTime,
        endTime: m.endTime,
        location: m.location,
        isOnline: m.isOnline,
        meetingLink: m.meetingLink,
        status: m.status,
        organizer: m.organizer,
        attendees: m.attendees.map(a => ({
          name: a.user.name,
          email: a.user.email,
          status: a.status
        }))
      })),
      studentProfiles: studentProfiles.map(p => ({
        name: p.user.name,
        email: p.user.email,
        department: p.user.department,
        semester: p.semester,
        batch: p.batch,
        cgpa: p.cgpa,
        faculty: p.faculty,
        session: p.session
      })),
      finalResult: {
        finalMarks: evaluation.finalMarks,
        feedback: evaluation.feedback,
        isPassed: evaluation.isPassed,
        evaluationDate: evaluation.createdAt
      }
    }

    // In production, you would save this to actual file system
    // For now, we'll update the evaluation record with the archive path
    const updatedEvaluation = await prisma.evaluation.update({
      where: { id: params.id },
      data: {
        archivePath,
        status: 'COMPLETED'
      }
    })

    // Log the archive data (in production, write to file)
    console.log('Archive created:', archivePath)
    console.log('Archive data size:', JSON.stringify(archiveData).length, 'bytes')

    // In a real implementation, you would:
    // 1. Create the directory structure
    // 2. Save archive.json with all the data
    // 3. Copy all referenced files (documents, reports, code) to the archive location
    // 4. Generate a PDF summary report
    // 5. Create a compressed archive (.zip) for download

    return NextResponse.json({
      success: true,
      archivePath,
      archiveSize: JSON.stringify(archiveData).length,
      message: 'Project archived successfully'
    })
  } catch (error) {
    console.error('Error archiving project:', error)
    return NextResponse.json(
      { error: 'Failed to archive project' },
      { status: 500 }
    )
  }
}
