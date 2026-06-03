import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = params.id;

    // Check if message exists and user is the sender
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.senderId !== userId) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 });
    }

    // Soft delete - update deletedAt and deletedBy
    const deletedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        content: '[Message deleted]'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully',
      deletedMessage
    });

  } catch (error) {
    console.error('Message deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
