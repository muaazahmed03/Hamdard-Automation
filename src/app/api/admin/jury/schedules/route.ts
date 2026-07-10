import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all defense schedules
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const defenseType = url.searchParams.get('type');

    const where: any = {};
    if (defenseType) {
      where.defenseType = defenseType;
    }

    const schedules = await db.defenseSchedule.findMany({
      where,
      include: {
        juryAssignments: {
          include: {
            defenseSchedule: true
          }
        },
      },
      orderBy: {
        defenseDate: 'desc',
      },
    });

    // Enrich jury assignments with group member details
    for (const schedule of schedules) {
      for (const assignment of schedule.juryAssignments) {
        const group = await db.group.findUnique({
          where: { id: assignment.groupId },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  }
                }
              }
            }
          }
        });
        if (group) {
          (assignment as any).groupMembers = group.members.map(m => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email
          }));
        }
      }
    }

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching defense schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch defense schedules' },
      { status: 500 }
    );
  }
}

// POST - Create a new defense schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      defenseType,
      title,
      description,
      defenseDate,
      defenseTime,
      venue,
      isPublished,
      createdBy,
      selectedTeachers,
      selectedGroups,
    } = body;

    if (!defenseType || !title || !defenseDate || !defenseTime || !venue || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the defense schedule
    const schedule = await db.defenseSchedule.create({
      data: {
        defenseType,
        title,
        description,
        defenseDate: new Date(defenseDate),
        defenseTime,
        venue,
        isPublished: isPublished || false,
        createdBy,
      },
    });

    // Create announcements and notifications for the defense schedule
    if (isPublished && (selectedTeachers?.length > 0 || selectedGroups?.length > 0)) {
      const defenseTypeLabel = defenseType === 'PROPOSAL' ? 'Proposal' : defenseType === 'FYP_I' ? 'FYP-I' : 'FYP-II';
      
      // Get project information for better context in announcement
      let projectInfo = '';
      if (selectedGroups && selectedGroups.length > 0) {
        const firstGroup = await db.group.findUnique({
          where: { id: selectedGroups[0] },
          include: {
            projects: {
              take: 1,
              select: { title: true }
            }
          }
        });
        if (firstGroup?.projects?.[0]?.title) {
          projectInfo = ` for the project "${firstGroup.projects[0].title}"`;
        } else if (firstGroup?.name) {
          projectInfo = ` for the group "${firstGroup.name}"`;
        }
      }
      
      const announcementContent = `${defenseTypeLabel} Defense${projectInfo} has been scheduled.\n\n` +
        `Title: ${title}\n` +
        (description ? `Description: ${description}\n` : '') +
        `Date: ${new Date(defenseDate).toLocaleDateString()}\n` +
        `Time: ${defenseTime}\n` +
        `Venue: ${venue}`;

      // Create announcement with relatedId pointing to the defense schedule
      await db.announcement.create({
        data: {
          title: `${defenseTypeLabel} Defense Scheduled`,
          content: announcementContent,
          type: 'DEFENSE_SCHEDULE',
          createdBy,
          priority: 'HIGH',
          targetedTeachers: selectedTeachers && selectedTeachers.length > 0 
            ? JSON.stringify(selectedTeachers) 
            : null,
          targetedGroups: selectedGroups && selectedGroups.length > 0 
            ? JSON.stringify(selectedGroups) 
            : null,
          relatedId: schedule.id, // Link announcement to defense schedule
          isActive: true,
        },
      });

      // Create notifications for selected teachers
      if (selectedTeachers && selectedTeachers.length > 0) {
        // Get project information from selected groups for better context
        let projectContext = '';
        if (selectedGroups && selectedGroups.length > 0) {
          const firstGroup = await db.group.findUnique({
            where: { id: selectedGroups[0] },
            include: {
              projects: {
                take: 1,
                select: { title: true }
              }
            }
          });
          if (firstGroup?.projects?.[0]?.title) {
            projectContext = ` for the project "${firstGroup.projects[0].title}"`;
          } else if (firstGroup?.name) {
            projectContext = ` for the group "${firstGroup.name}"`;
          }
        }

        for (const teacherId of selectedTeachers) {
          await db.notification.create({
            data: {
              userId: teacherId,
              title: `${defenseTypeLabel} Defense Scheduled`,
              message: `You have been assigned as a jury member${projectContext} for the ${defenseTypeLabel} defense scheduled on ${new Date(defenseDate).toLocaleDateString()} at ${defenseTime} in ${venue}. Please review the defense details and prepare for evaluation.`,
              type: 'DEFENSE_SCHEDULE',
              relatedId: schedule.id,
              isRead: false,
            },
          });
        }
      }

      // Create notifications for students in selected groups
      if (selectedGroups && selectedGroups.length > 0) {
        for (const groupId of selectedGroups) {
          const group = await db.group.findUnique({
            where: { id: groupId },
            include: {
              members: {
                include: {
                  user: true
                }
              }
            }
          });

          if (group && group.members) {
            for (const member of group.members) {
              await db.notification.create({
                data: {
                  userId: member.userId,
                  title: `${defenseTypeLabel} Defense Scheduled`,
                  message: `Your group "${group.name}" has been scheduled for ${title} on ${new Date(defenseDate).toLocaleDateString()} at ${defenseTime} in ${venue}`,
                  type: 'DEFENSE_SCHEDULE',
                  relatedId: schedule.id,
                  isRead: false,
                },
              });
            }
          }
        }
      }
    }

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error('Error creating defense schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create defense schedule' },
      { status: 500 }
    );
  }
}
