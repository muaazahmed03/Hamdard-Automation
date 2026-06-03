import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    console.log('Create group - User ID:', userId);
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, memberIds } = body;
    
    console.log('Create group request:', { name, memberIds, memberCount: memberIds?.length });

    if (!name || !memberIds || !Array.isArray(memberIds) || memberIds.length < 2) {
      console.log('Validation failed:', { name: !!name, memberIds: !!memberIds, isArray: Array.isArray(memberIds), length: memberIds?.length });
      return NextResponse.json({ 
        message: 'Group name and at least 2 members are required' 
      }, { status: 400 });
    }

    // Verify all members exist (students or teachers)
    const members = await prisma.user.findMany({
      where: {
        id: { in: memberIds }
      }
    });

    console.log(`Found ${members.length} members out of ${memberIds.length} requested`);

    if (members.length !== memberIds.length) {
      console.log('Some members not found:', {
        requested: memberIds,
        found: members.map(m => m.id)
      });
      return NextResponse.json({ 
        message: 'Some members are invalid' 
      }, { status: 400 });
    }

    // Create conversations between all members
    const createdConversations = [];
    const skippedConversations = [];
    
    console.log(`Creating conversations for ${memberIds.length} members`);
    
    for (let i = 0; i < memberIds.length; i++) {
      for (let j = i + 1; j < memberIds.length; j++) {
        const user1Id = memberIds[i];
        const user2Id = memberIds[j];

        // Check if conversation already exists
        const existing = await prisma.conversation.findFirst({
          where: {
            OR: [
              { user1Id, user2Id },
              { user1Id: user2Id, user2Id: user1Id }
            ]
          }
        });

        if (!existing) {
          const conversation = await prisma.conversation.create({
            data: {
              user1Id,
              user2Id
            }
          });
          createdConversations.push(conversation);
          console.log(`Created conversation between ${user1Id} and ${user2Id}`);
        } else {
          skippedConversations.push({ user1Id, user2Id });
          console.log(`Skipped existing conversation between ${user1Id} and ${user2Id}`);
        }
      }
    }

    console.log(`Group creation complete: ${createdConversations.length} new, ${skippedConversations.length} existing`);

    return NextResponse.json({ 
      message: 'Group chat created successfully',
      conversationsCreated: createdConversations.length,
      conversationsSkipped: skippedConversations.length
    });
  } catch (error) {
    console.error('Error creating group chat:', error);
    return NextResponse.json(
      { message: 'Failed to create group chat' },
      { status: 500 }
    );
  }
}
