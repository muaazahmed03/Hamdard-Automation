'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface Notification {
  id: number
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
  data?: any
}

interface GroupMessage {
  id: number
  groupId: string
  message: string
  senderId: string
  senderName: string
  timestamp: string
}

export const useSocket = (userId?: string, userRole?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([])
  const [privateMessages, setPrivateMessages] = useState<any[]>([])
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io({
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      timeout: 20000,
    })

    socketRef.current = socketInstance
    setSocket(socketInstance)

    // Connection events
    socketInstance.on('connect', () => {
      console.log('Connected to server')
      setConnected(true)
      
      // Join user room and role room if provided
      if (userId) {
        socketInstance.emit('join-user-room', userId)
      }
      if (userRole) {
        socketInstance.emit('join-role-room', userRole)
      }
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })

    // Handle notifications
    socketInstance.on('notification', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev])
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
        })
      }
    })

    // Handle group messages
    socketInstance.on('group-message', (message: GroupMessage) => {
      setGroupMessages(prev => [...prev, message])
    })

    // Handle private messages and delivery/read events centrally
    socketInstance.on('private-message', (msg: any) => {
      setPrivateMessages(prev => [...prev, msg])
    })

    socketInstance.on('private-message-sent', (payload: any) => {
      // Could be used to reconcile optimistic UI
      setPrivateMessages(prev => prev.map(m => m.clientTempId && payload.clientTempId && m.clientTempId === payload.clientTempId ? { ...m, ...payload } : m))
    })

    socketInstance.on('private-message-error', (err: any) => {
      if (err && err.message) {
        // Show a toast if available (window.toast or custom event)
        if (typeof window !== 'undefined' && (window as any).toast) {
          (window as any).toast({
            title: 'Message Failed',
            description: err.message,
            variant: 'destructive'
          });
        }
        // Only log unexpected errors
        if (err.message !== 'Failed to send message') {
          console.error('Private message error:', err.message);
        }
      }
    })

    // Handle welcome messages
    socketInstance.on('message', (message: any) => {
      console.log('Socket message:', message)
    })

    // Note: Notification permission is now requested via custom dialog in messages pages
    // This provides a better user experience with explanation before browser prompt

    return () => {
      socketInstance.disconnect()
    }
  }, [userId, userRole])

  // Helper functions
  const joinGroup = (groupId: string) => {
    if (socket) {
      socket.emit('join-group', groupId)
    }
  }

  const leaveGroup = (groupId: string) => {
    if (socket) {
      socket.emit('leave-group', groupId)
    }
  }

  const sendGroupMessage = (data: {
    groupId: string
    message: string
    senderId: string
    senderName: string
  }) => {
    if (socket) {
      socket.emit('group-message', data)
    }
  }

  const sendPrivateMessage = (data: { toUserId: string; content: string; senderId: string; senderName?: string; clientTempId?: string }) => {
    if (!socket) return
    socket.emit('private-message', data)
  }

  const sendNotification = (data: {
    userId?: string
    role?: string
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
  }) => {
    if (socket) {
      socket.emit('send-notification', data)
    }
  }

  const markNotificationAsRead = (notificationId: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    )
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length
  }

  const getGroupMessages = (groupId: string) => {
    return groupMessages.filter(msg => msg.groupId === groupId)
  }

  return {
    socket,
    connected,
    notifications,
    groupMessages,
    privateMessages,
    joinGroup,
    leaveGroup,
    sendGroupMessage,
    sendPrivateMessage,
    sendNotification,
    markNotificationAsRead,
    clearNotifications,
    getUnreadCount,
    getGroupMessages,
  }
}