import { db } from './db';
import fs from 'fs';
import path from 'path';

// Get system settings for notification preferences
function getSystemSettings() {
  try {
    const settingsFile = path.join(process.cwd(), 'data', 'system-settings.json');
    if (fs.existsSync(settingsFile)) {
      const data = fs.readFileSync(settingsFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading settings:', error);
  }
  return {
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      deadlineReminders: true,
      approvalNotifications: true
    }
  };
}

interface NotificationData {
  userId: string | string[];
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  category?: string;
}

// Create notification for user(s)
export async function createNotification(data: NotificationData) {
  try {
    const settings = getSystemSettings();
    const { notifications: notifSettings } = settings;

    // Check if this is an approval notification - always create these
    const isApprovalNotification = data.category === 'approval';
    const isMessageNotification = data.category === 'message';
    
    console.log('Creating notification:', {
      category: data.category,
      isMessageNotification,
      title: data.title,
      userId: data.userId
    });
    
    // Always create message and approval notifications
    if (!isApprovalNotification && !isMessageNotification && !notifSettings.pushNotifications) {
      console.log('Push notifications disabled');
      return;
    }
    
    // For approval notifications, also check if approval notifications setting is enabled
    if (isApprovalNotification && !notifSettings.approvalNotifications) {
      console.log('Approval notifications disabled in settings');
      // Still create the notification in database, just log it
    }

    const userIds = Array.isArray(data.userId) ? data.userId : [data.userId];

    const notifications = await Promise.all(
      userIds.map(userId =>
        db.notification.create({
          data: {
            userId,
            title: data.title,
            message: data.message,
            type: (data.category || 'info').toUpperCase(), // Store category as type (MESSAGE, GROUP_REQUEST, etc.)
            relatedId: data.link || data.category || 'message',
            isRead: false
          }
        })
      )
    );

    console.log(`✅ Created ${notifications.length} notification(s) for message`);

    // Send email notification if enabled
    if (notifSettings.emailNotifications && data.category !== 'general') {
      await sendEmailNotification(userIds, data);
    }

    return notifications;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Send email notification (placeholder - would need email service)
async function sendEmailNotification(userIds: string[], data: NotificationData) {
  try {
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { email: true, name: true }
    });

    // Here you would integrate with email service (SendGrid, AWS SES, etc.)
    console.log('Email notification would be sent to:', users.map(u => u.email));
    console.log('Subject:', data.title);
    console.log('Message:', data.message);
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

// Notification templates for different activities
export const NotificationTemplates = {
  // User management
  userApproved: (userName: string) => ({
    title: 'Account Approved',
    message: `Your account has been approved. You can now access all features.`,
    type: 'success' as const,
    category: 'approval'
  }),

  userRejected: (userName: string) => ({
    title: 'Account Status Update',
    message: `Your account registration has been reviewed. Please contact administration for more information.`,
    type: 'warning' as const,
    category: 'approval'
  }),

  // Project notifications
  projectCreated: (projectTitle: string, studentName: string) => ({
    title: 'New Project Created',
    message: `${studentName} has created a new project: "${projectTitle}"`,
    type: 'info' as const,
    category: 'project'
  }),

  projectApproved: (projectTitle: string) => ({
    title: 'Project Approved',
    message: `Your project "${projectTitle}" has been approved!`,
    type: 'success' as const,
    category: 'project'
  }),

  projectRejected: (projectTitle: string, reason?: string) => ({
    title: 'Project Review Needed',
    message: `Your project "${projectTitle}" requires revision. ${reason || 'Please check with your supervisor.'}`,
    type: 'warning' as const,
    category: 'project'
  }),

  projectStatusChanged: (projectTitle: string, newStatus: string) => ({
    title: 'Project Status Updated',
    message: `Project "${projectTitle}" status changed to: ${newStatus}`,
    type: 'info' as const,
    category: 'project'
  }),

  // Group/Supervision notifications
  groupInviteReceived: (groupName: string, inviterName: string) => ({
    title: 'Group Invitation',
    message: `${inviterName} has invited you to join group "${groupName}"`,
    type: 'info' as const,
    category: 'group',
    link: '/student?section=group'
  }),

  groupInviteAccepted: (studentName: string, groupName: string) => ({
    title: 'Invitation Accepted',
    message: `${studentName} has accepted your invitation to join "${groupName}"`,
    type: 'success' as const,
    category: 'group'
  }),

  groupInviteRejected: (studentName: string, groupName: string) => ({
    title: 'Invitation Declined',
    message: `${studentName} has declined your invitation to join "${groupName}"`,
    type: 'info' as const,
    category: 'group'
  }),

  supervisionRequestReceived: (studentName: string, projectTitle: string) => ({
    title: 'New Supervision Request',
    message: `${studentName} has requested your supervision for "${projectTitle}"`,
    type: 'info' as const,
    category: 'supervision',
    link: '/teacher?section=supervision'
  }),

  supervisionRequestAccepted: (teacherName: string) => ({
    title: 'Supervision Request Accepted',
    message: `${teacherName} has accepted your supervision request!`,
    type: 'success' as const,
    category: 'supervision'
  }),

  supervisionRequestRejected: (teacherName: string) => ({
    title: 'Supervision Request Update',
    message: `${teacherName} is unable to supervise your project at this time.`,
    type: 'warning' as const,
    category: 'supervision'
  }),

  // File notifications
  fileUploaded: (fileName: string, uploaderName: string, projectTitle: string) => ({
    title: 'New File Uploaded',
    message: `${uploaderName} uploaded "${fileName}" for project "${projectTitle}"`,
    type: 'info' as const,
    category: 'file'
  }),

  fileApproved: (fileName: string, approverName: string) => ({
    title: 'File Approved',
    message: `Your file "${fileName}" has been approved by ${approverName}`,
    type: 'success' as const,
    category: 'file'
  }),

  fileRejected: (fileName: string, approverName: string) => ({
    title: 'File Requires Revision',
    message: `Your file "${fileName}" was reviewed by ${approverName}. Please upload a revised version.`,
    type: 'warning' as const,
    category: 'file'
  }),

  // Committee notifications
  committeeCreated: (committeeName: string, creatorName: string) => ({
    title: 'New Committee Created',
    message: `${creatorName} has created a new committee: "${committeeName}"`,
    type: 'info' as const,
    category: 'committee'
  }),

  committeeAssigned: (committeeName: string, role: string) => ({
    title: 'Committee Assignment',
    message: `You have been assigned to "${committeeName}" as ${role}`,
    type: 'success' as const,
    category: 'committee'
  }),

  // Meeting notifications
  meetingScheduled: (meetingTitle: string, date: string, time: string) => ({
    title: 'Meeting Scheduled',
    message: `New meeting "${meetingTitle}" scheduled for ${date} at ${time}`,
    type: 'info' as const,
    category: 'meeting'
  }),

  meetingReminder: (meetingTitle: string, timeUntil: string) => ({
    title: 'Meeting Reminder',
    message: `Upcoming meeting "${meetingTitle}" starts in ${timeUntil}`,
    type: 'warning' as const,
    category: 'meeting'
  }),

  meetingCancelled: (meetingTitle: string) => ({
    title: 'Meeting Cancelled',
    message: `The meeting "${meetingTitle}" has been cancelled`,
    type: 'warning' as const,
    category: 'meeting'
  }),

  // Message notifications
  messageReceived: (senderName: string, preview: string) => ({
    title: 'New Message',
    message: `${senderName}: ${preview.substring(0, 50)}${preview.length > 50 ? '...' : ''}`,
    type: 'info' as const,
    category: 'message',
    link: '/messages'
  }),

  // Deadline notifications
  deadlineApproaching: (taskName: string, daysLeft: number) => ({
    title: 'Deadline Approaching',
    message: `"${taskName}" is due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    type: 'warning' as const,
    category: 'deadline'
  }),

  deadlineOverdue: (taskName: string) => ({
    title: 'Deadline Overdue',
    message: `"${taskName}" deadline has passed. Please submit as soon as possible.`,
    type: 'error' as const,
    category: 'deadline'
  }),

  // System notifications
  systemMaintenance: (startTime: string, duration: string) => ({
    title: 'Scheduled Maintenance',
    message: `System maintenance scheduled for ${startTime}. Expected duration: ${duration}`,
    type: 'warning' as const,
    category: 'system'
  }),

  accountLocked: (unlockTime: string) => ({
    title: 'Account Temporarily Locked',
    message: `Your account has been locked due to multiple failed login attempts. It will be unlocked at ${unlockTime}`,
    type: 'error' as const,
    category: 'security'
  })
};

// Helper function to notify multiple users by role
export async function notifyUsersByRole(role: string, notificationData: Omit<NotificationData, 'userId'>) {
  try {
    const roleUpper = role.toUpperCase() as 'ADMIN' | 'COMMITTEE_HEAD' | 'TEACHER' | 'STUDENT';
    const users = await db.user.findMany({
      where: { role: roleUpper },
      select: { id: true }
    });

    if (users.length === 0) {
      console.log(`No users found with role: ${role}`);
      return;
    }

    const userIds = users.map(u => u.id);
    return await createNotification({
      ...notificationData,
      userId: userIds
    });
  } catch (error) {
    console.error('Error notifying users by role:', error);
    throw error;
  }
}

// Helper function to notify supervisors
export async function notifySupervisors(projectId: string, notificationData: Omit<NotificationData, 'userId'>) {
  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        supervisor: true,
        teacher: true
      }
    });

    if (!project) {
      console.log(`Project not found: ${projectId}`);
      return;
    }

    const userIds: string[] = [];
    if (project.supervisorId) userIds.push(project.supervisorId);
    if (project.teacherId) userIds.push(project.teacherId);

    if (userIds.length > 0) {
      return await createNotification({
        ...notificationData,
        userId: userIds
      });
    }
  } catch (error) {
    console.error('Error notifying supervisors:', error);
    throw error;
  }
}

// Helper function to notify committee members
export async function notifyCommitteeMembers(committeeId: string, notificationData: Omit<NotificationData, 'userId'>) {
  try {
    // Note: Committee is stored in JSON file, not database
    // This is a placeholder - adjust based on your actual implementation
    console.log('Committee notification - implement based on your committee storage');
    
    // If you add Committee model to Prisma schema, uncomment:
    // const committee = await db.committee.findUnique({
    //   where: { id: committeeId },
    //   select: { headId: true }
    // });
    // if (committee?.headId) {
    //   return await createNotification({
    //     ...notificationData,
    //     userId: committee.headId
    //   });
    // }
  } catch (error) {
    console.error('Error notifying committee members:', error);
    throw error;
  }
}
