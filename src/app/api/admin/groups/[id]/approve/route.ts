import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createNotification } from '@/lib/notification-service';

// PATCH /api/admin/groups/[id]/approve - Approve a group
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { approve } = body; // true = approve, false = reject

    // Update group approval status
    const group = await db.group.update({
      where: { id },
      data: {
        isApproved: approve === true,
        approvedBy: approve === true ? userId : null,
        approvedAt: approve === true ? new Date() : null
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Send notifications to all group members
    for (const member of group.members) {
      await createNotification({
        userId: member.userId,
        title: approve ? 'Group Approved' : 'Group Not Approved',
        message: approve 
          ? `Your group "${group.name}" has been approved by the committee.`
          : `Your group "${group.name}" approval was not granted. Please contact the committee.`,
        type: approve ? 'SUCCESS' : 'WARNING',
        category: 'GROUP'
      }).catch(err => console.warn('Failed to send notification:', err));
    }

    return NextResponse.json(group);
  } catch (error: any) {
    console.error('Error approving group:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to approve group' },
      { status: 500 }
    );
  }
}
