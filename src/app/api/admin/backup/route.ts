import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir, readdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// POST - Create and save backup
export async function POST(request: NextRequest) {
  try {
    // Create backups directory if it doesn't exist
    const backupsDir = join(process.cwd(), 'data', 'backups')
    if (!existsSync(backupsDir)) {
      await mkdir(backupsDir, { recursive: true })
    }

    // Fetch all data from database
    const [users, projects, notifications, groups, groupMembers, groupRequests, 
           supervisorRequests, messages, conversations, meetings] = await Promise.all([
      db.user.findMany({
        include: {
          studentProfile: true,
          teacherProfile: true
        }
      }),
      db.project.findMany({
        include: {
          supervisor: { select: { name: true, email: true } },
          teacher: { select: { name: true, email: true } },
          group: true,
          submissions: {
            include: {
              student: { select: { name: true, email: true } }
            }
          }
        }
      }),
      db.notification.findMany(),
      db.group.findMany(),
      db.groupMember.findMany({
        include: {
          user: { select: { name: true, email: true } },
          group: { select: { name: true } }
        }
      }),
      db.groupRequest.findMany({
        include: {
          fromUser: { select: { name: true, email: true } },
          toUser: { select: { name: true, email: true } }
        }
      }),
      db.supervisorRequest.findMany({
        include: {
          student: { select: { name: true, email: true } },
          teacher: { select: { name: true, email: true } }
        }
      }),
      db.message.findMany({
        include: {
          sender: { select: { name: true, email: true } },
          receiver: { select: { name: true, email: true } }
        }
      }),
      db.conversation.findMany({
        include: {
          participants: {
            include: {
              user: { select: { name: true, email: true } }
            }
          }
        }
      }),
      db.meeting.findMany({
        include: {
          organizer: { select: { name: true, email: true } },
          attendees: {
            include: {
              user: { select: { name: true, email: true } }
            }
          }
        }
      })
    ])

    // Read additional JSON data files
    let committees = []
    let fileMetadata = {}
    let systemSettings = {}
    let loginAttempts = {}

    try {
      const committeesPath = join(process.cwd(), 'data', 'committees.json')
      if (existsSync(committeesPath)) {
        committees = JSON.parse(await require('fs').promises.readFile(committeesPath, 'utf-8'))
      }
    } catch (e) { console.log('No committees data') }

    try {
      const filePath = join(process.cwd(), 'data', 'file-metadata.json')
      if (existsSync(filePath)) {
        fileMetadata = JSON.parse(await require('fs').promises.readFile(filePath, 'utf-8'))
      }
    } catch (e) { console.log('No file metadata') }

    try {
      const settingsPath = join(process.cwd(), 'data', 'system-settings.json')
      if (existsSync(settingsPath)) {
        systemSettings = JSON.parse(await require('fs').promises.readFile(settingsPath, 'utf-8'))
      }
    } catch (e) { console.log('No system settings') }

    try {
      const attemptsPath = join(process.cwd(), 'data', 'login-attempts.json')
      if (existsSync(attemptsPath)) {
        loginAttempts = JSON.parse(await require('fs').promises.readFile(attemptsPath, 'utf-8'))
      }
    } catch (e) { console.log('No login attempts') }

    // Create comprehensive backup object
    const timestamp = new Date().toISOString()
    const backupData = {
      metadata: {
        backupId: `backup_${Date.now()}`,
        timestamp,
        version: '1.0',
        system: 'Hamdard University FYP Portal',
        totalRecords: users.length + projects.length + notifications.length + 
                      groups.length + messages.length + committees.length
      },
      database: {
        users: users.map(u => ({
          ...u,
          password: '[REDACTED]' // Don't include passwords in backup
        })),
        projects,
        notifications,
        groups,
        groupMembers,
        groupRequests,
        supervisorRequests,
        messages,
        conversations,
        meetings
      },
      files: {
        committees,
        fileMetadata,
        systemSettings,
        loginAttempts
      },
      statistics: {
        totalUsers: users.length,
        totalProjects: projects.length,
        totalNotifications: notifications.length,
        totalGroups: groups.length,
        totalMessages: messages.length,
        totalMeetings: meetings.length,
        usersByRole: {
          students: users.filter(u => u.role === 'STUDENT').length,
          teachers: users.filter(u => u.role === 'TEACHER').length,
          admins: users.filter(u => u.role === 'ADMIN').length,
          committeeHeads: users.filter(u => u.role === 'COMMITTEE_HEAD').length
        }
      }
    }

    // Save backup to file
    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    const filepath = join(backupsDir, filename)
    await writeFile(filepath, JSON.stringify(backupData, null, 2), 'utf-8')

    // Calculate file size
    const stats = await require('fs').promises.stat(filepath)
    const sizeInKB = (stats.size / 1024).toFixed(2)

    return NextResponse.json({
      success: true,
      message: 'Database backup completed successfully',
      backup: {
        id: backupData.metadata.backupId,
        timestamp,
        filename,
        size: `${sizeInKB} KB`,
        records: backupData.metadata.totalRecords,
        location: `/data/backups/${filename}`
      }
    })
  } catch (error) {
    console.error('Backup error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to create database backup',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET - Download backup file
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('file')

    if (!filename) {
      // Return list of available backups
      const backupsDir = join(process.cwd(), 'data', 'backups')
      if (!existsSync(backupsDir)) {
        return NextResponse.json({ backups: [] })
      }

      const files = await readdir(backupsDir)
      const backups = await Promise.all(
        files
          .filter(f => f.endsWith('.json'))
          .map(async (file) => {
            const filepath = join(backupsDir, file)
            const stats = await require('fs').promises.stat(filepath)
            return {
              filename: file,
              size: `${(stats.size / 1024).toFixed(2)} KB`,
              created: stats.birthtime.toISOString()
            }
          })
      )

      return NextResponse.json({ backups: backups.sort((a, b) => 
        new Date(b.created).getTime() - new Date(a.created).getTime()
      ) })
    }

    // Download specific backup file
    const backupsDir = join(process.cwd(), 'data', 'backups')
    const filepath = join(backupsDir, filename)

    if (!existsSync(filepath) || !filename.endsWith('.json')) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 })
    }

    const fileContent = await require('fs').promises.readFile(filepath, 'utf-8')
    
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    })
  } catch (error) {
    console.error('Backup download error:', error)
    return NextResponse.json({
      error: 'Failed to download backup',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}