import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH - Update evaluation status of a jury assignment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { evaluationStatus, marks, feedback, scheduleId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - User ID required' },
        { status: 401 }
      );
    }

    if (!evaluationStatus) {
      return NextResponse.json(
        { error: 'Evaluation status is required' },
        { status: 400 }
      );
    }

    // Get the assignment to check current attempt count
    const assignment = await db.juryAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        defenseSchedule: true
      }
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized (admin or assigned jury member)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      console.error(`[Jury Evaluation] User ${userId} not found`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse jury members from JSON string
    let juryMembers: string[] = [];
    try {
      juryMembers = assignment.juryMembers ? JSON.parse(assignment.juryMembers) : [];
    } catch (e) {
      console.error('[Jury Evaluation] Error parsing jury members:', e, 'Raw value:', assignment.juryMembers);
      juryMembers = [];
    }

    // Check if user is admin OR is in the jury members list
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const isJuryMember = Array.isArray(juryMembers) && juryMembers.includes(userId);
    const isChairperson = assignment.chairpersonId === userId;

    console.log(`[Jury Evaluation] Authorization check for user ${userId}:`, {
      userRole: user.role,
      isAdmin,
      isJuryMember,
      isChairperson,
      juryMembers,
      chairpersonId: assignment.chairpersonId,
      assignmentId: assignmentId
    });

    if (!isAdmin && !isJuryMember && !isChairperson) {
      console.error(`[Jury Evaluation] Unauthorized: User ${userId} is not authorized to evaluate assignment ${assignmentId}`);
      return NextResponse.json(
        { error: 'Unauthorized - You are not assigned as a jury member for this assignment' },
        { status: 403 }
      );
    }

    // For PROPOSAL defense, track attempts and handle special statuses
    const defenseType = assignment.defenseSchedule?.defenseType;
    const isProposalDefense = defenseType === 'PROPOSAL';
    
    // Count previous defense attempts for this group (only for PROPOSAL)
    // Count all previous PROPOSAL defenses that were evaluated (not PENDING)
    let currentAttempt = 1;
    if (isProposalDefense) {
      const previousEvaluated = await db.juryAssignment.findMany({
        where: {
          groupId: assignment.groupId,
          defenseSchedule: {
            defenseType: 'PROPOSAL'
          },
          evaluationStatus: {
            not: 'PENDING'
          },
          id: {
            not: assignmentId // Exclude current assignment
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      currentAttempt = previousEvaluated.length + 1;
      console.log(`[Jury Evaluation] Proposal defense attempt ${currentAttempt} for group ${assignment.groupId}`);
    }

    // For PROPOSAL defense, check if this is 3rd attempt and status is REJECTED
    // If so, change to FAILED (permanently failed)
    let finalEvaluationStatus = evaluationStatus;
    if (isProposalDefense && evaluationStatus === 'REJECTED' && currentAttempt >= 3) {
      finalEvaluationStatus = 'FAILED';
    }

    // Get existing jury evaluations
    let juryEvaluations: Record<string, any> = {};
    try {
      if (assignment.juryEvaluations) {
        juryEvaluations = JSON.parse(assignment.juryEvaluations);
      }
    } catch (e) {
      console.error('[Jury Evaluation] Error parsing jury evaluations:', e);
      juryEvaluations = {};
    }

    // Store individual jury member evaluation
    const evaluationData = {
      status: finalEvaluationStatus,
      marks: marks || null,
      feedback: feedback || null,
      evaluatedAt: new Date().toISOString()
    };
    juryEvaluations[userId] = evaluationData;

    // Auto-accept logic: If one jury member accepts, auto-accept all other jury members' individual evaluations
    // This only affects individual jury member status, NOT the overall defense status
    if (finalEvaluationStatus === 'ACCEPTED') {
      try {
        const juryMemberIds = JSON.parse(assignment.juryMembers || '[]');
        juryMemberIds.forEach((memberId: string) => {
          if (memberId !== userId && !juryEvaluations[memberId]) {
            // Auto-accept for other jury members who haven't evaluated yet
            // This marks their individual status as accepted, but overall defense status remains PENDING
            juryEvaluations[memberId] = {
              status: 'ACCEPTED',
              marks: marks || null,
              feedback: 'Auto-accepted (one jury member accepted)',
              evaluatedAt: new Date().toISOString(),
              autoAccepted: true
            };
          }
        });
      } catch (e) {
        console.error('[Jury Evaluation] Error parsing jury members for auto-accept:', e);
      }
    }

    // Determine overall evaluation status based on jury member evaluations
    const allEvaluations = Object.values(juryEvaluations) as any[];
    const juryMemberIds = JSON.parse(assignment.juryMembers || '[]');
    const totalJuryMembers = juryMemberIds.length;
    
    // Count manually evaluated members (not auto-accepted)
    const manuallyEvaluated = allEvaluations.filter((e: any) => !e.autoAccepted).length;
    const allEvaluated = allEvaluations.length >= totalJuryMembers; // All members have evaluated (manually or auto-accepted)
    const allAccepted = allEvaluations.every((e: any) => e.status === 'ACCEPTED');
    const anyRejected = allEvaluations.some((e: any) => e.status === 'REJECTED' || e.status === 'FAILED');
    const anyReEvaluation = allEvaluations.some((e: any) => e.status === 'RE_EVALUATION_REQUIRED' || e.status === 'CONDITIONALLY_APPROVED');
    
    // Update overall status based on consensus
    // IMPORTANT: Auto-accepting other jury members only affects their individual status
    // The overall defense status should NOT automatically become ACCEPTED when one member accepts
    // It should remain PENDING until admin reviews or manually accepts
    let overallStatus = assignment.evaluationStatus; // Keep current status by default
    
    // Only automatically set to ACCEPTED if:
    // 1. All jury members have manually evaluated (not just auto-accepted), AND
    // 2. All evaluations are ACCEPTED
    // Otherwise, keep current status or use the evaluation status from this submission
    if (anyRejected) {
      // If any member rejected, set to rejected status
      overallStatus = finalEvaluationStatus;
    } else if (anyReEvaluation) {
      // If any member requires re-evaluation
      overallStatus = 'RE_EVALUATION_REQUIRED';
    } else if (manuallyEvaluated >= totalJuryMembers && allAccepted) {
      // All jury members have manually evaluated and all accepted - defense can be accepted
      overallStatus = 'ACCEPTED';
    } else {
      // Otherwise, keep current status (don't auto-accept overall defense)
      // If current status is PENDING, keep it PENDING
      // If current status is already ACCEPTED (from admin), keep it ACCEPTED
      overallStatus = assignment.evaluationStatus === 'PENDING' ? 'PENDING' : 
                     (assignment.evaluationStatus === 'ACCEPTED' ? 'ACCEPTED' : finalEvaluationStatus);
    }

    // Calculate average marks if multiple evaluations
    let averageMarks = marks || null;
    if (allEvaluations.length > 1 && allEvaluations.some((e: any) => e.marks !== null && e.marks !== undefined)) {
      const marksArray = allEvaluations
        .map((e: any) => e.marks)
        .filter((m: any) => m !== null && m !== undefined);
      if (marksArray.length > 0) {
        averageMarks = marksArray.reduce((sum: number, m: number) => sum + m, 0) / marksArray.length;
      }
    }

    // Update the assignment
    // Build update data object conditionally to handle cases where juryEvaluations field might not exist yet
    const updateData: any = {
      evaluationStatus: overallStatus,
      marks: averageMarks,
      feedback: feedback || assignment.feedback || null,
    };
    
    // Only include juryEvaluations if the field exists in the schema
    // This will work after Prisma client is regenerated
    try {
      updateData.juryEvaluations = JSON.stringify(juryEvaluations);
    } catch (e) {
      console.warn('[Jury Evaluation] Could not set juryEvaluations - Prisma client may need regeneration:', e);
    }
    
    const updated = await db.juryAssignment.update({
      where: { id: assignmentId },
      data: updateData,
    });

    // Handle PROPOSAL defense outcomes
    // Only update project status when overall defense is actually accepted (not just one member)
    if (isProposalDefense) {
      // Only proceed if overall status is ACCEPTED (not just individual member acceptance)
      // This prevents auto-updating project status when one member accepts
      if (overallStatus === 'ACCEPTED') {
        // Approved: Proposal accepted; group proceeds to Active Project Execution
        const group = await db.group.findUnique({
          where: { id: assignment.groupId },
          include: {
            projects: true,
            members: {
              include: { user: true }
            }
          }
        });

        if (group && group.projects && group.projects.length > 0) {
          const project = group.projects[0];
          await db.project.update({
            where: { id: project.id },
            data: { status: 'IN_PROGRESS' } // Proposal accepted, project moves to FYP I execution
          });
        }

        if (group && group.members) {
          for (const member of group.members) {
            await db.notification.create({
              data: {
                userId: member.userId,
                title: 'Proposal Defense Accepted',
                message: `Congratulations! Your proposal "${assignment.projectTitle}" has been accepted. You can now proceed to Active Project Execution (FYP-I).`,
                type: 'DEFENSE_EVALUATION',
                relatedId: assignment.id,
                isRead: false,
              },
            });
          }
        }
      } else if (evaluationStatus === 'CONDITIONALLY_APPROVED') {
        // Conditionally Approved: Minor revisions required; students upload corrected proposal (no re-defense)
        const group = await db.group.findUnique({
          where: { id: assignment.groupId },
          include: {
            members: {
              include: { user: true }
            }
          }
        });

        if (group && group.members) {
          for (const member of group.members) {
            await db.notification.create({
              data: {
                userId: member.userId,
                title: 'Proposal Conditionally Approved',
                message: `Your proposal "${assignment.projectTitle}" has been conditionally approved. Minor revisions are required. Please upload the corrected proposal (no re-defense needed).`,
                type: 'DEFENSE_EVALUATION',
                relatedId: assignment.id,
                isRead: false,
              },
            });
          }
        }
      } else if (finalEvaluationStatus === 'REJECTED' || finalEvaluationStatus === 'FAILED') {
        // Rejected: Major changes required; proposal sent for Re-Defense
        // Or Permanently Failed after 3 attempts
        const group = await db.group.findUnique({
          where: { id: assignment.groupId },
          include: {
            members: {
              include: { user: true }
            }
          }
        });

        if (group && group.members) {
          let message = '';
          let title = '';
          
          if (finalEvaluationStatus === 'FAILED') {
            // Third rejection - permanently failed
            title = 'Proposal Permanently Failed';
            message = `Your proposal "${assignment.projectTitle}" has been permanently failed after 3 attempts. You must submit a new proposal in the next cycle.`;
          } else if (currentAttempt === 1) {
            // First rejection - can have re-defense
            title = 'Proposal Rejected - Re-Defense Required';
            message = `Your proposal "${assignment.projectTitle}" has been rejected. Major changes are required. A Re-Defense schedule will be arranged. Please update your proposal and prepare for re-presentation.`;
          } else if (currentAttempt === 2) {
            // Second rejection - one final chance
            title = 'Proposal Rejected - Final Re-Defense Required';
            message = `Your proposal "${assignment.projectTitle}" has been rejected again. This is your final chance. Please update your proposal and prepare for the final re-defense.`;
          }

          for (const member of group.members) {
            await db.notification.create({
              data: {
                userId: member.userId,
                title: title,
                message: message,
                type: 'DEFENSE_EVALUATION',
                relatedId: assignment.id,
                isRead: false,
              },
            });
          }
        }
      }
    } else if (evaluationStatus === 'FAILED') {
      // For FYP-I and FYP-II defenses (not PROPOSAL)
      const group = await db.group.findUnique({
        where: { id: assignment.groupId },
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
              title: 'Defense Failed',
              message: `Your defense for "${assignment.projectTitle}" has been marked as failed after 3 attempts. Please contact the administration.`,
              type: 'DEFENSE_EVALUATION',
              relatedId: assignment.id,
              isRead: false,
            },
          });
        }
      }
    } else if (overallStatus === 'ACCEPTED' && !isProposalDefense) {
      // For FYP-I and FYP-II defenses (PROPOSAL is handled above)
      // Only update project status when overall defense is accepted (not just one member)
      // Update project status based on defense type
      if (assignment.defenseSchedule) {
        const defenseType = assignment.defenseSchedule.defenseType;
        
        // Fetch the group and its projects separately
        const group = await db.group.findUnique({
          where: { id: assignment.groupId },
          include: {
            projects: true
          }
        });
        
        if (group && group.projects && group.projects.length > 0) {
          const project = group.projects[0]; // Get the first project associated with the group
          
          if (project) {
            let newStatus: 'IN_PROGRESS' | 'COMPLETED' = 'IN_PROGRESS';
            // PROPOSAL is handled above, so only handle FYP_I and FYP_II here
            if (defenseType === 'FYP_I') {
              // FYP I accepted, project continues to FYP II (still in progress)
              newStatus = 'IN_PROGRESS';
            } else if (defenseType === 'FYP_II') {
              // FYP II accepted, project is completed
              newStatus = 'COMPLETED';
            }

            // Update project status
            await db.project.update({
              where: { id: project.id },
              data: { status: newStatus }
            });

            console.log(`[Jury Evaluation] Updated project ${project.id} status to ${newStatus} after ${defenseType} defense acceptance`);
          }
        }
      }

      // Create notification for group members
      const group = await db.group.findUnique({
        where: { id: assignment.groupId },
        include: {
          members: {
            include: {
              user: true
            }
          }
        }
      });

      if (group && group.members) {
        const defenseType = assignment.defenseSchedule?.defenseType || 'PROPOSAL';
        const nextStep = defenseType === 'PROPOSAL' ? 'FYP I' : defenseType === 'FYP_I' ? 'FYP II' : 'completion';
        
        for (const member of group.members) {
          await db.notification.create({
            data: {
              userId: member.userId,
              title: 'Defense Accepted',
              message: `Congratulations! Your ${defenseType.replace('_', ' ')} defense for "${assignment.projectTitle}" has been accepted. You can proceed to ${nextStep}.`,
              type: 'DEFENSE_EVALUATION',
              relatedId: assignment.id,
              isRead: false,
            },
          });
        }
      }
    } else if (evaluationStatus === 'RE_EVALUATION_REQUIRED') {
      // Create notification for group members
      const group = await db.group.findUnique({
        where: { id: assignment.groupId },
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
              title: 'Re-Evaluation Required',
              message: `Your defense for "${assignment.projectTitle}" requires re-evaluation. A new defense schedule will be arranged.`,
              type: 'DEFENSE_EVALUATION',
              relatedId: assignment.id,
              isRead: false,
            },
          });
        }
      }
    }

    console.log(`[Jury Evaluation] Successfully updated assignment ${assignmentId} by user ${userId}`);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating assignment evaluation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update assignment evaluation';
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.stack : String(error) },
      { status: 500 }
    );
  }
}

