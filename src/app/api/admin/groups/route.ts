import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/groups - Get all groups (admin only)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'approved', 'all'

    let whereClause: any = {
      isActive: true
    };

    if (status === 'pending') {
      whereClause.isApproved = false;
    } else if (status === 'approved') {
      whereClause.isApproved = true;
    } else if (status === 'all') {
      // Show all active groups regardless of approval status
      // whereClause remains as isActive: true
    }

    const groups = await db.group.findMany({
      where: whereClause,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                rollNumber: true,
                role: true,
                department: true
              },
            },
          },
        },
        projects: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch approver information for approved groups
    const groupsWithApprover = await Promise.all(
      groups.map(async (group) => {
        if (group.approvedBy) {
          const approver = await db.user.findUnique({
            where: { id: group.approvedBy },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          });
          return { ...group, approver };
        }
        return group;
      })
    );

    return NextResponse.json(groupsWithApprover);
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}