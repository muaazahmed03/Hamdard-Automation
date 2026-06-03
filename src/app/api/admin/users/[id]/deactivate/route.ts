import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createNotification, NotificationTemplates } from '@/lib/notification-service'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, isActive: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isActive === false) {
      return NextResponse.json({ error: 'User is already deactivated' }, { status: 400 })
    }

    // Deactivate user
    const updatedUser = await db.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isActive: true,
        department: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    // Send notification to user
    try {
      await createNotification({
        userId: id,
        title: 'Account Deactivated',
        message: `Your account has been deactivated by the administrator. Please contact support for more information.`,
        category: 'SYSTEM',
        priority: 'HIGH'
      })
    } catch (notifErr) {
      console.error('Failed to create deactivation notification:', notifErr)
    }

    return NextResponse.json({ 
      message: 'User deactivated successfully', 
      user: updatedUser 
    })
  } catch (error) {
    console.error('User deactivation error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ 
      error: 'Failed to deactivate user', 
      details: message 
    }, { status: 500 })
  }
}
