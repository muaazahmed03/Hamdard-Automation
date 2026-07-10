import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createNotification, NotificationTemplates } from '@/lib/notification-service';

// PATCH /api/supervision/requests/[id] - Accept or reject a supervision request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, feedback } = body; // 'accept', 'reject', or 'request_changes'

    if (!action || !['accept', 'reject', 'accepted', 'rejected', 'request_changes'].includes(action.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept", "reject", or "request_changes"' },
        { status: 400 }
      );
    }

    // Get the supervision request
    const supervisionRequest = await db.supervisorRequest.findUnique({
      where: { id },
      include: {
        student: true,
        teacher: true,
      },
    });

    if (!supervisionRequest) {
      return NextResponse.json(
        { error: 'Supervision request not found' },
        { status: 404 }
      );
    }

    // Verify that the current user is the teacher for this request
    if (supervisionRequest.teacherId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this request' },
        { status: 403 }
      );
    }

    // If accepting, check supervision capacity
    const actionLower = action.toLowerCase();
    if (actionLower === 'accept' || actionLower === 'accepted') {
      // Get teacher's current supervision count
      const currentSupervisionCount = await db.project.count({
        where: {
          supervisorId: userId,
          status: {
            in: ['PROPOSED', 'APPROVED', 'IN_PROGRESS']
          }
        }
      });

      // Get teacher's capacity (default 4)
      const teacherProfile = await db.teacherProfile.findUnique({
        where: { userId }
      });

      const capacity = teacherProfile?.supervisionCapacity || 4;

      if (currentSupervisionCount >= capacity) {
        return NextResponse.json(
          { 
            error: 'Supervision capacity exceeded',
            message: `You have reached your supervision limit of ${capacity} projects. Please complete or cancel existing supervisions before accepting new requests.`,
            capacity,
            currentCount: currentSupervisionCount
          },
          { status: 400 }
        );
      }
    }

    // Update the request status
    let newStatus = 'PENDING';
    if (actionLower === 'accept' || actionLower === 'accepted') {
      newStatus = 'ACCEPTED';
    } else if (actionLower === 'reject' || actionLower === 'rejected') {
      newStatus = 'REJECTED';
    } else if (actionLower === 'request_changes') {
      newStatus = 'PENDING'; // Keep as pending but add feedback
    }
    
    const updatedRequest = await db.supervisorRequest.update({
      where: { id },
      data: {
        status: newStatus,
        ...(actionLower === 'request_changes' && feedback && { message: `Changes requested: ${feedback}` }),
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
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If accepted, assign supervisor to student's project and group
    if (newStatus === 'ACCEPTED') {
      try {
        // Find groups where this student is a member
        const studentGroups = await db.groupMember.findMany({
          where: { userId: supervisionRequest.studentId },
          include: { 
            group: {
              include: {
                projects: true
              }
            } 
          }
        });

        if (studentGroups.length > 0) {
          const group = studentGroups[0].group;
          
          // Approve the group
          await db.group.update({
            where: { id: group.id },
            data: { 
              isApproved: true
            }
          });

          // If the supervision request has a specific project, update it
          if (supervisionRequest.projectId) {
            await db.project.update({
              where: { id: supervisionRequest.projectId },
              data: { 
                supervisorId: supervisionRequest.teacherId,
                groupId: group.id,
                status: 'APPROVED'
              }
            });
          } 
          // If group has existing projects, assign supervisor to all of them
          else if (group.projects && group.projects.length > 0) {
            for (const project of group.projects) {
              await db.project.update({
                where: { id: project.id },
                data: { supervisorId: supervisionRequest.teacherId }
              });
            }
          } 
          // If no project exists, create one for the group
          else {
            await db.project.create({
              data: {
                title: `${group.name} - FYP Project`,
                description: `Final Year Project for ${group.name}`,
                teacherId: supervisionRequest.teacherId,
                supervisorId: supervisionRequest.teacherId,
                groupId: group.id,
                status: 'APPROVED'
              }
            });
          }

          console.log(`✅ Assigned supervisor ${supervisionRequest.teacherId} to group ${group.id}`);
        }
      } catch (err) {
        console.error('Failed to assign supervisor to project/group:', err);
        // Don't fail the whole request if this fails
      }
    }

    // Create notification for the student
    let template;
    if (newStatus === 'ACCEPTED') {
      template = NotificationTemplates.supervisionRequestAccepted(
        supervisionRequest.teacher.name || 'Your supervisor'
      );
    } else if (newStatus === 'REJECTED') {
      template = NotificationTemplates.supervisionRequestRejected(
        supervisionRequest.teacher.name || 'The supervisor'
      );
    } else if (actionLower === 'request_changes') {
      template = {
        type: 'SUPERVISION_CHANGES_REQUESTED' as any,
        title: 'Changes Requested',
        message: `${supervisionRequest.teacher.name} has requested changes to your proposal. ${feedback || 'Please check the details.'}`,
      };
    }

    if (template) {
      await createNotification({
        userId: supervisionRequest.studentId,
        ...template,
      }).catch(err => console.warn('Failed to send notification:', err));
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating supervision request:', error);
    return NextResponse.json(
      { error: 'Failed to update supervision request' },
      { status: 500 }
    );
  }
}

// DELETE /api/supervision/requests/[id] - Delete a supervision request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the supervision request
    const supervisionRequest = await db.supervisorRequest.findUnique({
      where: { id },
    });

    if (!supervisionRequest) {
      return NextResponse.json(
        { error: 'Supervision request not found' },
        { status: 404 }
      );
    }

    // Only allow student to delete their own request
    if (supervisionRequest.studentId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this request' },
        { status: 403 }
      );
    }

    await db.supervisorRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting supervision request:', error);
    return NextResponse.json(
      { error: 'Failed to delete supervision request' },
      { status: 500 }
    );
  }
}
