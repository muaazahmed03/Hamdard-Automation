import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // First, find all groups that have accepted proposal defenses
    const acceptedProposalDefenses = await prisma.juryAssignment.findMany({
      where: {
        defenseSchedule: {
          defenseType: 'PROPOSAL'
        },
        evaluationStatus: 'ACCEPTED' // Only accepted proposal defenses
      },
      select: {
        groupId: true
      }
    })

    const acceptedGroupIds = [...new Set(acceptedProposalDefenses.map(d => d.groupId))]

    if (acceptedGroupIds.length === 0) {
      return NextResponse.json([])
    }

    // Fetch ALL projects for groups with accepted proposals
    // These projects are being tracked (students are working on FYP I after proposal acceptance)
    const projects = await prisma.project.findMany({
      where: {
        isFacultyProposed: false, // Exclude teacher-proposed projects
        groupId: { 
          in: acceptedGroupIds // Only projects from groups with accepted proposals
        }
        // No additional filter - show all projects with accepted proposals
        // They may have weekly reports, FYP I submissions, or just be in progress
      },
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
                    department: true
                  }
                }
              }
            }
          }
        },
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        },
        submissions: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Transform data for frontend
    const transformedProjects = await Promise.all(projects.map(async (project) => {
      const studentNames = project.group?.members.map(m => m.user?.name || 'Unknown').join(', ') || 'N/A'
      const studentEmails = project.group?.members.map(m => m.user?.email || '').filter(Boolean).join(', ') || 'N/A'
      const department = project.group?.members[0]?.user?.department || 'N/A'

      // Get proposals, defenses, and reports from submissions
      const proposals = project.submissions.filter(s => 
        s.fileType === 'PROPOSAL' || s.fileType === 'proposal'
      )
      const fypI = project.submissions.filter(s => 
        s.fileType === 'FYP_I' || s.fileType === 'fyp_i' || s.fileType?.toLowerCase().includes('fyp_i')
      )
      const fypII = project.submissions.filter(s => 
        s.fileType === 'FYP_II' || s.fileType === 'fyp_ii' || s.fileType?.toLowerCase().includes('fyp_ii')
      )
      const weeklyReports = project.submissions.filter(s => 
        s.fileType === 'WEEKLY_REPORT' || 
        s.fileType === 'weekly_report' || 
        s.fileType === 'REPORT' || 
        s.fileType === 'report' ||
        s.fileType?.toLowerCase().includes('weekly') ||
        s.fileType?.toLowerCase().includes('report')
      )

      // Get proposal defense info
      const proposalDefense = await prisma.juryAssignment.findFirst({
        where: {
          groupId: project.groupId,
          defenseSchedule: {
            defenseType: 'PROPOSAL'
          },
          evaluationStatus: 'ACCEPTED'
        },
        include: {
          defenseSchedule: {
            select: {
              defenseDate: true,
              defenseTime: true,
              venue: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })

      // Calculate progress based on submissions and status
      let progress = 0
      if (proposals.length > 0) progress += 20
      if (fypI.length > 0) progress += 25
      if (fypII.length > 0) progress += 25
      if (weeklyReports.length > 0) progress += 10
      if (project.status === 'APPROVED') progress = 100

      // Determine status - if proposal is accepted, project is in FYP I phase
      let status = 'IN_PROGRESS' // Default for projects with accepted proposals
      if (project.status === 'APPROVED' || project.status === 'COMPLETED') {
        status = 'COMPLETED'
      } else if (project.status === 'FYP_II' || fypII.length > 0) {
        status = 'FYP_II'
      } else if (project.status === 'FYP_I' || fypI.length > 0 || weeklyReports.length > 0) {
        status = 'FYP_I'
      } else if (proposalDefense) {
        // Proposal accepted, project is in FYP I phase
        status = 'IN_PROGRESS'
      } else if (proposals.length > 0) {
        status = 'PROPOSED'
      }

      return {
        id: project.id,
        title: project.title,
        description: project.description,
        proposalTitle: project.title, // For frontend compatibility
        projectTitle: project.title,
        studentNames,
        studentEmails,
        groupName: project.group?.name || 'N/A',
        supervisor: project.supervisor?.name || 'Not Assigned',
        department,
        status: project.status || status,
        projectStatus: project.status || status,
        progress,
        submittedDate: proposalDefense?.defenseSchedule?.defenseDate || project.createdAt,
        approvedDate: proposalDefense?.updatedAt || project.createdAt,
        proposals: proposals.map(p => ({
          id: p.id,
          title: p.title,
          fileUrl: p.fileUrl,
          fileName: p.fileName,
          status: p.status,
          uploadedAt: p.createdAt,
          remarks: p.supervisorRemarks
        })),
        fypI: fypI.map(f => ({
          id: f.id,
          title: f.title,
          fileUrl: f.fileUrl,
          fileName: f.fileName,
          status: f.status,
          uploadedAt: f.createdAt,
          remarks: f.supervisorRemarks
        })),
        fypII: fypII.map(f => ({
          id: f.id,
          title: f.title,
          fileUrl: f.fileUrl,
          fileName: f.fileName,
          status: f.status,
          uploadedAt: f.createdAt,
          remarks: f.supervisorRemarks
        })),
        weeklyReports: weeklyReports
          .map(r => ({
            id: r.id,
            title: r.title,
            description: r.description,
            fileUrl: r.fileUrl,
            fileName: r.fileName,
            status: r.status,
            uploadedAt: r.createdAt,
            remarks: r.supervisorRemarks,
            week: r.version || r.title?.match(/week\s*(\d+)/i)?.[1] || r.title?.match(/(\d+)/)?.[1] || 'N/A'
          }))
          .sort((a, b) => {
            // Sort by week number (descending - latest first)
            const weekA = parseInt(a.week) || 0;
            const weekB = parseInt(b.week) || 0;
            return weekB - weekA;
          }),
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        group: project.group ? {
          name: project.group.name,
          members: project.group.members.map(m => ({
            name: m.user?.name,
            user: { name: m.user?.name }
          }))
        } : null
      }
    }))

    return NextResponse.json(transformedProjects)
  } catch (error) {
    console.error('Error fetching student projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
