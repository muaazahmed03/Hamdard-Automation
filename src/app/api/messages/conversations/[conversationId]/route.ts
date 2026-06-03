import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/messages/conversations/[conversationId] - delete conversation
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = await params

    // Verify user is participant
    const convo = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true }
    })

    if (!convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const isParticipant = convo.participants.some((p: any) => p.userId === userId)
    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete messages then conversation
    await db.message.deleteMany({ where: { conversationId } })
    await db.conversation.delete({ where: { id: conversationId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to delete conversation', err)
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
  }
}
