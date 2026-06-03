import { Server } from 'socket.io';
import { db } from '@/lib/db';
import { createNotification, NotificationTemplates } from '@/lib/notification-service';

export const setupSocket = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join user to their personal room based on user ID
    socket.on('join-user-room', (userId: string) => {
      socket.data.userId = userId;
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined their room`);
      // Broadcast presence to others
      io.emit('presence-update', { userId, online: true });
    });

    // Join role-based rooms
    socket.on('join-role-room', (role: string) => {
      socket.join(`role-${role}`);
      console.log(`User with role ${role} joined role room`);
    });

    // Handle legacy message event (kept for compatibility)
    socket.on('message', (msg: { text: string; senderId: string }) => {
      socket.emit('message', {
        text: `Echo: ${msg.text}`,
        senderId: 'system',
        timestamp: new Date().toISOString(),
      });
    });

    // Handle private one-to-one messages
    socket.on('private-message', async (data: {
      toUserId: string;
      content: string;
      senderId: string;
      senderName?: string;
      clientTempId?: string;
    }) => {
      try {
        // Find or create conversation between sender and recipient
        let conversation = await db.conversation.findFirst({
          where: {
            participants: {
              every: {
                userId: { in: [data.senderId, data.toUserId] }
              }
            }
          }
        });

        if (!conversation) {
          conversation = await db.conversation.create({
            data: {
              participants: {
                createMany: {
                  data: [{ userId: data.senderId }, { userId: data.toUserId }]
                }
              }
            }
          });
        }

        // Persist message
        const message = await db.message.create({
          data: {
            conversationId: conversation.id,
            senderId: data.senderId,
            receiverId: data.toUserId,
            content: data.content,
            isRead: false,
          },
          include: { sender: { select: { id: true, name: true } } }
        });

        // Create notification for recipient
        const template = NotificationTemplates.messageReceived(
          message.sender.name || 'Someone',
          data.content
        );
        
        await createNotification({
          userId: data.toUserId,
          ...template,
        }).catch(err => console.error('Failed to create message notification:', err));

        const payload = {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          receiverId: message.receiverId,
          isRead: message.isRead,
          createdAt: message.createdAt,
          sender: {
            id: message.sender.id,
            name: message.sender.name,
          },
          clientTempId: data.clientTempId,
        };

        // Emit to recipient's personal room
        io.to(`user-${data.toUserId}`).emit('private-message', payload);

        // Fallback: also emit directly to any sockets that have socket.data.userId === toUserId
        try {
          for (const [id, s] of io.sockets.sockets) {
            // Note: s is a Socket instance
            // @ts-ignore
            if (s.data && s.data.userId === data.toUserId) {
              s.emit('private-message', payload);
            }
          }
        } catch (err) {
          console.warn('Error sending direct socket fallback:', err);
        }

        // Emit ack to sender
        socket.emit('private-message-sent', payload);
      } catch (err) {
        console.error('Error handling private-message:', err);
        socket.emit('private-message-error', { message: 'Failed to send message' });
      }
    });

    // Handle group chat messages
    socket.on('group-message', async (data: { 
      groupId: string; 
      message: string; 
      senderId: string; 
      senderName: string; 
    }) => {
      try {
        // Get conversation details to find all participants
        const conversation = await db.conversation.findUnique({
          where: { id: data.groupId },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        });

        if (!conversation) {
          console.error('Conversation not found:', data.groupId);
          return;
        }

        // Find a participant to use as receiver for message storage
        // (Group messages still need a receiverId in the current schema)
        const otherParticipant = conversation.participants.find(p => p.userId !== data.senderId);
        const receiverId = otherParticipant?.userId || data.senderId;

        // Persist message to database
        const message = await db.message.create({
          data: {
            conversationId: data.groupId,
            senderId: data.senderId,
            receiverId: receiverId,
            content: data.message,
            isRead: false,
          }
        });

        const messageData = {
          id: message.id,
          groupId: data.groupId,
          message: data.message,
          senderId: data.senderId,
          senderName: data.senderName,
          timestamp: message.createdAt.toISOString(),
        };
        
        // Send to all members of the group
        io.to(`group-${data.groupId}`).emit('group-message', messageData);

        // Create notifications for all participants except sender
        const recipientIds = conversation.participants
          .filter(p => p.userId !== data.senderId)
          .map(p => p.userId);

        const template = NotificationTemplates.messageReceived(
          data.senderName,
          data.message
        );

        for (const recipientId of recipientIds) {
          await createNotification({
            userId: recipientId,
            ...template,
          }).catch(err => console.error('Failed to create group message notification:', err));
        }
      } catch (err) {
        console.error('Error handling group-message:', err);
      }
    });

    // Join group room
    socket.on('join-group', (groupId: string) => {
      socket.join(`group-${groupId}`);
      console.log(`User joined group ${groupId}`);
    });

    // Leave group room
    socket.on('leave-group', (groupId: string) => {
      socket.leave(`group-${groupId}`);
      console.log(`User left group ${groupId}`);
    });

    // Handle system notifications
    socket.on('send-notification', (data: {
      userId?: string;
      role?: string;
      type: 'info' | 'success' | 'warning' | 'error';
      title: string;
      message: string;
    }) => {
      const notification = {
        id: Date.now(),
        type: data.type,
        title: data.title,
        message: data.message,
        timestamp: new Date().toISOString(),
        read: false
      };

      if (data.userId) {
        // Send to specific user
        io.to(`user-${data.userId}`).emit('notification', notification);
      } else if (data.role) {
        // Send to all users with specific role
        io.to(`role-${data.role}`).emit('notification', notification);
      } else {
        // Send to all connected users
        io.emit('notification', notification);
      }
    });

    // Handle meeting notifications
    socket.on('meeting-scheduled', (data: {
      supervisorId: string;
      studentId: string;
      meeting: any;
    }) => {
      const notification = {
        id: Date.now(),
        type: 'info',
        title: 'New Meeting Scheduled',
        message: `Meeting "${data.meeting.title}" has been scheduled`,
        timestamp: new Date().toISOString(),
        read: false,
        data: data.meeting
      };

      // Send to both supervisor and student
      io.to(`user-${data.supervisorId}`).emit('notification', notification);
      io.to(`user-${data.studentId}`).emit('notification', notification);
    });

    // Handle project status updates
    socket.on('project-update', (data: {
      studentIds: string[];
      update: any;
    }) => {
      const notification = {
        id: Date.now(),
        type: 'success',
        title: 'Project Update',
        message: data.update.message,
        timestamp: new Date().toISOString(),
        read: false,
        data: data.update
      };

      // Send to all students in the project
      data.studentIds.forEach(studentId => {
        io.to(`user-${studentId}`).emit('notification', notification);
      });
    });

    // Handle supervisor request notifications
    socket.on('supervisor-request', (data: {
      supervisorId: string;
      request: any;
    }) => {
      const notification = {
        id: Date.now(),
        type: 'info',
        title: 'New Supervisor Request',
        message: `${data.request.studentName} has requested supervision`,
        timestamp: new Date().toISOString(),
        read: false,
        data: data.request
      };

      io.to(`user-${data.supervisorId}`).emit('notification', notification);
    });

    // Handle group request notifications
    socket.on('group-request', (data: {
      groupLeaderId: string;
      request: any;
    }) => {
      const notification = {
        id: Date.now(),
        type: 'info',
        title: 'New Group Request',
        message: `${data.request.studentName} wants to join your group`,
        timestamp: new Date().toISOString(),
        read: false,
        data: data.request
      };

      io.to(`user-${data.groupLeaderId}`).emit('notification', notification);
    });

    // Handle message delivered/read acknowledgements from clients
    socket.on('message-delivered', async (data: { messageId: string; toUserId: string; fromUserId: string }) => {
      try {
        // Forward delivered event to sender
        io.to(`user-${data.fromUserId}`).emit('message-delivered', { messageId: data.messageId, toUserId: data.toUserId });
      } catch (err) {
        console.error('Error handling message-delivered', err);
      }
    });

    socket.on('message-read', async (data: { messageIds: string[]; fromUserId: string; toUserId: string }) => {
      try {
        // Mark messages as read in DB
        await db.message.updateMany({
          where: { id: { in: data.messageIds } },
          data: { isRead: true }
        });

        // Notify sender that messages were read
        io.to(`user-${data.fromUserId}`).emit('message-read', { messageIds: data.messageIds, byUserId: data.toUserId });
      } catch (err) {
        console.error('Error handling message-read', err);
      }
    });

    socket.on('mark-messages-read', async (data: { conversationId?: string; userId: string; fromUserId: string }) => {
      try {
        // Mark all unread messages from the sender as read
        const result = await db.message.updateMany({
          where: {
            senderId: data.fromUserId,
            receiverId: data.userId,
            isRead: false
          },
          data: { isRead: true }
        });

        // Get the IDs of the updated messages to notify sender
        if (result.count > 0) {
          const updatedMessages = await db.message.findMany({
            where: {
              senderId: data.fromUserId,
              receiverId: data.userId,
              isRead: true
            },
            select: { id: true }
          });

          const messageIds = updatedMessages.map(m => m.id);
          
          // Notify sender that messages were read
          io.to(`user-${data.fromUserId}`).emit('message-read', { 
            messageIds, 
            byUserId: data.userId 
          });
        }
      } catch (err) {
        console.error('Error marking messages as read', err);
      }
    });

    // Handle disconnect — announce offline presence if we know userId
    socket.on('disconnect', () => {
      const uid = socket.data.userId as string | undefined;
      if (uid) {
        io.emit('presence-update', { userId: uid, online: false });
      }
      console.log('Client disconnected:', socket.id);
    });

    // Send welcome message
    socket.emit('message', {
      text: 'Welcome to FYP Automation System Real-time Notifications!',
      senderId: 'system',
      timestamp: new Date().toISOString(),
    });
  });
};

// Helper functions to send notifications from server-side
export const sendNotification = (
  io: Server,
  data: {
    userId?: string;
    role?: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
  }
) => {
  const notification = {
    id: Date.now(),
    type: data.type,
    title: data.title,
    message: data.message,
    timestamp: new Date().toISOString(),
    read: false
  };

  if (data.userId) {
    io.to(`user-${data.userId}`).emit('notification', notification);
  } else if (data.role) {
    io.to(`role-${data.role}`).emit('notification', notification);
  } else {
    io.emit('notification', notification);
  }
};

export const sendMeetingNotification = (
  io: Server,
  supervisorId: string,
  studentId: string,
  meeting: any
) => {
  const notification = {
    id: Date.now(),
    type: 'info',
    title: 'New Meeting Scheduled',
    message: `Meeting "${meeting.title}" has been scheduled`,
    timestamp: new Date().toISOString(),
    read: false,
    data: meeting
  };

  io.to(`user-${supervisorId}`).emit('notification', notification);
  io.to(`user-${studentId}`).emit('notification', notification);
};