'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bell, Check, Trash2, X, Users, UserPlus, MessageCircle, Calendar, CheckCheck, Upload, Settings } from 'lucide-react';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type?: string;
  category?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : null;
      if (!userId) return;

      const response = await fetch('/api/notifications', {
        headers: {
          'x-user-id': userId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data || []);
      } else {
        console.warn('Failed to fetch notifications:', response.status);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (notificationIds?: string[]) => {
    try {
      const userId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : null;
      if (!userId) return;

      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          markAll: !notificationIds,
          notificationIds: notificationIds,
        }),
      });

      if (response.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const deleteNotifications = async (notificationIds?: string[]) => {
    if (!notificationIds || notificationIds.length === 0) {
      // Show confirmation dialog for clearing all
      setShowClearConfirm(true);
      return;
    }

    try {
      const userId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : null;
      if (!userId) return;

      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          notificationIds: notificationIds,
        }),
      });

      if (response.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const confirmClearAll = async () => {
    try {
      const userId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : null;
      if (!userId) return;

      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          deleteAll: true,
        }),
      });

      if (response.ok) {
        await fetchNotifications();
        setShowClearConfirm(false);
        setOpen(false);
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'GROUP_REQUEST':
      case 'GROUP_REQUEST_ACCEPTED':
      case 'GROUP_REQUEST_REJECTED':
        return Users;
      case 'SUPERVISION_REQUEST':
        return UserPlus;
      case 'MESSAGE':
        return MessageCircle;
      case 'MEETING':
        return Calendar;
      case 'PROJECT':
        return CheckCheck;
      case 'UPLOAD':
        return Upload;
      case 'PROFILE_UPDATE':
        return Settings;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'GROUP_REQUEST':
        return 'bg-blue-100 text-blue-600';
      case 'GROUP_REQUEST_ACCEPTED':
        return 'bg-green-100 text-green-600';
      case 'GROUP_REQUEST_REJECTED':
        return 'bg-red-100 text-red-600';
      case 'SUPERVISION_REQUEST':
        return 'bg-purple-100 text-purple-600';
      case 'MESSAGE':
        return 'bg-yellow-100 text-yellow-600';
      case 'MEETING':
        return 'bg-indigo-100 text-indigo-600';
      case 'PROJECT':
        return 'bg-pink-100 text-pink-600';
      case 'UPLOAD':
        return 'bg-orange-100 text-orange-600';
      case 'PROFILE_UPDATE':
        return 'bg-teal-100 text-teal-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(!open)}
        className="relative flex items-center"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Notifications</span>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="ml-2 text-xs">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <>
          {/* Mobile: Full screen overlay */}
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 top-0 lg:absolute lg:right-0 lg:top-auto lg:mt-2 lg:inset-x-auto w-full lg:w-96 max-w-full lg:max-w-sm bg-white rounded-lg lg:rounded-lg shadow-lg border border-gray-200 z-50 lg:z-50 max-h-screen lg:max-h-[600px] flex flex-col">
            <Card className="flex flex-col h-full max-h-screen lg:max-h-[600px]">
              <CardHeader className="pb-2 sm:pb-3 flex-shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm sm:text-base md:text-lg">Notifications</CardTitle>
                  <div className="flex items-center gap-1 sm:gap-2">
                    {unreadCount > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsRead()}
                        className="text-[10px] sm:text-xs h-7 sm:h-8 px-1.5 sm:px-2"
                      >
                        <Check className="w-3 h-3 mr-0.5 sm:mr-1" />
                        <span className="hidden sm:inline">Mark all read</span>
                        <span className="sm:hidden">Read</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteNotifications()}
                      className="text-[10px] sm:text-xs h-7 sm:h-8 px-1.5 sm:px-2"
                    >
                      <Trash2 className="w-3 h-3 mr-0.5 sm:mr-1" />
                      <span className="hidden sm:inline">Clear all</span>
                      <span className="sm:hidden">Clear</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpen(false)}
                      className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                <div className="h-full overflow-y-auto overscroll-contain">
                  {loading ? (
                    <div className="p-4 text-center text-xs sm:text-sm text-gray-500">
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs sm:text-sm text-gray-500">
                      No notifications yet
                    </div>
                  ) : (
                    <div className="space-y-0.5 sm:space-y-1">
                      {notifications.map((notification) => {
                        const Icon = getNotificationIcon(notification.type);
                        return (
                          <div
                            key={notification.id}
                            className={`p-2 sm:p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                              !notification.isRead ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2 sm:gap-3">
                              <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                                  <p className={`text-xs sm:text-sm font-medium flex-1 ${
                                    !notification.isRead ? 'text-gray-900' : 'text-gray-600'
                                  }`}>
                                    {notification.title}
                                  </p>
                                  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                                    {!notification.isRead && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => markAsRead([notification.id])}
                                        className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                                      >
                                        <Check className="w-3 h-3" />
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => deleteNotifications([notification.id])}
                                      className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                <p className="text-[11px] sm:text-sm text-gray-600 mb-0.5 sm:mb-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-[10px] sm:text-xs text-gray-400">
                                  {new Date(notification.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Notifications</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to clear all notifications? This action cannot be undone.
          </DialogDescription>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmClearAll}>
              Clear All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}