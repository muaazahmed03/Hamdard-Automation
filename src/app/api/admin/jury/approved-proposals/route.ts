import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET approved defenses (PROPOSAL, FYP_I, FYP_II approved through defense)
export async function GET(request: NextRequest) {
  try {
    console.log('[Approved Defenses API] Fetching all approved defenses...');
    
    // Get all defense assignments (PROPOSAL, FYP_I, FYP_II) that have been ACCEPTED
    const approvedDefenses = await db.juryAssignment.findMany({
      where: {
        evaluationStatus: 'ACCEPTED' // Only show defenses approved through jury evaluation
      },
      include: {
        defenseSchedule: {
          select: {
            id: true,
            defenseType: true,
            defenseDate: true,
            defenseTime: true,
            venue: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    console.log(`[Approved Defenses API] Found ${approvedDefenses.length} approved defenses`);

    // For each approved defense, get the associated project and details
    const approvedWithDetails = await Promise.all(
      approvedDefenses.map(async (defense: any) => {
        const defenseType = defense.defenseSchedule?.defenseType || 'PROPOSAL';
        // Get the group and project
        const group = await db.group.findUnique({
          where: { id: defense.groupId },
          include: {
            projects: {
              include: {
                supervisor: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    department: true,
                  },
                },
              },
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    rollNumber: true,
                  },
                },
              },
            },
          },
        });

        // Get submission based on defense type
        let submission = null;
        if (defenseType === 'PROPOSAL') {
          submission = await db.projectSubmission.findFirst({
            where: {
              project: {
                groupId: defense.groupId
              },
              fileType: {
                in: ['PROPOSAL', 'proposal']
              }
            },
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  rollNumber: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc'
            }
          });
        }

        return {
          id: defense.id, // Use defense assignment ID
          defenseType: defenseType, // PROPOSAL, FYP_I, or FYP_II
          title: defense.projectTitle || group?.projects?.[0]?.title || 'N/A',
          fileName: submission?.fileName || null,
          fileUrl: submission?.fileUrl || null,
          marks: defense.marks || null,
          feedback: defense.feedback || null,
          project: {
            id: group?.projects?.[0]?.id || defense.groupId,
            title: defense.projectTitle || group?.projects?.[0]?.title || 'N/A',
            group: group ? {
              id: group.id,
              name: group.name || defense.groupName || 'N/A',
              members: group.members || [],
            } : null,
            supervisor: group?.projects?.[0]?.supervisor || null,
          },
          student: submission?.student || null,
          approvedAt: defense.updatedAt.toISOString(), // Use defense approval date
          defenseDate: defense.defenseSchedule?.defenseDate || null,
          defenseScheduleId: defense.defenseScheduleId,
        };
      })
    );

    console.log(`[Approved Defenses API] Returning ${approvedWithDetails.length} approved defenses`);
    
    return NextResponse.json(approvedWithDetails, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[Approved Defenses API] Error fetching approved defenses:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch approved defenses',
        details: error.message || 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
