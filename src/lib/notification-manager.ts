'use client';

import { toast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'GROUP_REQUEST' | 'GROUP_REQUEST_ACCEPTED' | 'GROUP_REQUEST_REJECTED' | 'SUPERVISION_REQUEST' | 'MESSAGE' | 'MEETING' | 'PROJECT' | 'UPLOAD' | 'PROFILE_UPDATE';
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
}

class NotificationManager {
  private static instance: NotificationManager;
  private listeners: ((notifications: Notification[]) => void)[] = [];
  private notifications: Notification[] = [];

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
      // Initialize with sample notifications for demonstration
      NotificationManager.instance.initializeSampleNotifications();
    }
    return NotificationManager.instance;
  }

  private initializeSampleNotifications() {
    const sampleNotifications: Omit<Notification, 'id' | 'createdAt' | 'isRead'>[] = [
      {
        title: 'Welcome to FYP Portal',
        message: 'Get started by exploring project ideas and connecting with teachers.',
        type: 'MESSAGE',
      },
      {
        title: 'New Project Available',
        message: 'Check out the new AI-Powered Healthcare System project idea.',
        type: 'PROJECT',
      },
      {
        title: 'Meeting Reminder',
        message: 'Don\'t forget about your upcoming supervisor meeting.',
        type: 'MEETING',
      },
    ];

    sampleNotifications.forEach(notification => {
      this.notifications.push({
        ...notification,
        id: Date.now().toString() + Math.random(),
        createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(), // Random time in last 24h
        isRead: Math.random() > 0.5, // Random read status
      });
    });
  }

  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // More unique ID
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    this.notifications.unshift(newNotification);
    this.notifyListeners();

    // Also show toast for immediate feedback
    toast({
      title: notification.title,
      description: notification.message,
    });

    // In a real app, this would also send to backend
    this.saveToBackend(newNotification);
  }

  markAsRead(notificationIds: string[]) {
    this.notifications = this.notifications.map(notification =>
      notificationIds.includes(notification.id)
        ? { ...notification, isRead: true }
        : notification
    );
    this.notifyListeners();
  }

  markAllAsRead() {
    this.notifications = this.notifications.map(notification => ({
      ...notification,
      isRead: true,
    }));
    this.notifyListeners();
  }

  deleteNotifications(notificationIds: string[]) {
    this.notifications = this.notifications.filter(
      notification => !notificationIds.includes(notification.id)
    );
    this.notifyListeners();
  }

  clearAll() {
    this.notifications = [];
    this.notifyListeners();
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  private async saveToBackend(notification: Notification) {
    // In a real implementation, this would save to the backend
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'current-user',
        },
        body: JSON.stringify(notification),
      });
    } catch (error) {
      console.error('Error saving notification to backend:', error);
    }
  }

  // Convenience methods for common notification types
  notifyGroupRequest(fromUser: string, groupName: string) {
    this.addNotification({
      title: 'New Group Request',
      message: `${fromUser} sent you a request to join "${groupName}"`,
      type: 'GROUP_REQUEST',
      relatedId: groupName,
    });
  }

  notifyGroupRequestAccepted(groupName: string) {
    this.addNotification({
      title: 'Group Request Accepted',
      message: `Your request to join "${groupName}" has been accepted!`,
      type: 'GROUP_REQUEST_ACCEPTED',
      relatedId: groupName,
    });
  }

  notifyGroupRequestRejected(groupName: string) {
    this.addNotification({
      title: 'Group Request Rejected',
      message: `Your request to join "${groupName}" was rejected`,
      type: 'GROUP_REQUEST_REJECTED',
      relatedId: groupName,
    });
  }

  notifySupervisionRequest(teacherName: string) {
    this.addNotification({
      title: 'Supervision Request Sent',
      message: `Your supervision request has been sent to ${teacherName}`,
      type: 'SUPERVISION_REQUEST',
      relatedId: teacherName,
    });
  }

  notifyContactTeacher(teacherName: string, projectName: string) {
    this.addNotification({
      title: 'Contact Request Sent',
      message: `Your contact request for "${projectName}" has been sent to ${teacherName}`,
      type: 'PROJECT',
      relatedId: projectName,
    });
  }

  notifyMeetingScheduled(title: string, date: string, time: string) {
    this.addNotification({
      title: 'Meeting Scheduled',
      message: `Meeting "${title}" scheduled for ${date} at ${time}`,
      type: 'MEETING',
      relatedId: title,
    });
  }

  notifyFileUploaded(fileName: string, type: string) {
    this.addNotification({
      title: 'File Uploaded',
      message: `${type} "${fileName}" has been uploaded successfully`,
      type: 'UPLOAD',
      relatedId: fileName,
    });
  }

  notifyProfileUpdated() {
    this.addNotification({
      title: 'Profile Updated',
      message: 'Your profile has been updated successfully',
      type: 'PROFILE_UPDATE',
    });
  }

  notifyMessageReceived(fromUser: string, message: string) {
    this.addNotification({
      title: 'New Message',
      message: `${fromUser}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
      type: 'MESSAGE',
      relatedId: fromUser,
    });
  }
}

export const notificationManager = NotificationManager.getInstance();