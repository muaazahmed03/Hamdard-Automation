import { NextRequest, NextResponse } from 'next/server'
import { createNotification, NotificationTemplates, notifyUsersByRole } from '@/lib/notification-service'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Fetch committees from database
    const committees = await db.committee.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Enrich committees with user details
    const enrichedCommittees = await Promise.all(
      committees.map(async (committee: any) => {
        const enriched: any = {
          id: committee.id,
          name: committee.name,
          description: committee.description,
          headId: committee.chairpersonId,
          memberIds: committee.members ? JSON.parse(committee.members) : [],
          status: committee.isActive ? 'Active' : 'Inactive',
          created: committee.createdAt.toISOString().split('T')[0],
          isActive: committee.isActive
        }

        // Enrich head details if chairpersonId exists
        if (committee.chairpersonId) {
          try {
            const headUser = await db.user.findUnique({
              where: { id: committee.chairpersonId },
              include: {
                teacherProfile: true
              }
            })
            if (headUser) {
              enriched.head = headUser.name
              enriched.headDetails = {
                id: headUser.id,
                name: headUser.name,
                email: headUser.email,
                department: headUser.department,
                profileImage: headUser.profileImage,
                designation: headUser.teacherProfile?.designation,
                employeeId: headUser.teacherProfile?.employeeId,
                officeHours: headUser.teacherProfile?.officeHours
              }
            }
          } catch (error) {
            console.error('Error fetching head details:', error)
          }
        }
        
        // Enrich member details if members exist
        if (committee.members) {
          try {
            const memberIds = JSON.parse(committee.members)
            if (Array.isArray(memberIds) && memberIds.length > 0) {
              const memberUsers = await db.user.findMany({
                where: { id: { in: memberIds } },
                include: {
                  teacherProfile: true
                }
              })
              
              enriched.members = memberUsers.map((user: any) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                department: user.department,
                role: user.role,
                profileImage: user.profileImage,
                designation: user.teacherProfile?.designation,
                employeeId: user.teacherProfile?.employeeId,
                officeHours: user.teacherProfile?.officeHours,
                supervisionCapacity: user.teacherProfile?.supervisionCapacity
              }))
            }
          } catch (error) {
            console.error('Error fetching member details:', error)
          }
        }
        
        return enriched
      })
    )
    
    return NextResponse.json(enrichedCommittees)
  } catch (error) {
    console.error('Committees fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch committees' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const committeeData = await request.json()

    if (!committeeData.name || !committeeData.headId) {
      return NextResponse.json(
        { error: 'Committee name and head are required' },
        { status: 400 }
      )
    }

    // Create committee in database
    const newCommittee = await db.committee.create({
      data: {
        name: committeeData.name,
        description: committeeData.description || null,
        chairpersonId: committeeData.headId || null,
        members: committeeData.memberIds && Array.isArray(committeeData.memberIds) 
          ? JSON.stringify(committeeData.memberIds) 
          : null,
        isActive: true
      }
    })

    // Format response to match frontend expectations
    const formattedCommittee = {
      id: newCommittee.id,
      name: newCommittee.name,
      description: newCommittee.description,
      head: committeeData.head || '',
      headId: newCommittee.chairpersonId,
      memberIds: committeeData.memberIds || [],
      members: committeeData.members || [],
      status: 'Active',
      created: newCommittee.createdAt.toISOString().split('T')[0],
      isActive: newCommittee.isActive
    }

    // Send notification to all users about new committee creation
    try {
      const template = NotificationTemplates.committeeCreated(
        committeeData.name,
        'Admin'
      );
      
      // Notify all committee heads and admins
      await Promise.all([
        notifyUsersByRole('COMMITTEE_HEAD', {
          ...template,
          link: '/committee-head'
        }),
        notifyUsersByRole('ADMIN', {
          ...template,
          link: '/admin?section=committees'
        })
      ]);
    } catch (notifErr) {
      console.warn('Failed to send committee creation notification:', notifErr);
    }

    return NextResponse.json({
      message: 'Committee created successfully',
      committee: formattedCommittee
    }, { status: 201 })
  } catch (error) {
    console.error('Committee creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create committee', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}