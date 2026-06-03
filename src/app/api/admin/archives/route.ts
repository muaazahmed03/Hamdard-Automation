import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const prisma = new PrismaClient()
const META_PATH = join(process.cwd(), 'data', 'file-metadata.json')

export async function GET() {
  try {
    // Fetch all groups with their members and projects
    const groups = await prisma.group.findMany({
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
        },
        projects: {
          include: {
            supervisor: {
              select: {
                name: true
              }
            },
            submissions: {
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        }
      }
    })

    // Load file metadata
    let fileMetadata: Record<string, any> = {}
    if (existsSync(META_PATH)) {
      try {
        const raw = await readFile(META_PATH, 'utf-8')
        fileMetadata = JSON.parse(raw || '{}')
      } catch (e) {
        console.warn('Failed to read file metadata:', e)
      }
    }

    // Transform groups into archive format
    const archives = groups.map((group) => {
      const studentNames = group.members
        .map(m => m.user?.name || 'Unknown')
        .join(', ')

      const memberEmails = group.members
        .map(m => m.user?.email || '')
        .filter(Boolean)

      // Get department from first member
      const department = group.members[0]?.user?.department || 'N/A'

      // Get primary project (first one or most recent)
      const project = group.projects[0]

      // Get supervisor name
      const supervisorName = project?.supervisor?.name || 'Not Assigned'

      // Collect files
      const files: any[] = []

      // Add project submissions
      if (project?.submissions) {
        project.submissions.forEach(submission => {
          if (submission.fileUrl) {
            files.push({
              name: submission.fileName || submission.title || 'Document',
              type: submission.fileType || 'Document',
              size: submission.fileSize 
                ? `${(submission.fileSize / 1024).toFixed(1)} KB` 
                : 'Unknown',
              url: submission.fileUrl,
              uploadDate: new Date(submission.createdAt).toLocaleDateString()
            })
          }
        })
      }

      // Add files from metadata that belong to this group's members
      for (const [timestamp, meta] of Object.entries(fileMetadata)) {
        if (memberEmails.includes(meta.studentEmail)) {
          files.push({
            name: meta.originalName || `File_${timestamp}`,
            type: getFileType(meta.fileType || meta.originalName),
            size: meta.fileSize || 'Unknown',
            url: `/uploads/${timestamp}_${meta.originalName || 'file'}`,
            uploadDate: meta.uploadDate || new Date(parseInt(timestamp)).toLocaleDateString()
          })
        }
      }

      // Determine session from creation date
      const createdYear = new Date(group.createdAt).getFullYear()
      const session = `${createdYear}-${(createdYear + 1).toString().slice(-2)}`

      // Determine status
      let status = 'In Progress'
      if (project?.status === 'APPROVED' || project?.status === 'COMPLETED') {
        status = 'Completed'
      } else if (project?.status === 'REJECTED') {
        status = 'Rejected'
      } else if (!group.isActive) {
        status = 'Archived'
      }

      return {
        id: group.id,
        projectTitle: project?.title || group.name || 'Untitled Project',
        groupName: group.name,
        studentNames,
        department,
        session,
        faculty: mapDepartmentToFaculty(department),
        supervisor: supervisorName,
        submissionDate: project?.updatedAt 
          ? new Date(project.updatedAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })
          : group.updatedAt 
            ? new Date(group.updatedAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })
            : 'N/A',
        status,
        files,
        createdAt: group.createdAt
      }
    })

    // Sort by most recent first
    archives.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json(archives)
  } catch (error) {
    console.error('Error fetching archives:', error)
    return NextResponse.json(
      { error: 'Failed to fetch archives', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

function getFileType(fileTypeOrName: string): string {
  if (!fileTypeOrName) return 'Document'
  
  const lower = fileTypeOrName.toLowerCase()
  if (lower.includes('pdf') || lower.includes('report') || lower.includes('proposal')) return 'Report'
  if (lower.includes('zip') || lower.includes('code') || lower.includes('source')) return 'Code'
  if (lower.includes('ppt') || lower.includes('presentation')) return 'Presentation'
  if (lower.includes('mp4') || lower.includes('video') || lower.includes('demo')) return 'Video'
  if (lower.includes('doc') || lower.includes('docx')) return 'Document'
  
  return 'Document'
}

function mapDepartmentToFaculty(department: string): string {
  if (!department) return 'N/A'
  
  const lower = department.toLowerCase()
  if (lower.includes('computer') || lower.includes('software') || lower.includes('engineering')) {
    return 'Engineering & Technology'
  }
  if (lower.includes('science') || lower.includes('physics') || lower.includes('chemistry') || lower.includes('biology')) {
    return 'Sciences'
  }
  if (lower.includes('business') || lower.includes('management') || lower.includes('commerce')) {
    return 'Business'
  }
  
  return 'Engineering & Technology'
}

