'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Search, Trash2, Check, CheckCheck, AlertTriangle, Paperclip, X as XIcon, Megaphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useSocket } from '@/hooks/use-socket';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { FileAttachment } from '@/components/file-attachment';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  isRead: boolean;
  createdAt: Date;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  deletedAt?: Date | null;
  sender: {
    name: string;
    profileImage?: string;
  };
  clientTempId?: string;
  delivered?: boolean;
  read?: boolean;
}

interface ChatUser {
  id: string;
  name: string;
  role: 'student' | 'teacher';
  profileImage?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  conversationId?: string;
  email?: string;
  rollNumber?: string;
  department?: string;
  gpa?: number;
  skills?: string[];
  interests?: string[];
  designation?: string;
  officeHours?: string;
  specialization?: string;
  isGroupMember?: boolean;
}


export default function CommitteeHeadMessagesPage() {
  const { toast } = useToast();
  const [selectedChat, setSelectedChat] = useState<ChatUser | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role?: string } | null>(null);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);

  const { socket, sendPrivateMessage } = useSocket(currentUser?.id, currentUser?.role);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [newChatQuery, setNewChatQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<any | null>(null);
  const [searchType, setSearchType] = useState<'students' | 'all'>('students');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<ChatUser | null>(null);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileData, setUploadedFileData] = useState<any>(null);
  
  // Announcement states
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState('NORMAL');
  const [announcementExpiry, setAnnouncementExpiry] = useState('');

  const formatTime = (date: Date) => {
    return date instanceof Date ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : new Date(date).toLocaleTimeString();
  };

  const formatLastMessageTime = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Initialize current user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setCurrentUser({ id: parsed.id || parsed.userId || parsed._id, name: parsed.name, role: parsed.role });
      } catch (err) {
        console.warn('Failed to parse user from localStorage', err);
      }
    }
  }, []);

  // Check notification permission and show custom dialog
  useEffect(() => {
    const checkNotificationPermission = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        // Show custom dialog after a short delay
        const timer = setTimeout(() => {
          setNotificationDialogOpen(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    };
    checkNotificationPermission();
  }, []);

  const handleAllowNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: "Notifications enabled",
          description: "You'll receive notifications for new messages",
        });
      }
    } catch (err) {
      console.error('Notification permission error:', err);
    } finally {
      setNotificationDialogOpen(false);
    }
  };

  const handleBlockNotifications = () => {
    setNotificationDialogOpen(false);
    toast({
      title: "Notifications disabled",
      description: "You can enable them later in your browser settings",
    });
  };

  // Load conversations from API
  useEffect(() => {
    if (!currentUser) return;
    const fetchConversations = async () => {
      try {
        const res = await fetch('/api/messages/conversations', { headers: { 'x-user-id': currentUser.id } });
        if (res.ok) {
          const data = await res.json();
          const users = data.map((c: any) => ({
            id: c.participantId,
            name: c.participantName,
            role: c.participantRole?.toLowerCase() || 'student',
            profileImage: c.profileImage,
            lastMessage: c.lastMessage,
            lastMessageTime: formatLastMessageTime(c.lastMessageTime),
            unreadCount: c.unreadCount,
            isOnline: c.isOnline,
            conversationId: c.id,
          }));
          setChatUsers(users);
        }
      } catch (err) {
        console.error('Failed to fetch conversations', err);
      }
    };
    fetchConversations();
  }, [currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages when a chat is selected
  useEffect(() => {
    if (!selectedChat || !currentUser) return;
    
    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/messages/${selectedChat.id}`, {
          headers: { 'x-user-id': currentUser.id }
        });
        
        if (response.ok) {
          const data = await response.json();
          // API returns array of messages directly
          if (Array.isArray(data)) {
            setMessages(data.map((m: any) => ({
              ...m,
              createdAt: new Date(m.createdAt)
            })));
          }
          
          // Mark messages as read via socket
          if (socket) {
            socket.emit('mark-messages-read', { 
              userId: currentUser.id,
              fromUserId: selectedChat.id
            });
          }
          
          // Update unread count locally
          setChatUsers(prev => prev.map(u => 
            u.id === selectedChat.id ? { ...u, unreadCount: 0 } : u
          ));
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };
    
    loadMessages();
  }, [selectedChat?.id, currentUser?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // send message: optimistic UI, socket emit and API fallback
  const sendMessage = async () => {
    if (!selectedChat || !currentUser) return;
    if (!message.trim() && !uploadedFileData) return;

    const content = message.trim() || (uploadedFileData ? '📎 File attachment' : '');
    const tempId = `temp-${Date.now().toString()}`;
    const localMsg: Message = {
      id: tempId,
      clientTempId: tempId,
      content,
      senderId: currentUser.id,
      receiverId: selectedChat.id,
      isRead: false,
      createdAt: new Date(),
      sender: { name: 'You' },
      delivered: false,
      read: false,
      fileUrl: uploadedFileData?.fileUrl,
      fileName: uploadedFileData?.fileName,
      fileType: uploadedFileData?.fileType,
      fileSize: uploadedFileData?.fileSize,
    };

    setMessages(prev => [...prev, localMsg]);
    setMessage('');
    const fileData = uploadedFileData;
    clearFile();

    // Only use socket OR API, not both to prevent double messages
    if (socket) {
      socket.emit('private-message', {
        toUserId: selectedChat.id,
        content,
        senderId: currentUser.id,
        senderName: currentUser.name,
        clientTempId: tempId,
        fileUrl: fileData?.fileUrl,
        fileName: fileData?.fileName,
        fileType: fileData?.fileType,
        fileSize: fileData?.fileSize,
      });
    } else {
      // Fallback to API only if socket is not available
      try {
        const payload: any = { content };
        if (fileData) {
          payload.fileUrl = fileData.fileUrl;
          payload.fileName = fileData.fileName;
          payload.fileType = fileData.fileType;
          payload.fileSize = fileData.fileSize;
        }
        await fetch(`/api/messages/${selectedChat.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error('Failed to persist message', err);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setUploadedFileData(data);
        toast({
          title: "File uploaded",
          description: "Ready to send"
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive"
      });
      setSelectedFile(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadedFileData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteMessage = async (messageId: string, senderId: string) => {
    if (!currentUser) return;
    
    if (senderId !== currentUser.id) {
      toast({
        title: "Cannot delete",
        description: "You can only delete your own messages",
        variant: "destructive"
      });
      return;
    }

    try {
      const res = await fetch(`/api/messages/delete/${messageId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.id
        }
      });

      if (res.ok) {
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, content: '[Message deleted]', deletedAt: new Date() }
            : m
        ));
        
        if (socket) {
          socket.emit('message-deleted', {
            messageId,
            toUserId: senderId === currentUser.id ? selectedChat?.id : currentUser.id
          });
        }

        toast({
          title: "Message deleted",
          description: "The message has been removed"
        });
      }
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both title and content",
        variant: "destructive"
      });
      return;
    }

    if (!currentUser) return;

    try {
      const payload: any = {
        title: announcementTitle,
        content: announcementContent,
        priority: announcementPriority
      };

      if (announcementExpiry) {
        payload.expiresAt = new Date(announcementExpiry).toISOString();
      }

      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast({
          title: "Announcement created!",
          description: "All users have been notified"
        });
        
        // Reset form
        setAnnouncementTitle('');
        setAnnouncementContent('');
        setAnnouncementPriority('NORMAL');
        setAnnouncementExpiry('');
        setIsAnnouncementDialogOpen(false);
      } else {
        throw new Error('Failed to create announcement');
      }
    } catch (error) {
      toast({
        title: "Failed to create announcement",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = chatUsers.filter(user => user.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Socket: incoming private messages
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleIncoming = (msg: any) => {
      if (msg.receiverId === currentUser.id) {
        // emit delivery ack back to server
        if (socket) socket.emit('message-delivered', { messageId: msg.id, toUserId: msg.receiverId, fromUserId: msg.senderId });
        if (selectedChat && msg.senderId === selectedChat.id) {
          // Check if message already exists to prevent duplicates
          setMessages(prev => {
            const exists = prev.some(m => m.id === msg.id || (m.clientTempId && m.clientTempId === msg.clientTempId));
            if (exists) return prev;
            return [...prev, { ...msg, createdAt: new Date(msg.createdAt) }];
          });
        } else {
          setChatUsers(prev => prev.map(u => u.id === msg.senderId ? { ...u, lastMessage: msg.content, unreadCount: (u.unreadCount || 0) + 1 } : u));
        }
      }
    };

    socket.on('private-message', handleIncoming);
    socket.on('private-message-sent', (payload: any) => {
      // Match optimistic message by clientTempId if present and update it
      if (payload.clientTempId) {
        setMessages(prev => {
          const alreadyHasRealId = prev.some(m => m.id === payload.id && !m.clientTempId);
          if (alreadyHasRealId) return prev; // Prevent duplicate
          return prev.map(m => m.clientTempId === payload.clientTempId ? { ...m, id: payload.id, createdAt: new Date(payload.createdAt), delivered: true } : m);
        });
      } else {
        // otherwise mark last message as delivered if sender
        setMessages(prev => prev.map(m => m.id === payload.id ? { ...m, delivered: true } : m));
      }
    });

    socket.on('message-delivered', (data: any) => {
      // mark message delivered locally
      setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, delivered: true } : m));
    });

    socket.on('message-read', (data: any) => {
      // mark messages read locally
      setMessages(prev => prev.map(m => data.messageIds.includes(m.id) ? { ...m, read: true, delivered: true } : m));
      // also update chatUsers unread counts
      if (data.byUserId) {
        setChatUsers(prev => prev.map(u => u.id === data.byUserId ? { ...u, unreadCount: 0 } : u));
      }
    });

    return () => {
      socket.off('private-message', handleIncoming);
      socket.off('private-message-sent');
      socket.off('message-delivered');
      socket.off('message-read');
    };
  }, [socket, currentUser, selectedChat]);

  // Presence updates
  useEffect(() => {
    if (!socket) return;
    const handlePresence = (p: { userId: string; online: boolean }) => {
      setChatUsers(prev => prev.map(u => u.id === p.userId ? { ...u, isOnline: p.online } : u));
    };
    socket.on('presence-update', handlePresence);
    return () => { socket.off('presence-update', handlePresence); };
  }, [socket]);

  // Search users for New Chat modal
  useEffect(() => {
    let cancel = false;
    if (!isNewChatOpen || !currentUser) return;
    const load = async () => {
      try {
        let users: any[] = [];
        let groupMembers: any[] = [];
        
        // Always fetch group members first
        try {
          const groupResponse = await fetch(`/api/groups/members`, {
            headers: { 'x-user-id': currentUser.id }
          });
          if (groupResponse.ok) {
            groupMembers = await groupResponse.json();
          }
        } catch (err) {
          console.warn('Failed to fetch group members', err);
        }
        
        if (searchType === 'students') {
          // Search only students (group members)
          const params = new URLSearchParams();
          if (newChatQuery.trim()) {
            params.append('query', newChatQuery.trim());
            params.append('type', 'name');
          }
          
          const response = await fetch(`/api/students/search?${params.toString()}`, {
            headers: {
              'x-user-id': currentUser.id
            }
          });
          
          if (response.ok) {
            users = await response.json();
          }
        } else {
          // Search all users (students + teachers)
          const params = new URLSearchParams();
          if (newChatQuery.trim()) {
            params.append('query', newChatQuery.trim());
          }
          
          const response = await fetch(`/api/users/search?${params.toString()}`, {
            headers: {
              'x-user-id': currentUser.id
            }
          });
          
          if (response.ok) {
            users = await response.json();
          }
        }
        
        // Mark group members
        const groupMemberIds = new Set(groupMembers.map((m: any) => m.id));
        
        const combined: ChatUser[] = users.map((u: any) => ({
          id: u.id,
          name: u.name,
          role: u.role?.toLowerCase() === 'student' ? 'student' : (u.role?.toLowerCase() === 'teacher' ? 'teacher' : 'student'),
          profileImage: u.profileImage,
          email: u.email,
          rollNumber: u.rollNumber,
          department: u.department,
          gpa: u.gpa,
          skills: u.skills,
          interests: u.interests,
          isGroupMember: groupMemberIds.has(u.id)
        }));
        
        // Sort: group members first, then others
        combined.sort((a, b) => {
          if (a.isGroupMember && !b.isGroupMember) return -1;
          if (!a.isGroupMember && b.isGroupMember) return 1;
          return 0;
        });
        
        if (!cancel) setSearchResults(combined);
      } catch (err) {
        console.error('Failed to search users', err);
        if (!cancel) setSearchResults([]);
      }
    };
    load();
    return () => { cancel = true; }
  }, [isNewChatOpen, newChatQuery, currentUser, searchType]);

  // Handle delete conversation
  const handleDeleteConversation = async () => {
    if (!conversationToDelete || !currentUser) return;
    
    if (!conversationToDelete.conversationId) {
      toast({ title: 'Error', description: 'No conversation id available', variant: 'destructive' });
      setDeleteDialogOpen(false);
      return;
    }
    
    try {
      const res = await fetch(`/api/messages/conversations/${conversationToDelete.conversationId}`, { 
        method: 'DELETE', 
        headers: { 'x-user-id': currentUser.id } 
      });
      
      if (res.ok) {
        setChatUsers(prev => prev.filter(u => u.id !== conversationToDelete.id));
        if (selectedChat?.id === conversationToDelete.id) {
          setSelectedChat(null);
          setMessages([]);
        }
        toast({ 
          title: 'Success', 
          description: 'Conversation deleted successfully',
        });
      } else {
        toast({ 
          title: 'Error', 
          description: 'Failed to delete conversation', 
          variant: 'destructive' 
        });
      }
    } catch (err) {
      console.error(err);
      toast({ 
        title: 'Error', 
        description: 'Failed to delete conversation', 
        variant: 'destructive' 
      });
    } finally {
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar */}
      <div className="w-full md:w-96 bg-white border-r border-gray-200 flex flex-col shadow-lg">
        {/* New Chat Modal */}
        <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Start New Chat</DialogTitle>
              <DialogDescription>Search for students or all users to start a conversation</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Search Type Toggle */}
              <div className="flex space-x-2">
                <Button
                  variant={searchType === 'students' ? 'default' : 'outline'}
                  onClick={() => setSearchType('students')}
                  className="flex-1"
                >
                  Students Only
                </Button>
                <Button
                  variant={searchType === 'all' ? 'default' : 'outline'}
                  onClick={() => setSearchType('all')}
                  className="flex-1"
                >
                  All Users
                </Button>
              </div>
              
              <Input 
                placeholder={searchType === 'students' ? "Search students by name..." : "Search all users by name..."} 
                value={newChatQuery} 
                onChange={(e) => setNewChatQuery(e.target.value)} 
              />
              <div className="space-y-2 max-h-80 overflow-auto">
                {searchResults.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                    <div 
                      className="flex items-center space-x-3 flex-1 cursor-pointer"
                      onClick={() => {
                        setProfileUser(u);
                        setIsProfileOpen(true);
                      }}
                    >
                      <Avatar>
                        <AvatarImage src={u.profileImage} />
                        <AvatarFallback>
                          {u.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{u.name}</div>
                          {u.isGroupMember && (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">
                              Group Member
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {u.role} {u.rollNumber ? `• ${u.rollNumber}` : ''} {u.department ? `• ${u.department}` : ''}
                        </div>
                        {u.gpa && (
                          <div className="text-xs text-muted-foreground">GPA: {u.gpa}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <Button size="sm" onClick={async () => {
                        if (!currentUser) return;
                        try {
                          // Create/get conversation
                          const convResponse = await fetch(`/api/messages/${u.id}`, { 
                            headers: { 'x-user-id': currentUser.id } 
                          });
                          
                          if (!convResponse.ok) {
                            toast({
                              title: "Error",
                              description: "Failed to start conversation",
                              variant: "destructive"
                            });
                            return;
                          }

                          const convData = await convResponse.json();
                          
                          // Refresh conversations list
                          const convs = await fetch('/api/messages/conversations', { 
                            headers: { 'x-user-id': currentUser.id } 
                          });
                          
                          if (convs.ok) {
                            const data = await convs.json();
                            const users = data.map((c: any) => ({
                              id: c.participantId,
                              name: c.participantName,
                              role: c.participantRole === 'student' ? 'student' : 'teacher',
                              profileImage: c.profileImage,
                              lastMessage: c.lastMessage,
                              lastMessageTime: formatLastMessageTime(c.lastMessageTime),
                              unreadCount: c.unreadCount,
                              isOnline: c.isOnline,
                              conversationId: c.id,
                            }));
                            setChatUsers(users);
                            
                            // Select the chat and load messages
                            const newChat = users.find((x: any) => x.id === u.id);
                            if (newChat) {
                              setSelectedChat(newChat);
                              
                              // Load messages - API returns array directly
                              if (Array.isArray(convData)) {
                                setMessages(convData.map((m: any) => ({
                                  ...m,
                                  createdAt: new Date(m.createdAt)
                                })));
                              } else {
                                setMessages([]);
                              }
                              
                              // Join socket room for real-time updates
                              if (socket && currentUser) {
                                socket.emit('join-user-room', currentUser.id);
                              }
                            }
                            
                            setIsNewChatOpen(false);
                            
                            toast({
                              title: "Chat started",
                              description: `You can now chat with ${u.name}`,
                            });
                          }
                        } catch (err) {
                          console.error('Error starting chat:', err);
                          toast({
                            title: "Error",
                            description: "Failed to start chat. Please try again.",
                            variant: "destructive"
                          });
                        }
                      }}>Start Chat</Button>
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    {newChatQuery.trim() ? 'No users found. Try a different search.' : 'Start typing to search...'}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Profile Modal */}
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>User Profile</DialogTitle>
            </DialogHeader>
            {profileUser && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={profileUser.profileImage} />
                    <AvatarFallback className="text-2xl">
                      {profileUser.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{profileUser.name}</h3>
                    <Badge variant={profileUser.role === 'teacher' ? 'default' : 'secondary'}>
                      {profileUser.role === 'teacher' ? 'Teacher' : 'Student'}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {profileUser.email && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p>{profileUser.email}</p>
                    </div>
                  )}
                  
                  {/* Student-specific fields */}
                  {profileUser.role === 'student' && (
                    <>
                      {profileUser.rollNumber && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Roll Number</p>
                          <p>{profileUser.rollNumber}</p>
                        </div>
                      )}
                      
                      {profileUser.department && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Department</p>
                          <p>{profileUser.department}</p>
                        </div>
                      )}
                      
                      {profileUser.gpa && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">GPA</p>
                          <p>{profileUser.gpa}</p>
                        </div>
                      )}
                      
                      {profileUser.skills && profileUser.skills.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Skills</p>
                          <div className="flex flex-wrap gap-1">
                            {profileUser.skills.map((skill: string, idx: number) => (
                              <Badge key={idx} variant="outline">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {profileUser.interests && profileUser.interests.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Interests</p>
                          <div className="flex flex-wrap gap-1">
                            {profileUser.interests.map((interest: string, idx: number) => (
                              <Badge key={idx} variant="secondary">{interest}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Teacher-specific fields */}
                  {profileUser.role === 'teacher' && (
                    <>
                      {profileUser.designation && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Designation</p>
                          <p>{profileUser.designation}</p>
                        </div>
                      )}
                      
                      {profileUser.specialization && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Specialization</p>
                          <p>{profileUser.specialization}</p>
                        </div>
                      )}
                      
                      {profileUser.officeHours && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Office Hours</p>
                          <p>{profileUser.officeHours}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* Header */}
        <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
          <div className="flex items-center justify-between mb-4">
            <Link href="/committee-head" prefetch={true}>
              <Button variant="outline" size="default" className="font-semibold hover:bg-gray-100">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="default" 
                onClick={() => setIsAnnouncementDialogOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 font-bold text-white shadow-md hover:shadow-lg transition-all"
              >
                <Megaphone className="w-5 h-5 mr-2" />
                Announcement
              </Button>
              <Button 
                variant="default" 
                size="default" 
                onClick={() => setIsNewChatOpen(true)}
                className="bg-green-600 hover:bg-green-700 font-bold text-white shadow-md hover:shadow-lg transition-all"
              >
                + New Chat
              </Button>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Messages</h1>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1">
          <div className="p-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className={`flex gap-3 p-3 rounded-xl mb-2 transition-all cursor-pointer ${selectedChat?.id === user.id ? 'bg-blue-50 border-l-4 border-blue-600 shadow-md' : 'hover:bg-gray-50 hover:shadow-sm'}`}>
                {/* Avatar */}
                <div 
                  className="relative flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileUser(user);
                    setIsProfileOpen(true);
                  }}
                >
                  <Avatar className="cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all w-10 h-10">
                    <AvatarImage src={user.profileImage} />
                    <AvatarFallback>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0" onClick={async () => {
                  setSelectedChat(user);
                  if (!currentUser) return;
                  try {
                    const res = await fetch(`/api/messages/${user.id}`, { headers: { 'x-user-id': currentUser.id } });
                    if (res.ok) {
                      const msgs = await res.json();
                      const formatted = msgs.map((m: any) => ({ ...m, createdAt: new Date(m.createdAt) }));
                      setMessages(formatted);
                      setChatUsers(prev => prev.map(u => u.id === user.id ? { ...u, unreadCount: 0 } : u));

                      // Notify sender(s) that messages were read
                      const unreadFromUser = formatted.filter((m: any) => !m.isRead && m.senderId === user.id).map((m: any) => m.id);
                      if (unreadFromUser.length > 0 && socket) {
                        socket.emit('message-read', { messageIds: unreadFromUser, fromUserId: user.id, toUserId: currentUser.id });
                      }
                    }
                  } catch (err) {
                    console.error('Failed to load messages', err);
                  }
                }}>
                  {/* Top Row: Name and Badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm text-gray-900 truncate">{user.name}</p>
                    {user.unreadCount && user.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0 h-5 flex-shrink-0">{user.unreadCount}</Badge>
                    )}
                  </div>
                  {/* Middle Row: Message Preview */}
                  <p className="text-sm text-gray-600 truncate mb-1">{user.lastMessage}</p>
                  {/* Bottom Row: Time and Delete Button */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {user.lastMessageTime || ''}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0" onClick={(e) => {
                      e.stopPropagation();
                      setConversationToDelete(user);
                      setDeleteDialogOpen(true);
                    }}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500 hover:text-red-700" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-5 shadow-sm">
              <div 
                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                onClick={async () => {
                  // Load full profile info for selected chat user
                  if (!selectedChat || !currentUser) return;
                  try {
                    // Fetch from students or teachers search based on role
                    let userDetails = null;
                    if (selectedChat.role === 'student') {
                      const res = await fetch(`/api/students/search?query=${selectedChat.name}&type=name`, {
                        headers: { 'x-user-id': currentUser.id }
                      });
                      if (res.ok) {
                        const students = await res.json();
                        userDetails = students.find((s: any) => s.id === selectedChat.id);
                      }
                    } else {
                      const res = await fetch(`/api/teachers/search?query=${selectedChat.name}`, {
                        headers: { 'x-user-id': currentUser.id }
                      });
                      if (res.ok) {
                        const teachers = await res.json();
                        userDetails = teachers.find((t: any) => t.id === selectedChat.id);
                      }
                    }
                    
                    if (userDetails) {
                      setProfileUser(userDetails ? {
                        ...(userDetails as any),
                        role: selectedChat.role
                      } : null);
                      setIsProfileOpen(true);
                    }
                  } catch (err) {
                    console.error('Failed to load profile', err);
                  }
                }}
              >
                <Avatar>
                  <AvatarImage src={selectedChat.profileImage} />
                  <AvatarFallback>
                    {selectedChat.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h2 className="font-semibold text-gray-900">{selectedChat.name}</h2>
                    <Badge variant={selectedChat.role?.toLowerCase() === 'teacher' ? 'default' : 'secondary'}>
                      {selectedChat.role?.toLowerCase() === 'teacher' ? 'Teacher' : 'Student'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${selectedChat.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      {selectedChat.isOnline ? 'Online' : 'Offline'} • Click to view profile
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-6 bg-gradient-to-b from-gray-50 to-white">
              <div className="space-y-4">
                {messages.map((msg, index) => {
                  const isMe = currentUser ? msg.senderId === currentUser.id : false;
                  // Use a unique key combining id, clientTempId, and index to prevent duplicates
                  const uniqueKey = msg.id || msg.clientTempId || `msg-${index}-${msg.createdAt}`;
                  return (
                    <div key={uniqueKey} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                      <div className={`max-w-xs lg:max-w-md px-5 py-3 rounded-2xl shadow-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-200'}`}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        
                        {/* File Attachment */}
                        {msg.fileUrl && (
                          <FileAttachment
                            fileName={msg.fileName}
                            fileUrl={msg.fileUrl}
                            fileType={msg.fileType}
                            fileSize={msg.fileSize}
                          />
                        )}
                        
                        <div className={`flex items-center justify-between gap-2 mt-1 ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>
                          <span className="text-xs">{formatTime(msg.createdAt)}</span>
                          <div className="flex items-center gap-1">
                            {isMe && (
                              msg.read || msg.isRead ? <CheckCheck className="w-3 h-3" /> : (msg.delivered ? <Check className="w-3 h-3" /> : <Check className="w-3 h-3" />)
                            )}
                            {/* Delete button for own messages */}
                            {isMe && !msg.deletedAt && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id, msg.senderId)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500 hover:bg-opacity-20 rounded"
                                title="Delete message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 shadow-lg">
              {/* File upload input (hidden) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Selected file preview */}
              {selectedFile && (
                <div className="p-2 bg-blue-50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">{selectedFile.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearFile}>
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="p-5 flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-12 w-12 rounded-xl"
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 h-12 text-base px-4 rounded-xl border-2 border-gray-300 focus:border-blue-500 transition-all"
                />
                <Button 
                  onClick={sendMessage} 
                  size="lg"
                  className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a contact from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Notification Permission Dialog */}
      <AlertDialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <AlertDialogTitle className="text-xl">Enable Message Notifications</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Stay updated with real-time notifications when you receive new messages.
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Benefits:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Get instant alerts for new messages</li>
                    <li>Never miss important communications</li>
                    <li>Stay connected even when the tab is inactive</li>
                  </ul>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel 
              onClick={handleBlockNotifications}
              className="font-semibold"
            >
              Maybe Later
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAllowNotifications}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Enable Notifications
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl">Delete Conversation</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Are you sure you want to delete this conversation with <span className="font-semibold text-gray-900">{conversationToDelete?.name}</span>? 
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This action cannot be undone. All messages will be permanently deleted.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel 
              onClick={() => {
                setDeleteDialogOpen(false);
                setConversationToDelete(null);
              }}
              className="font-semibold"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Delete Conversation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Announcement Creation Dialog */}
      <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-purple-600" />
              </div>
              <DialogTitle className="text-xl">Create Announcement</DialogTitle>
            </div>
            <DialogDescription>
              Send an announcement to all users in the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Announcement title"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Announcement content"
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={announcementPriority} onValueChange={setAnnouncementPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiration Date (Optional)</Label>
              <Input
                id="expiry"
                type="datetime-local"
                value={announcementExpiry}
                onChange={(e) => setAnnouncementExpiry(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAnnouncementDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAnnouncement}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Create Announcement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

function MessageCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
