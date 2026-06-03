import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper function to check if defense is completed and accepted
async function checkDefenseCompleted(announcement: any, userGroupIds?: string[]): Promise<boolean> {
  try {
    // First, try to find defense schedule by relatedId if it exists
    if (announcement.relatedId) {
      const defenseSchedule = await db.defenseSchedule.findUnique({
        where: { id: announcement.relatedId },
        include: {
          juryAssignments: true,
        },
      });

      if (defenseSchedule) {
        // Check if the defense date/time has passed
        // defenseDate is DateTime, defenseTime is String (HH:MM format)
        const defenseDate = new Date(defenseSchedule.defenseDate);
        const [hours, minutes] = (defenseSchedule.defenseTime || '00:00').split(':').map(Number);
        defenseDate.setHours(hours, minutes, 0, 0);
        
        if (defenseDate <= new Date()) {
          // Defense date/time has passed, check if all assignments are accepted
          const relevantAssignments = userGroupIds && userGroupIds.length > 0
            ? defenseSchedule.juryAssignments.filter((a: any) => userGroupIds.includes(a.groupId))
            : defenseSchedule.juryAssignments;

          if (relevantAssignments.length > 0) {
            const allAccepted = relevantAssignments.every((assignment: any) => 
              assignment.evaluationStatus === 'ACCEPTED'
            );
            
            if (allAccepted) {
              console.log(`[Defense Completed] Defense ${defenseSchedule.id} (${defenseSchedule.defenseType}) is completed and accepted for groups: ${userGroupIds?.join(', ') || 'all'}`);
              return true; // Defense is completed and accepted
            }
          }
        }
      }
    }

    // Fallback: Find defense schedules that match this announcement by targeted groups
    let matchingSchedules: any[] = [];
    
    if (announcement.targetedGroups) {
      try {
        const targetedGroupIds = JSON.parse(announcement.targetedGroups);
        if (Array.isArray(targetedGroupIds) && targetedGroupIds.length > 0) {
          // Find schedules with matching groups and defense date has passed
          const schedules = await db.defenseSchedule.findMany({
            where: {
              defenseDate: {
                lte: new Date() // Defense date has passed
              }
            },
            include: {
              juryAssignments: {
                where: {
                  groupId: { in: targetedGroupIds }
                }
              }
            }
          });
          
          matchingSchedules = schedules;
        }
      } catch (e) {
        console.error('Error parsing targetedGroups in checkDefenseCompleted:', e);
      }
    }
    
    // If userGroupIds provided, filter to only check assignments for those groups
    for (const schedule of matchingSchedules) {
      if (schedule.juryAssignments && schedule.juryAssignments.length > 0) {
        const relevantAssignments = userGroupIds && userGroupIds.length > 0
          ? schedule.juryAssignments.filter((a: any) => userGroupIds.includes(a.groupId))
          : schedule.juryAssignments;
        
        // Check if all relevant assignments are ACCEPTED
        if (relevantAssignments.length > 0) {
          const allAccepted = relevantAssignments.every((assignment: any) => 
            assignment.evaluationStatus === 'ACCEPTED'
          );
          
          if (allAccepted) {
            return true; // Defense is completed and accepted
          }
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking defense completion:', error);
    return false;
  }
}

// GET all active announcements
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    let announcements = await db.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } }
        ]
      },
      // Include all announcements, especially DEFENSE_SCHEDULE type
      // Don't filter by isActive if it's a defense schedule
      include: {
        _count: {
          select: {
            proofSubmissions: true,
            evaluations: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Fetch creator names for all announcements
    const creatorIds = [...new Set(announcements.map(a => a.createdBy).filter(Boolean))]
    const creators = await db.user.findMany({
      where: { id: { in: creatorIds as string[] } },
      select: { id: true, name: true, role: true }
    })
    const creatorMap = Object.fromEntries(creators.map(c => [c.id, c.name]))

    // Transform to include creator name
    const transformedAnnouncements = announcements.map(ann => ({
      ...ann,
      createdByName: ann.createdBy ? creatorMap[ann.createdBy] || 'Unknown' : 'System'
    }));

    // If userId is provided, filter announcements based on targeting
    if (userId) {
      try {
        const user = await db.user.findUnique({
          where: { id: userId },
          include: {
            groupMemberships: {
              include: {
                group: true
              }
            }
          }
        });

        if (user) {
          // Get only active group IDs
          const userGroupIds = user.groupMemberships
            .filter(m => m.group && m.group.isActive === true)
            .map(m => m.groupId);

          // Filter announcements (need to handle async checks for defense completion)
          // Filter announcements (need to handle async checks for defense completion)
          const filteredResults = await Promise.all(
            transformedAnnouncements.map(async (announcement): Promise<any | null> => {
              try {
                // For COMMITTEE_HEAD, ADMIN, and SUPER_ADMIN roles, show all announcements
                if (user.role === 'COMMITTEE_HEAD' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
                  return announcement;
                }

                // For TEACHER role: Only show GENERAL announcements and DEFENSE_SCHEDULE (if targeted as jury member)
                // Do NOT show PROOF_SUBMISSION announcements to teachers
                if (user.role === 'TEACHER') {
                  // Exclude PROOF_SUBMISSION announcements for teachers
                  if (announcement.type === 'PROOF_SUBMISSION') {
                    console.log(`[TEACHER FILTER] Excluding PROOF_SUBMISSION announcement: ${announcement.id}`);
                    return null;
                  }

                  // For DEFENSE_SCHEDULE announcements, only show if teacher is specifically targeted as jury member
                  if (announcement.type === 'DEFENSE_SCHEDULE' || announcement.type === 'DEFENSE') {
                    // Defense schedules MUST have targeting - if not, don't show to anyone
                    if (!announcement.targetedTeachers && !announcement.targetedGroups) {
                      return null;
                    }

                    // Check if teacher is in targetedTeachers list (selected as jury member)
                    if (announcement.targetedTeachers && announcement.targetedTeachers.trim() !== '') {
                      try {
                        const targetedTeacherIds = JSON.parse(announcement.targetedTeachers);
                        if (Array.isArray(targetedTeacherIds) && targetedTeacherIds.length > 0) {
                          // Only show if this teacher is explicitly in the targetedTeachers list
                          const isIncluded = targetedTeacherIds.includes(userId);
                          
                          // Check if defense is completed and accepted - if so, hide announcement
                          if (isIncluded) {
                            const isDefenseCompleted = await checkDefenseCompleted(announcement);
                            if (isDefenseCompleted) {
                              console.log(`[TEACHER FILTER] DEFENSE_SCHEDULE ${announcement.id}: Defense completed and accepted, hiding announcement`);
                              return null;
                            }
                            return announcement;
                          }
                        }
                      } catch (e) {
                        console.error('Error parsing targetedTeachers:', e, announcement.targetedTeachers);
                      }
                    }

                    // If no targetedTeachers or teacher not in list, don't show
                    console.log(`[TEACHER FILTER] DEFENSE_SCHEDULE ${announcement.id}: No targetedTeachers or teacher not in list`);
                    return null;
                  }

                  // For GENERAL and other announcement types (not PROOF_SUBMISSION, not DEFENSE_SCHEDULE)
                  // Check targeting if specified
                  if (announcement.targetedTeachers && announcement.targetedTeachers.trim() !== '') {
                    try {
                      const targetedTeacherIds = JSON.parse(announcement.targetedTeachers);
                      if (Array.isArray(targetedTeacherIds) && targetedTeacherIds.length > 0) {
                        // If targeting is specified, only show if teacher is in the list
                        return targetedTeacherIds.includes(userId) ? announcement : null;
                      }
                    } catch (e) {
                      console.error('Error parsing targetedTeachers:', e, announcement.targetedTeachers);
                    }
                  }

                  // If no targeting specified, show general announcements to all teachers
                  // But make sure it's not PROOF_SUBMISSION (already checked above)
                  return announcement;
                }

                // For DEFENSE_SCHEDULE announcements (for students), only show if user is specifically targeted
                if (announcement.type === 'DEFENSE_SCHEDULE' || announcement.type === 'DEFENSE') {
                  // Defense schedules MUST have targeting - if not, don't show to anyone
                  if (!announcement.targetedTeachers && !announcement.targetedGroups) {
                    return null;
                  }

                  // For STUDENT role: Check if user belongs to a targeted group
                  if (user.role === 'STUDENT') {
                    if (announcement.targetedGroups && announcement.targetedGroups.trim() !== '') {
                      try {
                        const targetedGroupIds = JSON.parse(announcement.targetedGroups);
                        if (Array.isArray(targetedGroupIds) && targetedGroupIds.length > 0) {
                          if (userGroupIds.length > 0) {
                            const hasMatchingGroup = userGroupIds.some(groupId => targetedGroupIds.includes(groupId));
                            if (hasMatchingGroup) {
                              // Check if defense is completed and accepted - if so, hide announcement
                              const isDefenseCompleted = await checkDefenseCompleted(announcement, userGroupIds);
                              if (isDefenseCompleted) {
                                console.log(`[STUDENT FILTER] DEFENSE_SCHEDULE ${announcement.id}: Defense completed and accepted, hiding announcement`);
                                return null;
                              }
                              return announcement;
                            }
                          }
                        }
                      } catch (e) {
                        console.error('Error parsing targetedGroups:', e, announcement.targetedGroups);
                      }
                    }
                    // If student is not in targeted groups, don't show
                    return null;
                  }

                  // For TEACHER role: Already handled above in the TEACHER section
                  // This should not be reached for teachers, but as fallback return null
                  return null;
                }

                // For STUDENT role: Handle other announcement types (GENERAL, PROOF_SUBMISSION, etc.)
                if (user.role === 'STUDENT') {
                  // PROOF_SUBMISSION announcements should always show to students (if not expired)
                  if (announcement.type === 'PROOF_SUBMISSION') {
                    return announcement;
                  }

                  // For GENERAL and other announcement types
                  // If no targeting specified, show to everyone
                  if (!announcement.targetedTeachers && !announcement.targetedGroups) {
                    return announcement;
                  }

                  // Check if user belongs to a targeted group
                  if (announcement.targetedGroups && announcement.targetedGroups.trim() !== '') {
                    try {
                      const targetedGroupIds = JSON.parse(announcement.targetedGroups);
                      if (Array.isArray(targetedGroupIds) && targetedGroupIds.length > 0) {
                        if (userGroupIds.length > 0 && userGroupIds.some(groupId => targetedGroupIds.includes(groupId))) {
                          return announcement;
                        }
                      }
                    } catch (e) {
                      console.error('Error parsing targetedGroups:', e, announcement.targetedGroups);
                    }
                  }

                  // If targeting is specified but student's group is not in the list, don't show
                  return null;
                }

                // For other roles (shouldn't reach here for TEACHER/STUDENT, but as fallback)
                // If no targeting specified, show to everyone
                if (!announcement.targetedTeachers && !announcement.targetedGroups) {
                  return announcement;
                }

                return null;
              } catch (error) {
                console.error(`Error filtering announcement ${announcement.id}:`, error);
                return null;
              }
            })
          );
          
          const filtered = filteredResults.filter((result): result is any => result !== null);

          return NextResponse.json(filtered);
        }
      } catch (userError) {
        console.error('Error fetching user for announcement filtering:', userError);
        // If user lookup fails, return all announcements
        return NextResponse.json(transformedAnnouncements);
      }
    }

    return NextResponse.json(transformedAnnouncements);
  } catch (error) {
    console.error('Failed to fetch announcements:', error);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

// POST create new announcement (Committee Head and Admin)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is committee head or admin
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user || !['COMMITTEE_HEAD', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized to create announcements' }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, priority, expiresAt, deadlineDate, type, createdByName } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        type: type || 'GENERAL',
        createdBy: userId,
        priority: priority || 'NORMAL',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        deadlineDate: deadlineDate ? new Date(deadlineDate) : null
      }
    });

    // Create notifications for all users
    const allUsers = await db.user.findMany({
      where: {
        status: 'APPROVED',
        id: { not: userId }
      }
    });

    await db.notification.createMany({
      data: allUsers.map(u => ({
        userId: u.id,
        title: '📢 New Announcement',
        message: title,
        type: 'ANNOUNCEMENT',
        relatedId: announcement.id
      }))
    });

    return NextResponse.json({
      success: true,
      announcement: {
        ...announcement,
        createdByName: createdByName || user.name || 'Admin'
      }
    });

  } catch (error) {
    console.error('Failed to create announcement:', error);
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }
}

// PATCH update announcement (Admin and Committee Head can update any announcement)
export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId }
    });

    // Both committee heads and admins can update announcements
    if (!user || !['COMMITTEE_HEAD', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id, isActive } = await request.json();

    const announcement = await db.announcement.update({
      where: { id },
      data: { isActive }
    });

    return NextResponse.json({
      success: true,
      announcement
    });

  } catch (error) {
    console.error('Failed to update announcement:', error);
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}
