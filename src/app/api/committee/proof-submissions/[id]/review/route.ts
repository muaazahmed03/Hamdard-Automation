import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'

// POST - Review proof submission (approve/reject)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { status, reviewComments } = body

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const { id } = await params;
    const submission = await prisma.proofSubmission.update({
      where: { id },
      data: {
        status,
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewComments
      }
    })

    // If rejected, update student status and handle group consequences
    if (status === 'REJECTED') {
      // Update student profile to ineligible
      const studentProfile = await prisma.studentProfile.findFirst({
        where: { userId: submission.studentId }
      })

      if (studentProfile) {
        await prisma.studentProfile.update({
          where: { id: studentProfile.id },
          data: {
            eligibilityStatus: 'INELIGIBLE'
          }
        })
      }

      // If student is in a group, remove student and notify group and supervisor
      if (submission.groupId) {
        const group = await prisma.group.findUnique({
          where: { id: submission.groupId },
          include: {
            members: {
              include: {
                user: true
              }
            },
            projects: {
              include: {
                supervisor: {
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

        if (group) {
          // Get student info before removal
          const removedStudent = group.members.find(m => m.userId === submission.studentId);
          const studentName = removedStudent?.user?.name || 'A student';

          // Remove student from group
          await prisma.groupMember.deleteMany({
            where: {
              groupId: submission.groupId,
              userId: submission.studentId
            }
          })

          // Get remaining members after removal
          const remainingMembers = group.members.filter(
            m => m.userId !== submission.studentId
          )

          // Notify all remaining group members
          for (const member of remainingMembers) {
            await prisma.notification.create({
              data: {
                userId: member.userId,
                title: 'Group Member Removed',
                message: `${studentName} has been removed from group "${group.name}" due to proof submission rejection. ${remainingMembers.length === 1 ? 'You must add another member within the deadline.' : ''}`,
                type: 'GROUP_UPDATE',
                relatedId: submission.groupId
              }
            })
          }

          // Notify supervisor if exists
          if (group.projects && group.projects.length > 0) {
            const supervisor = group.projects[0]?.supervisor;
            if (supervisor) {
              await prisma.notification.create({
                data: {
                  userId: supervisor.id,
                  title: 'Group Member Removed',
                  message: `${studentName} has been removed from group "${group.name}" due to proof submission rejection. The group now has ${remainingMembers.length} member(s).`,
                  type: 'GROUP_UPDATE',
                  relatedId: submission.groupId
                }
              })
            }
          }

          // Check if group has only one member left - set deadline
          if (remainingMembers.length === 1) {
            // Set deadline to 7 days from now
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 7);

            // Update group with deadline
            await prisma.group.update({
              where: { id: submission.groupId },
              data: {
                addMemberDeadline: deadline
              }
            })

            // Notify the remaining member about the deadline
            await prisma.notification.create({
              data: {
                userId: remainingMembers[0].userId,
                title: '⚠️ Action Required: Add Group Member',
                message: `Your group "${group.name}" now has only one member. You must add another member by ${deadline.toLocaleDateString()} (${deadline.toLocaleTimeString()}) to continue with the project.`,
                type: 'GROUP_UPDATE',
                relatedId: submission.groupId
              }
            })
          } else if (remainingMembers.length === 0) {
            // If no members left, deactivate the group
            await prisma.group.update({
              where: { id: submission.groupId },
              data: {
                isActive: false
              }
            })
          }
        }
      }

      // Create notification for student
      await prisma.notification.create({
        data: {
          userId: submission.studentId,
          title: 'Proof Submission Rejected',
          message: `Your proof submission has been rejected. Reason: ${reviewComments || 'Not provided'}`,
          type: 'PROOF_REJECTED'
        }
      })
    } else {
      // If approved, update student status
      const studentProfile = await prisma.studentProfile.findFirst({
        where: { userId: submission.studentId }
      })

      if (studentProfile) {
        await prisma.studentProfile.update({
          where: { id: studentProfile.id },
          data: {
            eligibilityStatus: 'ELIGIBLE',
            prerequisitesPassed: true
          }
        })
      }

      // Create notification for student
      await prisma.notification.create({
        data: {
          userId: submission.studentId,
          title: 'Proof Submission Approved',
          message: 'Your proof submission has been approved. You are now eligible to continue.',
          type: 'PROOF_APPROVED'
        }
      })
    }

    return NextResponse.json(submission)
  } catch (error) {
    console.error('Error reviewing proof submission:', error)
    return NextResponse.json(
      { error: 'Failed to review proof submission' },
      { status: 500 }
    )
  }
}
