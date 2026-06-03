import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/notifications - Get current user's notifications
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if database is accessible
    try {
      const notifications = await db.notification.findMany({
        where: {
          userId: userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50, // Limit to last 50 notifications
      });

      return NextResponse.json(notifications);
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Return empty array if database is not accessible
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json([], { status: 200 }); // Return empty array instead of error
  }
}

// PUT /api/notifications - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAll } = body;

    try {
      if (markAll) {
        // Mark all notifications as read for the user
        await db.notification.updateMany({
          where: {
            userId: userId,
            isRead: false,
          },
          data: {
            isRead: true,
          },
        });
      } else if (notificationIds && Array.isArray(notificationIds)) {
        // Mark specific notifications as read
        await db.notification.updateMany({
          where: {
            id: {
              in: notificationIds,
            },
            userId: userId,
          },
          data: {
            isRead: true,
          },
        });
      }
    } catch (dbError) {
      console.error('Database error updating notifications:', dbError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

// DELETE /api/notifications - Delete notifications
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, deleteAll } = body;

    try {
      if (deleteAll) {
        // Delete all notifications for the user
        await db.notification.deleteMany({
          where: {
            userId: userId,
          },
        });
      } else if (notificationIds && Array.isArray(notificationIds)) {
        // Delete specific notifications
        await db.notification.deleteMany({
          where: {
            id: {
              in: notificationIds,
            },
            userId: userId,
          },
        });
      }
    } catch (dbError) {
      console.error('Database error deleting notifications:', dbError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}