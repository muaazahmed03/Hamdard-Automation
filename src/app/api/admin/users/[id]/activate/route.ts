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

    if (user.isActive) {
      return NextResponse.json({ error: 'User is already active' }, { status: 400 })
    }

    // Activate user
    const updatedUser = await db.user.update({
      where: { id },
      data: { isActive: true },
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
        title: 'Account Activated',
        message: `Your account has been activated by the administrator. You can now access the system.`,
        category: 'SYSTEM',
        priority: 'HIGH'
      })
    } catch (notifErr) {
      console.error('Failed to create activation notification:', notifErr)
    }

    return NextResponse.json({ 
      message: 'User activated successfully', 
      user: updatedUser 
    })
  } catch (error) {
    console.error('User activation error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ 
      error: 'Failed to activate user', 
      details: message 
    }, { status: 500 })
  }
}
