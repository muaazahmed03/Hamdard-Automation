'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionTimeout } from '@/hooks/use-session-timeout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  MessageCircle, 
  Upload, 
  Users, 
  BookOpen, 
  User, 
  Settings, 
  Search, 
  Bell, 
  LogOut,
  ArrowLeft,
  Check,
  X,
  Mail,
  UserPlus,
  Send,
  CheckCheck,
  Camera,
  Eye,
  Phone,
  Lightbulb,
  ExternalLink,
  Edit,
  UserMinus,
  AlertCircle,
  AlertTriangle,
  Menu,
  Trash2,
  FileText
} from 'lucide-react';
import NotificationsPanel from '@/components/notifications-panel';
import AnnouncementPopup from '@/components/announcement-popup';
import { useToast } from '@/hooks/use-toast';
import { notificationManager } from '@/lib/notification-manager';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  rollNumber?: string;
}

export default function StudentDashboard() {
  useSessionTimeout();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Profile state
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    rollNumber: 'CS2021001',
    department: 'Computer Science',
    gpa: '3.8',
    semester: '6',
    phone: '+1234567890',
    profilePicture: null
  });
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const fileInputRef = useRef(null);
  
  // Messages state
  const [selectedConversation, setSelectedConversation] = useState(0);
  const [messageInput, setMessageInput] = useState('');
  const [conversations, setConversations] = useState<any[]>([
    { 
      id: 0, 
      name: 'Dr. John Smith', 
      role: 'Teacher', 
      message: 'Please review the updated proposal', 
      time: '2:30 PM', 
      unread: 2,
      messages: [
        { id: 1, sender: 'other', text: 'Hi! How is the project going?', time: '2:30 PM' },
        { id: 2, sender: 'me', text: 'It\'s going well! I\'ve completed the research phase.', time: '2:35 PM', read: true }
      ]
    },
    { 
      id: 1, 
      name: 'Alice Johnson', 
      role: 'Student', 
      message: 'Sure, let\'s discuss the project timeline', 
      time: '1:15 PM', 
      unread: 0,
      messages: [
        { id: 1, sender: 'other', text: 'Hey, when can we meet?', time: '1:10 PM' },
        { id: 2, sender: 'me', text: 'Sure, let\'s discuss the project timeline', time: '1:15 PM', read: true }
      ]
    },
    { 
      id: 2, 
      name: 'Emma Thompson', 
      role: 'Student', 
      message: 'I\'ve completed my part of the implementation', 
      time: 'Yesterday', 
      unread: 1,
      messages: [
        { id: 1, sender: 'other', text: 'I\'ve completed my part of the implementation', time: 'Yesterday', read: false }
      ]
    },
    {
      id: 3,
      name: 'Project Alpha Team',
      role: 'Group',
      message: 'Bob: Hey team, meeting at 3pm today',
      time: '12:30 PM',
      unread: 3,
      messages: [
        { id: 1, sender: 'other', text: 'Alice: Has everyone completed their tasks?', time: '12:00 PM' },
        { id: 2, sender: 'other', text: 'Bob: I\'m almost done with my part', time: '12:15 PM' },
        { id: 3, sender: 'me', text: 'Great! I\'ll share my findings soon', time: '12:25 PM' },
        { id: 4, sender: 'other', text: 'Bob: Hey team, meeting at 3pm today', time: '12:30 PM' }
      ]
    }
  ]);
  
  // Supervisor state
  const [supervisorTab, setSupervisorTab] = useState('find');
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [supervisorRequests, setSupervisorRequests] = useState<any[]>([]);
  const [currentSupervisor, setCurrentSupervisor] = useState<any>(null);
  
  // Groups state
  const [groupTab, setGroupTab] = useState('your-group');
  const [groupSearch, setGroupSearch] = useState('');
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  
  // Recent Activity state
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  // Group members state
  const [myGroup, setMyGroup] = useState<any>(null);
  const [loadingMyGroup, setLoadingMyGroup] = useState(false);
  const [isEditGroupNameDialogOpen, setIsEditGroupNameDialogOpen] = useState(false);
  const [editGroupNameInput, setEditGroupNameInput] = useState('');
  const [isLeaveGroupDialogOpen, setIsLeaveGroupDialogOpen] = useState(false);
  
  // Projects state
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // Faculty Ideas state
  const [facultyIdeas, setFacultyIdeas] = useState<any[]>([]);
  const [loadingFacultyIdeas, setLoadingFacultyIdeas] = useState(false);
  const [selectedFacultyIdea, setSelectedFacultyIdea] = useState<any>(null);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [isGroupNameDialogOpen, setIsGroupNameDialogOpen] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

  // Function to load all projects from teachers
  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch('/api/admin/projects');
      if (response.ok) {
        const projects = await response.json();
        setAllProjects(projects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Function to load user's group data
  const loadMyGroup = async () => {
    if (!user) return;
    
    setLoadingMyGroup(true);
    try {
      const response = await fetch('/api/groups/my-group', {
        headers: {
          'x-user-id': user.id
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.hasGroup) {
          setMyGroup(data.group);
        } else {
          setMyGroup(null);
        }
      }
    } catch (error) {
      console.error('Error loading group:', error);
    } finally {
      setLoadingMyGroup(false);
    }
  };

  // Function to update group name
  const handleUpdateGroupName = async () => {
    if (!user || !editGroupNameInput.trim()) {
      toast({
        title: 'Error',
        description: 'Group name cannot be empty',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/groups/my-group', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          groupName: editGroupNameInput
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Group name updated successfully'
        });
        setMyGroup({ ...myGroup, name: data.group.name });
        setIsEditGroupNameDialogOpen(false);
        setEditGroupNameInput('');
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update group name',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update group name',
        variant: 'destructive'
      });
    }
  };
  const [proposalFormData, setProposalFormData] = useState({
    title: '',
    description: '',
    domain: '',
    objectives: '',
    abstract: '',
    tools: '',
    linkedFacultyIdeaId: null as string | null,
  });

  // Proposal Feedback state
  const [proposalFeedback, setProposalFeedback] = useState<any>(null);
  const [loadingProposalFeedback, setLoadingProposalFeedback] = useState(false);

  // Defense state
  const [defenseSchedule, setDefenseSchedule] = useState<any>(null);
  const [loadingDefense, setLoadingDefense] = useState(false);
  const [presentationFile, setPresentationFile] = useState<File | null>(null);

  // Proof Submission state (for conditional students)
  const [proofSubmissions, setProofSubmissions] = useState<any[]>([]);
  const [loadingProof, setLoadingProof] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);

  useEffect(() => {
    // Auto-refresh supervision requests every 30 seconds to see updates
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      const interval = setInterval(() => {
        loadSupervisionRequests(parsedUser.id);
      }, 30000); // 30 seconds
      
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    // Auto-refresh group requests every 30 seconds to see updates
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      const interval = setInterval(() => {
        loadGroupRequests(parsedUser.id);
      }, 30000); // 30 seconds
      
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!userData || !token) {
      window.location.href = '/';
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'STUDENT') {
      window.location.href = '/';
      return;
    }
    
    setUser(parsedUser);
    
    // Load profile data from API
    loadProfileData();
    
    // Load group requests and supervision requests
    loadGroupRequests(parsedUser.id);
    loadSupervisionRequests(parsedUser.id);
    
    // Load faculty ideas
    loadFacultyIdeas();
    
    // Debug profile picture state
    console.log('Initial userProfilePicture state:', userProfilePicture);
    
    // Update profile data with user information
    setProfileData(prev => ({
      ...prev,
      fullName: parsedUser.name || '',
      email: parsedUser.email || ''
    }));
    
    // Initialize profile picture from localStorage immediately
    const savedProfilePic = localStorage.getItem('userProfilePicture');
    if (savedProfilePic && savedProfilePic !== '' && savedProfilePic !== 'null') {
      console.log('Setting profile picture from localStorage (immediate):', savedProfilePic);
      setUserProfilePicture(savedProfilePic);
      setProfilePicturePreview(savedProfilePic);
    }
  }, []);

  // Debug profile picture changes
  useEffect(() => {
    console.log('userProfilePicture changed:', userProfilePicture);
  }, [userProfilePicture]);

  // Load recent activities when user is available
  useEffect(() => {
    if (user?.id) {
      loadRecentActivities();
      
      // Auto-refresh activities every 30 seconds
      const interval = setInterval(loadRecentActivities, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Load group data when user is available or when switching to groups or upload-proposal tab
  useEffect(() => {
    if (user && (activeSection === 'groups' || activeSection === 'upload-proposal')) {
      loadMyGroup();
    }
  }, [user, activeSection]);

  // Load projects when component mounts or when switching to projects tab
  useEffect(() => {
    if (activeSection === 'projects') {
      loadProjects();
    }
  }, [activeSection]);

  // Inject scrollbar styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .sidebar-scroll::-webkit-scrollbar {
        width: 6px;
      }
      .sidebar-scroll::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
      }
      .sidebar-scroll::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
      }
      .sidebar-scroll::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const loadProfileData = async () => {
    try {
      const userData = localStorage.getItem('user');
      const parsedUser = userData ? JSON.parse(userData) : null;
      
      if (!parsedUser?.id) {
        console.error('No user ID found');
        return;
      }

      const response = await fetch(`/api/profile?userId=${parsedUser.id}`, {
        headers: {
          'x-user-id': parsedUser.id,
        },
      });
      
      if (response.ok) {
        const profileData = await response.json();
        
        // Update profile state with API data
        setProfileData(prev => ({
          ...prev,
          fullName: profileData.name || '',
          email: profileData.email || '',
          rollNumber: profileData.rollNumber || '',
          department: profileData.department || '',
          gpa: profileData.gpa?.toString() || '',
          semester: profileData.semester?.toString() || profileData.studentProfile?.semester?.toString() || '',
          phone: profileData.contactInfo || '',
          profilePicture: profileData.profileImage || null
        }));
        
        // Set profile picture if exists
        if (profileData.profileImage && profileData.profileImage !== '' && profileData.profileImage !== null && profileData.profileImage !== 'null') {
          console.log('Setting profile picture from API:', profileData.profileImage);
          setUserProfilePicture(profileData.profileImage);
          setProfilePicturePreview(profileData.profileImage);
          // Also save to localStorage for persistence
          localStorage.setItem('userProfilePicture', profileData.profileImage);
          // Update user object in localStorage
          if (parsedUser) {
            parsedUser.profileImage = profileData.profileImage;
            localStorage.setItem('user', JSON.stringify(parsedUser));
          }
        } else {
          // Fallback: try to get from localStorage
          const savedProfilePic = localStorage.getItem('userProfilePicture');
          if (savedProfilePic && savedProfilePic !== '' && savedProfilePic !== 'null') {
            console.log('Setting profile picture from localStorage:', savedProfilePic);
            setUserProfilePicture(savedProfilePic);
            setProfilePicturePreview(savedProfilePic);
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      // Fallback: try to get from localStorage on error
      const savedProfilePic = localStorage.getItem('userProfilePicture');
      if (savedProfilePic && savedProfilePic !== '' && savedProfilePic !== 'null') {
        console.log('Setting profile picture from localStorage (error fallback):', savedProfilePic);
        setUserProfilePicture(savedProfilePic);
        setProfilePicturePreview(savedProfilePic);
      }
    }
  };

  // Load group requests from API
  const loadGroupRequests = async (userId: string) => {
    try {
      // Load sent requests
      const sentResponse = await fetch('/api/groups/requests?type=sent', {
        headers: { 'x-user-id': userId }
      });
      if (sentResponse.ok) {
        const sentData = await sentResponse.json();
        setSentRequests(sentData.map((req: any) => ({
          id: req.id,
          name: req.toUser?.name || 'Unknown',
          toUserId: req.toUserId,
          rollNumber: req.toUser?.rollNumber || 'N/A',
          date: new Date(req.createdAt).toISOString().split('T')[0],
          status: req.status // Keep uppercase for proper badge display
        })));
      } else {
        console.error('Failed to load sent requests:', await sentResponse.text());
      }

      // Load received requests
      const receivedResponse = await fetch('/api/groups/requests?type=received', {
        headers: { 'x-user-id': userId }
      });
      if (receivedResponse.ok) {
        const receivedData = await receivedResponse.json();
        setReceivedRequests(receivedData.map((req: any) => ({
          id: req.id,
          name: req.fromUser?.name || 'Unknown',
          fromUserId: req.fromUserId,
          rollNumber: req.fromUser?.rollNumber || 'N/A',
          date: new Date(req.createdAt).toISOString().split('T')[0],
          status: req.status // Keep uppercase for proper badge display
        })));
      } else {
        console.error('Failed to load received requests:', await receivedResponse.text());
      }
    } catch (error) {
      console.error('Error loading group requests:', error);
      // Silently fail for auto-refresh scenarios
    }
  };

  // Load supervision requests from API
  const loadSupervisionRequests = async (userId: string) => {
    try {
      const response = await fetch('/api/supervision/requests', {
        headers: { 
          'x-user-id': userId,
          'x-user-role': 'STUDENT'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSupervisorRequests(data.map((req: any) => ({
          id: req.id,
          name: req.teacher?.name || 'Unknown',
          teacherId: req.teacherId,
          status: req.status, // Keep uppercase for proper badge display
          date: new Date(req.createdAt).toISOString().split('T')[0],
          teacher: req.teacher,
          student: req.student
        })));
        
        // Check if any request is accepted and set as current supervisor
        const acceptedRequest = data.find((req: any) => req.status === 'ACCEPTED');
        if (acceptedRequest && acceptedRequest.teacher) {
          setCurrentSupervisor({
            id: acceptedRequest.teacher.id,
            name: acceptedRequest.teacher.name,
            email: acceptedRequest.teacher.email,
            department: acceptedRequest.teacher.department || 'N/A',
            specialization: acceptedRequest.teacher.specialization || 'N/A',
            profileImage: acceptedRequest.teacher.profileImage || null
          });
        } else {
          setCurrentSupervisor(null);
        }
      } else {
        console.error('Failed to load supervision requests:', await response.text());
      }
    } catch (error) {
      console.error('Error loading supervision requests:', error);
      // Silently fail for auto-refresh scenarios
    }
  };

  const loadFacultyIdeas = async () => {
    setLoadingFacultyIdeas(true);
    try {
      const response = await fetch('/api/faculty-ideas');
      if (response.ok) {
        const data = await response.json();
        setFacultyIdeas(data);
      }
    } catch (error) {
      console.error('Error loading faculty ideas:', error);
      toast({
        title: "Error",
        description: "Failed to load faculty ideas",
        variant: "destructive"
      });
    } finally {
      setLoadingFacultyIdeas(false);
    }
  };

  const loadRecentActivities = async () => {
    if (!user?.id) return;
    
    setLoadingActivities(true);
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'x-user-id': user.id,
        },
      });
      
      if (response.ok) {
        const notifications = await response.json();
        // Take only the 5 most recent activities
        setRecentActivities(notifications.slice(0, 5));
      } else {
        console.error('Failed to load notifications');
        setRecentActivities([]);
      }
    } catch (error) {
      console.error('Error loading recent activities:', error);
      setRecentActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  // Helper function to format activity time
  const formatActivityTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    return date.toLocaleDateString();
  };

  // Helper function to get activity badge and color based on notification type
  const getActivityStyle = (type: string) => {
    const typeUpper = type.toUpperCase();
    
    if (typeUpper.includes('ACCEPTED') || typeUpper.includes('APPROVED') || typeUpper.includes('SUCCESS')) {
      return { bgColor: 'bg-green-50', dotColor: 'bg-green-500', badge: 'Success', badgeVariant: 'default' as const };
    }
    if (typeUpper.includes('REJECTED') || typeUpper.includes('DECLINED') || typeUpper.includes('ERROR')) {
      return { bgColor: 'bg-red-50', dotColor: 'bg-red-500', badge: 'Declined', badgeVariant: 'destructive' as const };
    }
    if (typeUpper.includes('PENDING') || typeUpper.includes('WAITING') || typeUpper.includes('MEETING')) {
      return { bgColor: 'bg-yellow-50', dotColor: 'bg-yellow-500', badge: 'Pending', badgeVariant: 'secondary' as const };
    }
    if (typeUpper.includes('MESSAGE')) {
      return { bgColor: 'bg-blue-50', dotColor: 'bg-blue-500', badge: 'Message', badgeVariant: 'secondary' as const };
    }
    if (typeUpper.includes('GROUP')) {
      return { bgColor: 'bg-purple-50', dotColor: 'bg-purple-500', badge: 'Group', badgeVariant: 'secondary' as const };
    }
    // Default
    return { bgColor: 'bg-blue-50', dotColor: 'bg-blue-500', badge: 'New', badgeVariant: 'secondary' as const };
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('userProfilePicture');
    window.location.href = '/';
  };

  // Profile handlers
  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload to server
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        const parsedUser = userData ? JSON.parse(userData) : null;
        
        const response = await fetch(`/api/profile/picture?userId=${parsedUser?.id || ''}`, {
          method: 'POST',
          headers: {
            'x-user-id': parsedUser?.id || '',
          },
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          const profilePicUrl = result.profilePictureUrl;
          // Store the server URL in profile data
          setProfileData(prev => ({ 
            ...prev, 
            profilePicture: profilePicUrl 
          }));
          // Update local state immediately
          setUserProfilePicture(profilePicUrl);
          localStorage.setItem('userProfilePicture', profilePicUrl);
          setProfilePicturePreview(profilePicUrl);
        } else {
          console.error('Failed to upload profile picture');
          toast({
            title: "Upload Failed",
            description: "Failed to upload profile picture",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error uploading profile picture:', error);
        toast({
          title: "Upload Failed",
          description: "Failed to upload profile picture",
          variant: "destructive"
        });
      }
    }
  };

  const handleProfileSave = async () => {
    try {
      // Prepare profile data for API
      const profileUpdateData = {
        name: profileData.fullName,
        email: profileData.email,
        rollNumber: profileData.rollNumber,
        department: profileData.department,
        gpa: parseFloat(profileData.gpa) || 0,
        semester: parseInt(profileData.semester) || 0,
        contactInfo: profileData.phone,
        profileImage: profileData.profilePicture // This will be the URL from server
      };

      // Get userId
      const userData = localStorage.getItem('user');
      const parsedUser = userData ? JSON.parse(userData) : null;
      
      if (!parsedUser?.id) {
        toast({
          title: "Error",
          description: "User ID not found",
          variant: "destructive"
        });
        return;
      }

      // Save to API
      const response = await fetch(`/api/profile?userId=${parsedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': parsedUser.id,
        },
        body: JSON.stringify(profileUpdateData),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        
        toast({
          title: "Success",
          description: "Profile saved successfully!",
        });
        
        // Update the global user profile picture
        if (profileData.profilePicture && profileData.profilePicture !== '' && profileData.profilePicture !== 'null') {
          setUserProfilePicture(profileData.profilePicture);
          // Also save to localStorage as backup
          localStorage.setItem('userProfilePicture', profileData.profilePicture);
        }
        
        // Update user name in localStorage if changed
        if (user && profileData.fullName !== user.name) {
          const updatedUser = { ...user, name: profileData.fullName };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Messages handlers
  const handleSendMessage = () => {
    if (messageInput.trim()) {
      const newMessage = {
        id: Date.now(),
        sender: 'me',
        text: messageInput,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: true
      };
      
      setConversations((prev: any[]) => prev.map(conv => {
        if (conv.id === selectedConversation) {
          return {
            ...conv,
            messages: [...conv.messages, newMessage],
            message: messageInput,
            time: 'Just now'
          };
        }
        return conv;
      }));
      
      setMessageInput('');
    }
  };

  const handleSelectConversation = (convId) => {
    setSelectedConversation(convId);
    // Mark messages as read
    setConversations((prev: any[]) => prev.map(conv => {
      if (conv.id === convId) {
        return { ...conv, unread: 0 };
      }
      return conv;
    }));
  };

  // Supervisor handlers
  const handleSupervisorRequest = async (teacherId: string, teacherName: string) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/supervision/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          teacherId: teacherId,
          message: `I would like you to supervise my FYP project. Looking forward to working with you.`
        })
      });

      if (response.ok) {
        const newRequest = await response.json();
        setSupervisorRequests([...supervisorRequests, {
          id: newRequest.id,
          name: teacherName,
          teacherId: teacherId,
          status: newRequest.status,
          date: new Date(newRequest.createdAt).toISOString().split('T')[0]
        }]);
        toast({
          title: "Success",
          description: `Supervision request sent to ${teacherName} successfully!`,
        });
        // Reload supervision requests to get updated data
        loadSupervisionRequests(user.id);
      } else {
        const error = await response.json();
        if (error.supervisor && error.acceptedBy) {
          toast({
            title: "Cannot Send Request",
            description: `Your group already has a supervisor: ${error.supervisor.name} (accepted by ${error.acceptedBy.name})`,
            variant: "destructive"
          });
          // Set the current supervisor
          setCurrentSupervisor({
            id: error.supervisor.id,
            name: error.supervisor.name,
            email: error.supervisor.email,
            department: error.supervisor.department || 'N/A',
            specialization: 'N/A',
            profileImage: null
          });
        } else {
          toast({
            title: "Error",
            description: error.error || 'Failed to send supervision request',
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error sending supervision request:', error);
      toast({
        title: "Error",
        description: 'Failed to send supervision request. Please try again.',
        variant: "destructive"
      });
    }
  };

  // Groups handlers
  const handleSendGroupRequest = async (studentId: string, studentName: string) => {
    if (!user) return;
    
    // Check if user already has a group or pending requests
    // If they do, don't ask for group name again - send request directly
    if (myGroup || sentRequests.length > 0) {
      // User already has a group or has sent requests, send directly without group name
      sendRequestDirectly(studentId, studentName);
    } else {
      // First request - show group name dialog
      setPendingRequestId(studentId);
      setGroupNameInput('');
      setIsGroupNameDialogOpen(true);
    }
  };

  const sendRequestDirectly = async (studentId: string, studentName: string) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/groups/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          toUserId: studentId,
          message: `Hi! I would like to team up with you for the FYP project.`,
          // No groupName - will use existing group name or generate one
        })
      });

      if (response.ok) {
        // Reload group requests to get the updated list from server
        await loadGroupRequests(user.id);
        
        toast({
          title: "Success",
          description: `Group request sent to ${studentName} successfully!`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || 'Failed to send group request',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending group request:', error);
      toast({
        title: "Error",
        description: 'Failed to send group request. Please try again.',
        variant: "destructive"
      });
    }
  };

  const confirmSendGroupRequest = async () => {
    if (!groupNameInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a group name",
        variant: "destructive"
      });
      return;
    }

    if (!user || !pendingRequestId) return;
    
    const targetStudentId = pendingRequestId;
    
    try {
      const response = await fetch('/api/groups/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          toUserId: targetStudentId,
          message: `Hi! I would like to team up with you for the FYP project.`,
          groupName: groupNameInput.trim()
        })
      });

      if (response.ok) {
        const newRequest = await response.json();
        
        // Close dialog
        setIsGroupNameDialogOpen(false);
        setGroupNameInput('');
        setPendingRequestId(null);
        
        // Reload group requests to get the updated list from server
        await loadGroupRequests(user.id);
        
        toast({
          title: "Success",
          description: `Group request sent with group name "${groupNameInput}"!`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || 'Failed to send group request',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending group request:', error);
      toast({
        title: "Error",
        description: 'Failed to send group request. Please try again.',
        variant: "destructive"
      });
    }
  };

  const handleAcceptGroupRequest = async (requestId) => {
    try {
      const userData = localStorage.getItem('user');
      const parsedUser = userData ? JSON.parse(userData) : null;
      
      if (!parsedUser?.id) {
        console.error('No user ID found');
        return;
      }

      // Accept request directly - group name already provided by sender
      acceptRequestDirectly(requestId);
    } catch (error) {
      console.error('Error accepting group request:', error);
      toast({
        title: "Error",
        description: "Failed to accept group request",
        variant: "destructive"
      });
    }
  };

  const acceptRequestDirectly = async (requestId) => {
    try {
      const userData = localStorage.getItem('user');
      const parsedUser = userData ? JSON.parse(userData) : null;
      
      if (!parsedUser?.id) {
        console.error('No user ID found');
        return;
      }

      const response = await fetch(`/api/groups/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': parsedUser.id
        },
        body: JSON.stringify({ 
          status: 'ACCEPTED'
          // No groupName needed - joining existing group
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Reload both sent and received requests to show updated status
        await loadGroupRequests(parsedUser.id);
        
        // Reload group data to show in "Your Group" tab
        await loadMyGroup();
        
        toast({
          title: "Success",
          description: result.groupName ? `You have joined the group "${result.groupName}"` : "You have joined the group successfully",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept request');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to accept group request",
        variant: "destructive"
      });
    }
  };

  const confirmSendGroupRequestWrapper = confirmSendGroupRequest; // Renamed for clarity
  
  const confirmAcceptGroupRequest = async () => {
    // This function is no longer used for accepting requests
    // It's now used only for sending requests via confirmSendGroupRequest
    await confirmSendGroupRequestWrapper();
  };

  // Keep old confirmAcceptGroupRequest logic as backup (not used anymore)
  const confirmAcceptGroupRequestOld = async () => {
    if (!groupNameInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a group name",
        variant: "destructive"
      });
      return;
    }

    try {
      const userData = localStorage.getItem('user');
      const parsedUser = userData ? JSON.parse(userData) : null;
      
      if (!parsedUser?.id) {
        console.error('No user ID found');
        return;
      }

      const response = await fetch(`/api/groups/requests/${pendingRequestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': parsedUser.id
        },
        body: JSON.stringify({ 
          status: 'ACCEPTED',
          groupName: groupNameInput.trim()
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Close dialog
        setIsGroupNameDialogOpen(false);
        setGroupNameInput('');
        setPendingRequestId(null);
        
        // Reload both sent and received requests to show updated status
        await loadGroupRequests(parsedUser.id);
        
        // Reload group data to show in "Your Group" tab
        await loadMyGroup();
        
        // Check if a group was formed
        if (result.groupFormed) {
          toast({
            title: "Group Formed!",
            description: `Your group "${groupNameInput}" has been successfully formed and is ready for proposal submission.`,
          });
        } else {
          toast({
            title: "Success",
            description: "Group request accepted successfully",
          });
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept request');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to accept group request",
        variant: "destructive"
      });
    }
  };

  const handleRejectGroupRequest = async (requestId) => {
    try {
      const userData = localStorage.getItem('user');
      const parsedUser = userData ? JSON.parse(userData) : null;
      
      if (!parsedUser?.id) {
        console.error('No user ID found');
        return;
      }

      const response = await fetch(`/api/groups/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': parsedUser.id
        },
        body: JSON.stringify({ status: 'REJECTED' })
      });

      if (response.ok) {
        // Reload both sent and received requests to show updated status
        await loadGroupRequests(parsedUser.id);
        
        toast({
          title: "Success",
          description: "Group request rejected",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject request');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject group request",
        variant: "destructive"
      });
    }
  };

  const handleCancelGroupRequest = async (requestId) => {
    try {
      const userData = localStorage.getItem('user');
      const parsedUser = userData ? JSON.parse(userData) : null;
      
      if (!parsedUser?.id) {
        console.error('No user ID found');
        return;
      }

      const response = await fetch(`/api/groups/requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': parsedUser.id
        }
      });

      if (response.ok) {
        // Reload both sent and received requests to show updated status
        await loadGroupRequests(parsedUser.id);
        
        toast({
          title: "Success",
          description: "Group request cancelled",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel request');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel group request",
        variant: "destructive"
      });
    }
  };

  const quickActions = [
    {
      title: 'Schedule Meeting',
      description: 'Book a meeting with your supervisor',
      icon: Calendar,
      action: () => {
        window.location.href = '/schedule-meeting';
      },
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Start New Conversation',
      description: 'Chat with group members or teachers',
      icon: MessageCircle,
      action: () => router.push('/messages'),
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Proposal Submission Form',
      description: 'Submit your proposal submission form',
      icon: Upload,
      action: () => setActiveSection('upload-proposal'),
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Find Group Members',
      description: 'Search and connect with classmates',
      icon: Users,
      action: () => setActiveSection('groups'),
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ];

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BookOpen },
    { id: 'projects', label: 'Project Ideas', icon: Search },
    { id: 'groups', label: 'Groups Management', icon: Users },
    { id: 'supervisor', label: 'Supervisor', icon: User },
    { id: 'upload-proposal', label: 'Proposal Submission Form', icon: Upload },
    { id: 'proposal-feedback', label: 'Proposal Feedback', icon: MessageCircle },
    { id: 'project-execution', label: 'Project Execution', icon: FileText, href: '/project-execution' },
    { id: 'proof-submission', label: 'Proof Submission', icon: Upload },
    { id: 'forms', label: 'Forms', icon: FileText, href: '/student/forms' },
    { id: 'messages', label: 'Messages', icon: MessageCircle, href: '/messages' },
    { id: 'profile', label: 'Profile', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardContent 
          quickActions={quickActions} 
          setActiveSection={setActiveSection}
          loadingActivities={loadingActivities}
          recentActivities={recentActivities}
          formatActivityTime={formatActivityTime}
          getActivityStyle={getActivityStyle}
        />;
      case 'projects':
        return <ProjectIdeasContent 
          projectSearch={projectSearch}
          setProjectSearch={setProjectSearch}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          allProjects={allProjects}
          loadingProjects={loadingProjects}
          conversations={conversations}
          setConversations={setConversations}
          setSelectedConversation={setSelectedConversation}
          setActiveSection={setActiveSection}
          router={router}
        />;
      case 'groups':
        return <GroupsManagementContent 
          groupSearch={groupSearch}
          setGroupSearch={setGroupSearch}
          groupTab={groupTab}
          setGroupTab={setGroupTab}
          sentRequests={sentRequests}
          setSentRequests={setSentRequests}
          receivedRequests={receivedRequests}
          setReceivedRequests={setReceivedRequests}
          handleSendGroupRequest={handleSendGroupRequest}
          handleAcceptGroupRequest={handleAcceptGroupRequest}
          handleRejectGroupRequest={handleRejectGroupRequest}
          handleCancelGroupRequest={handleCancelGroupRequest}
          myGroup={myGroup}
          loadingMyGroup={loadingMyGroup}
          isEditGroupNameDialogOpen={isEditGroupNameDialogOpen}
          setIsEditGroupNameDialogOpen={setIsEditGroupNameDialogOpen}
          editGroupNameInput={editGroupNameInput}
          setEditGroupNameInput={setEditGroupNameInput}
          handleUpdateGroupName={handleUpdateGroupName}
          isLeaveGroupDialogOpen={isLeaveGroupDialogOpen}
          setIsLeaveGroupDialogOpen={setIsLeaveGroupDialogOpen}
          user={user}
          toast={toast}
          loadMyGroup={loadMyGroup}
          loadGroupRequests={loadGroupRequests}
        />;
      case 'supervisor':
        return <SupervisorContent 
          supervisorSearch={supervisorSearch}
          setSupervisorSearch={setSupervisorSearch}
          supervisorTab={supervisorTab}
          setSupervisorTab={setSupervisorTab}
          supervisorRequests={supervisorRequests}
          setSupervisorRequests={setSupervisorRequests}
          currentSupervisor={currentSupervisor}
          setCurrentSupervisor={setCurrentSupervisor}
          handleSupervisorRequest={handleSupervisorRequest}
          setActiveSection={setActiveSection}
          router={router}
          myGroup={myGroup}
          user={user}
        />;
      case 'upload-proposal':
        return <UploadProposalContent 
          myGroup={myGroup}
          user={user}
          toast={toast}
          loadingMyGroup={loadingMyGroup}
        />;
      case 'proposal-feedback':
        return <ProposalFeedbackContent 
          proposalFeedback={proposalFeedback}
          loadingProposalFeedback={loadingProposalFeedback}
          setIsProposalDialogOpen={setIsProposalDialogOpen}
        />;
      case 'defense':
        return <DefenseContent 
          defenseSchedule={defenseSchedule}
          loadingDefense={loadingDefense}
          presentationFile={presentationFile}
          setPresentationFile={setPresentationFile}
        />;
      case 'proof-submission':
        return <ProofSubmissionContent 
          proofSubmissions={proofSubmissions}
          loadingProof={loadingProof}
          proofFile={proofFile}
          setProofFile={setProofFile}
        />;
      case 'messages':
        return <MessagesContent 
          selectedConversation={selectedConversation}
          setSelectedConversation={setSelectedConversation}
          messageInput={messageInput}
          setMessageInput={setMessageInput}
          conversations={conversations}
          setConversations={setConversations}
          myGroup={myGroup}
        />;
      case 'profile':
        return <ProfileContent 
          profileData={profileData}
          setProfileData={setProfileData}
          profilePicturePreview={profilePicturePreview}
          setProfilePicturePreview={setProfilePicturePreview}
          fileInputRef={fileInputRef}
          showSaveConfirmDialog={showSaveConfirmDialog}
          setShowSaveConfirmDialog={setShowSaveConfirmDialog}
          handleProfileSave={handleProfileSave}
        />;
      default:
        return <DashboardContent 
          quickActions={quickActions} 
          setActiveSection={setActiveSection}
          loadingActivities={loadingActivities}
          recentActivities={recentActivities}
          formatActivityTime={formatActivityTime}
          getActivityStyle={getActivityStyle}
        />;
    }
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Announcement Popup */}
        <AnnouncementPopup userRole="STUDENT" />
        
        {/* Sidebar - Desktop */}
        <div className="hidden md:block w-48 lg:w-56 bg-white shadow-lg flex flex-col h-full overflow-hidden">
        {/* Header Section */}
        <div className="p-2 sm:p-3 flex-shrink-0">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-gray-200 flex-shrink-0">
              <img src="/hamdard-logo.png" alt="Hamdard" className="w-5 h-5 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-900 truncate">FYP Portal</h1>
              <p className="text-[10px] text-gray-500 truncate">Student Dashboard</p>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto min-h-0 sidebar-scroll">
          <nav className="space-y-1 px-2 pb-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.href) {
                      router.push(item.href);
                    } else {
                      setActiveSection(item.id);
                    }
                  }}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-md transition-colors text-left ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-medium truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Fixed Footer */}
        <div className="p-2 border-t border-gray-200 flex-shrink-0 bg-white">
          <div className="flex items-center space-x-2 px-2 py-1.5">
            <div className="w-7 h-7 bg-gray-300 rounded-full overflow-hidden flex-shrink-0 border border-white shadow-sm relative">
              {userProfilePicture && userProfilePicture !== '' && userProfilePicture !== 'null' ? (
                <img 
                  src={userProfilePicture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.log('Profile picture failed to load, showing default avatar');
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              {(!userProfilePicture || userProfilePicture === '' || userProfilePicture === 'null') && (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{user?.name || 'Student'}</p>
              <p className="text-[10px] text-gray-500 truncate">Student</p>
            </div>
          </div>
          <button 
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-gray-700 hover:bg-gray-50 rounded-md transition-colors mt-1.5"
            onClick={handleLogout}
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto min-w-0">
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center justify-between">
            {/* Mobile Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 sm:w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Mobile Header */}
                  <SheetHeader className="p-6 border-b">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                        <img src="/hamdard-logo.png" alt="Hamdard" className="w-8 h-8 object-contain" />
                      </div>
                      <div>
                        <SheetTitle className="text-xl font-bold text-gray-900">FYP Portal</SheetTitle>
                        <p className="text-sm text-gray-500">Student Dashboard</p>
                      </div>
                    </div>
                  </SheetHeader>

                  {/* Navigation */}
                  <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Navigation</p>
                      {sidebarItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (item.href) {
                                router.push(item.href);
                              } else {
                                setActiveSection(item.id);
                                setIsMobileMenuOpen(false);
                              }
                            }}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                              activeSection === item.id
                                ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Actions in Drawer */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Quick Actions</p>
                      {quickActions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={index}
                            onClick={() => {
                              action.action();
                              setIsMobileMenuOpen(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${action.color}`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium">{action.title}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </nav>

                  {/* User Profile & Logout */}
                  <div className="border-t border-gray-200 p-4">
                    <div className="flex items-center space-x-3 px-2 py-3 mb-2">
                      <div className="w-10 h-10 bg-gray-300 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-sm relative">
                        {userProfilePicture && userProfilePicture !== '' && userProfilePicture !== 'null' ? (
                          <img 
                            src={userProfilePicture} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        {(!userProfilePicture || userProfilePicture === '' || userProfilePicture === 'null') && (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Student'}</p>
                        <p className="text-xs text-gray-500">Student</p>
                      </div>
                    </div>
                    <button 
                      className="w-full flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">Logout</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">
                {sidebarItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
              </h2>
              {activeSection === 'dashboard' && (
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 hidden sm:block">
                  Welcome back! Here's what's happening with your projects.
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <NotificationsPanel userId={user.id} />
            </div>
          </div>
        </header>

        <main className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
          {renderContent()}
        </main>
      </div>

      {/* Proposal Submission Dialog */}
      <ProposalSubmissionDialog 
        isOpen={isProposalDialogOpen}
        onClose={() => setIsProposalDialogOpen(false)}
        proposalFormData={proposalFormData}
        setProposalFormData={setProposalFormData}
        linkedFacultyIdea={selectedFacultyIdea}
      />

      {/* Group Name Dialog - Now shown when SENDING request */}
      <Dialog open={isGroupNameDialogOpen} onOpenChange={setIsGroupNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Group Name</DialogTitle>
            <DialogDescription>
              Please provide a name for your group. This will help identify your group in proposal submissions and admin tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                placeholder="e.g., Team Alpha, FYP Group 1"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsGroupNameDialogOpen(false);
                setGroupNameInput('');
                setPendingRequestId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSendGroupRequest}
              disabled={!groupNameInput.trim()}
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Reuse all the content components from the original page.tsx
function DashboardContent({ 
  quickActions, 
  setActiveSection, 
  loadingActivities, 
  recentActivities, 
  formatActivityTime, 
  getActivityStyle 
}: { 
  quickActions: any[]; 
  setActiveSection: (s: string) => void;
  loadingActivities: boolean;
  recentActivities: any[];
  formatActivityTime: (date: string) => string;
  getActivityStyle: (type: string) => any;
}) {
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Quick Actions */}
      <section>
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <div key={index} onClick={action.action} className="block h-full">
                <Card className="relative h-full flex flex-col overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-2 border-l-blue-500">
                  <CardHeader className="pb-1.5 flex-grow p-2.5 sm:p-3">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 ${action.color} rounded-lg flex items-center justify-center mb-1.5 sm:mb-2 shadow-inner`}>
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <CardTitle className="text-xs sm:text-sm font-semibold leading-tight">{action.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-2 sm:pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs text-gray-600 leading-snug">
                    {action.description}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">Recent Activity</h3>
        <Card>
          <CardContent className="p-2.5 sm:p-3 md:p-4">
            {loadingActivities ? (
              <div className="flex items-center justify-center py-3 sm:py-4">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-xs text-gray-600">Loading activities...</p>
                </div>
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-3 sm:py-4">
                <p className="text-xs sm:text-sm text-gray-500">No recent activity yet</p>
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {recentActivities.map((activity) => {
                  const style = getActivityStyle(activity.type);
                  return (
                    <div key={activity.id} className={`flex items-center space-x-2 p-2 sm:p-2.5 ${style.bgColor} rounded-md`}>
                      <div className={`w-1.5 h-1.5 ${style.dotColor} rounded-full flex-shrink-0`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{activity.title}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500">{formatActivityTime(activity.createdAt)}</p>
                      </div>
                      <Badge variant={style.badgeVariant} className="text-[10px] px-1.5 py-0.5 flex-shrink-0">{style.badge}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// Faculty Ideas Content Component
function FacultyIdeasContent({
  facultyIdeas,
  loadingFacultyIdeas,
  selectedFacultyIdea,
  setSelectedFacultyIdea,
  setIsProposalDialogOpen,
  setProposalFormData
}: {
  facultyIdeas: any[];
  loadingFacultyIdeas: boolean;
  selectedFacultyIdea: any;
  setSelectedFacultyIdea: (idea: any) => void;
  setIsProposalDialogOpen: (open: boolean) => void;
  setProposalFormData: (data: any) => void;
}) {
  const { toast } = useToast();

  const handleSelectIdea = (idea: any) => {
    setSelectedFacultyIdea(idea);
    setProposalFormData({
      title: idea.title,
      description: idea.description,
      domain: idea.domain || '',
      objectives: idea.objectives || '',
      abstract: idea.abstract || '',
      tools: idea.tools || '',
      linkedFacultyIdeaId: idea.id,
    });
    setIsProposalDialogOpen(true);
  };

  if (loadingFacultyIdeas) {
    return (
      <div className="flex items-center justify-center py-6 sm:py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
          <p className="text-xs sm:text-sm text-gray-600">Loading faculty ideas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900">Faculty-Proposed Project Ideas</h3>
          <p className="text-xs text-gray-600 mt-0.5">Browse project ideas proposed by faculty members</p>
        </div>
        <Badge variant="outline" className="text-xs w-fit">
          {facultyIdeas.length} Ideas Available
        </Badge>
      </div>

      {facultyIdeas.length === 0 ? (
        <Card>
          <CardContent className="p-6 sm:p-8 text-center">
            <Lightbulb className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1.5 sm:mb-2">No Faculty Ideas Available</h3>
            <p className="text-xs sm:text-sm text-gray-600">Check back later for project ideas from faculty members</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {facultyIdeas.map((idea) => (
            <Card key={idea.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm sm:text-base mb-1.5 sm:mb-2 line-clamp-2">{idea.title}</CardTitle>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-gray-600 flex-wrap">
                      <User className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{idea.teacher?.name}</span>
                      {idea.teacher?.isAvailable ? (
                        <Badge variant="default" className="bg-green-600 text-[10px] px-1.5 py-0.5">🟢 Available</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">🔴 Full ({idea.teacher?.activeProjects}/{idea.teacher?.capacity})</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-2 sm:space-y-3">
                <div>
                  <p className="text-xs sm:text-sm text-gray-700 line-clamp-3">{idea.description}</p>
                </div>
                
                {idea.domain && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] sm:text-xs">{idea.domain}</Badge>
                  </div>
                )}

                {idea.tools && (
                  <div>
                    <p className="text-[10px] sm:text-xs font-semibold text-gray-600 mb-1">Technologies:</p>
                    <p className="text-xs sm:text-sm text-gray-700 line-clamp-2">{idea.tools}</p>
                  </div>
                )}

                {idea.requirements && (
                  <div>
                    <p className="text-[10px] sm:text-xs font-semibold text-gray-600 mb-1">Requirements:</p>
                    <p className="text-xs sm:text-sm text-gray-700 line-clamp-2">{idea.requirements}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t gap-2">
                  <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">
                    Posted {new Date(idea.createdAt).toLocaleDateString()}
                  </span>
                  <Button 
                    size="sm" 
                    onClick={() => handleSelectIdea(idea)}
                    disabled={!idea.teacher?.isAvailable}
                    className="text-xs h-7 sm:h-8 px-2 sm:px-3"
                  >
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                    <span className="hidden sm:inline">{idea.teacher?.isAvailable ? 'Select This Idea' : 'Supervisor Full'}</span>
                    <span className="sm:hidden">{idea.teacher?.isAvailable ? 'Select' : 'Full'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Proposal Feedback Content Component
function ProposalFeedbackContent({
  proposalFeedback,
  loadingProposalFeedback,
  setIsProposalDialogOpen
}: {
  proposalFeedback: any;
  loadingProposalFeedback: boolean;
  setIsProposalDialogOpen: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => {
    const loadMySubmissions = async () => {
      setLoadingSubmissions(true);
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user?.id) return;
        const response = await fetch('/api/files', {
          headers: {
            'x-user-id': user.id,
          },
        });
        if (response.ok) {
          const data = await response.json();
          const myFiles = data.files.filter((f: any) => f.studentId === user.id);
          setMySubmissions(myFiles);
        }
      } catch (error) {
        console.error('Error loading submissions:', error);
      } finally {
        setLoadingSubmissions(false);
      }
    };
    loadMySubmissions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Proposal Feedback</h3>
          <p className="text-sm text-gray-600">View supervisor decision and feedback on your proposals</p>
        </div>
      </div>

      {loadingSubmissions ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading submissions...</p>
        </div>
      ) : mySubmissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No proposals submitted yet</p>
            <p className="text-sm text-gray-400 mt-2">Upload your proposal from the "Upload Proposal" section</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {mySubmissions.map((submission) => {
            const getStatusBadge = (status: string, supervisorApprovalStatus?: string, fileType?: string) => {
              // First check final approval status
              if (status === 'ADMIN_APPROVED' || status === 'COMMITTEE_APPROVED') {
                return <Badge className="bg-green-600">✅ Approved - Active Execution</Badge>;
              }
              if (status === 'CONDITIONALLY_APPROVED') {
                return <Badge className="bg-blue-600">⚠️ Conditionally Approved</Badge>;
              }
              if (status === 'REJECTED' || status === 'ADMIN_REJECTED' || status === 'COMMITTEE_REJECTED') {
                return <Badge variant="destructive">❌ Rejected</Badge>;
              }
              if (status === 'CHANGES_REQUESTED') {
                return <Badge variant="secondary" className="bg-yellow-600">🔁 Changes Requested</Badge>;
              }
              
              // Check supervisor approval status
              // If supervisor has approved (supervisorApprovalStatus === 'APPROVED'), show pending from committee/admin
              // Also check if status is 'APPROVED' (which happens when supervisor approves a proposal)
              // This handles cases where supervisorApprovalStatus might not be set but status is APPROVED
              const isSupervisorApproved = supervisorApprovalStatus === 'APPROVED' || 
                                          (status === 'APPROVED' && 
                                           (fileType === 'PROPOSAL' || fileType === 'proposal') && 
                                           supervisorApprovalStatus !== 'REJECTED' &&
                                           status !== 'ADMIN_APPROVED' &&
                                           status !== 'COMMITTEE_APPROVED');
              
              if (isSupervisorApproved) {
                return <Badge className="bg-orange-600">⏳ Pending from Committee/Admin</Badge>;
              }
              // If supervisor has rejected, show rejected
              if (supervisorApprovalStatus === 'REJECTED') {
                return <Badge variant="destructive">❌ Rejected by Supervisor</Badge>;
              }
              // Otherwise, pending from supervisor
              return <Badge variant="outline" className="bg-yellow-600">⏳ Pending from Supervisor</Badge>;
            };

            const isFullyApproved = ['ADMIN_APPROVED', 'COMMITTEE_APPROVED'].includes(submission.status);
            const isConditionallyApproved = submission.status === 'CONDITIONALLY_APPROVED';
            // Check if supervisor has approved - check both supervisorApprovalStatus and status
            const isSupervisorApproved = submission.supervisorApprovalStatus === 'APPROVED' || 
                                        (submission.status === 'APPROVED' && 
                                         (submission.fileType === 'PROPOSAL' || submission.fileType === 'proposal') &&
                                         submission.supervisorApprovalStatus !== 'REJECTED');
            const isRejected = ['REJECTED', 'ADMIN_REJECTED', 'COMMITTEE_REJECTED'].includes(submission.status);

            return (
              <Card key={submission.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{submission.title || submission.fileName}</CardTitle>
                    {getStatusBadge(submission.status, submission.supervisorApprovalStatus, submission.fileType)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">File Name</p>
                      <p className="font-semibold">{submission.fileName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">File Type</p>
                      <p className="font-semibold">{submission.fileType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Submitted</p>
                      <p className="font-semibold">{new Date(submission.createdAt || submission.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-semibold">{submission.status.replace('_', ' ')}</p>
                    </div>
                  </div>

                  {/* Show pending supervisor review message ONLY if proposal is NOT approved by supervisor AND NOT fully approved */}
                  {!isSupervisorApproved && 
                   !isFullyApproved &&
                   submission.supervisorApprovalStatus !== 'REJECTED' && 
                   !isRejected && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">⏳ Pending Supervisor Review</h4>
                      <p className="text-blue-700">Your proposal is awaiting review by your supervisor.</p>
                    </div>
                  )}

                  {/* Show pending committee review message when supervisor has approved but not yet fully approved */}
                  {isSupervisorApproved && !isFullyApproved && !isRejected && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold text-yellow-800 mb-2">⏳ Pending from Committee Review</h4>
                      <p className="text-yellow-700">Your proposal is under review of committee/admin.</p>
                    </div>
                  )}

                  {isFullyApproved && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-800 mb-2">✅ Approved: Proposal accepted; group proceeds to Active Project Execution (Phase 6)</h4>
                      <p className="text-green-700">
                        {submission.status === 'COMMITTEE_APPROVED' && 'Your proposal has been approved by the Committee Head. Your group can now proceed to active project execution!'}
                        {submission.status === 'ADMIN_APPROVED' && 'Your proposal has been approved by the Admin. Your group can now proceed to active project execution!'}
                      </p>
                    </div>
                  )}

                  {isConditionallyApproved && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">⚠️ Conditionally Approved: Minor revisions required</h4>
                      <p className="text-blue-700 mb-3">
                        Your proposal has been conditionally approved. Please upload the corrected proposal with minor revisions (no re-defense required).
                      </p>
                      {submission.conditionalApprovalRemarks && (
                        <div className="mt-2 p-3 bg-white rounded border border-blue-300">
                          <p className="text-sm font-semibold text-blue-900">Revision Requirements:</p>
                          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{submission.conditionalApprovalRemarks}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {isRejected && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <h4 className="font-semibold text-red-800 mb-2">❌ Rejected: Major changes required; proposal sent for Re-Defense</h4>
                      <p className="text-red-700 mb-3">
                        {submission.status === 'REJECTED' && 'Your proposal has been rejected by your supervisor. You can select another supervisor and resubmit.'}
                        {submission.status === 'COMMITTEE_REJECTED' && 'Your proposal has been rejected by the Committee Head. Major changes are required.'}
                        {submission.status === 'ADMIN_REJECTED' && 'Your proposal has been rejected by the Admin. Major changes are required.'}
                      </p>
                      
                      {(submission.status === 'COMMITTEE_REJECTED' || submission.status === 'ADMIN_REJECTED') && (
                        <div className="mt-3 space-y-3">
                          <div className="p-3 bg-white rounded border border-red-300">
                            <p className="text-sm font-semibold text-red-900">Re-Defense Schedule:</p>
                            <p className="text-sm text-gray-700 mt-1">
                              Defense Attempt: {submission.defenseAttempts || 1} of 3
                            </p>
                            <p className="text-xs text-gray-600 mt-2">
                              • 1st Attempt: Original Defense {submission.defenseAttempts >= 1 ? '✓' : ''}<br/>
                              • 2nd Attempt: First Re-Defense {submission.defenseAttempts >= 2 ? '✓' : ''}<br/>
                              • 3rd Attempt: Final Re-Defense {submission.defenseAttempts >= 3 ? '✓' : ''}
                            </p>
                          </div>
                          
                          {submission.adminRemarks && (
                            <div className="p-3 bg-white rounded border border-red-300">
                              <p className="text-sm font-semibold text-red-900">Rejection Remarks:</p>
                              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{submission.adminRemarks}</p>
                            </div>
                          )}
                          
                          <div className="p-3 bg-yellow-50 rounded border border-yellow-300">
                            <p className="text-sm font-semibold text-yellow-900">⚠️ Re-Defense Rules:</p>
                            <ul className="text-xs text-gray-700 mt-2 space-y-1 list-disc list-inside">
                              <li>Update your proposal and re-present it before the jury</li>
                              <li>If first re-defense fails, you get one final (second) re-defense</li>
                              <li>If rejected after 3rd attempt, proposal permanently failed</li>
                              <li>Failed proposals require starting a new proposal in the next cycle</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {submission.status === 'CHANGES_REQUESTED' && submission.supervisorRemarks && (
                    <div>
                      <h4 className="font-semibold mb-2">Supervisor Feedback</h4>
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-gray-700 whitespace-pre-wrap">{submission.supervisorRemarks}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => window.open(submission.fileUrl, '_blank')}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Proposal
                    </Button>
                    {submission.status === 'CHANGES_REQUESTED' && (
                      <Button onClick={() => setIsProposalDialogOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Reupload Proposal
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Defense Content Component
function DefenseContent({
  defenseSchedule,
  loadingDefense,
  presentationFile,
  setPresentationFile
}: {
  defenseSchedule: any;
  loadingDefense: boolean;
  presentationFile: File | null;
  setPresentationFile: (file: File | null) => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mockDefenseSchedule = {
    id: '1',
    type: 'INITIAL', // INITIAL, RE_DEFENSE_1, RE_DEFENSE_2
    scheduledDate: '2024-12-15',
    time: '10:00 AM',
    venue: 'Room 301, CS Department',
    committee: [
      { name: 'Dr. Sarah Johnson', role: 'Chair' },
      { name: 'Dr. Michael Brown', role: 'Member' },
      { name: 'Dr. Emily Davis', role: 'Member' }
    ],
    presentationUploaded: false,
    status: 'SCHEDULED', // SCHEDULED, COMPLETED, PASSED, FAILED
    guidelines: [
      'Prepare a 15-minute presentation',
      'Be ready for 10 minutes of Q&A',
      'Upload slides at least 24 hours before defense',
      'Dress formally for the defense'
    ]
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive"
        });
        return;
      }
      setPresentationFile(file);
      toast({
        title: "File selected",
        description: `${file.name} ready to upload`,
      });
    }
  };

  const handleUploadPresentation = async () => {
    if (!presentationFile) {
      toast({
        title: "No file selected",
        description: "Please select a presentation file first",
        variant: "destructive"
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', presentationFile);
      formData.append('defenseId', mockDefenseSchedule.id);

      // Mock API call
      toast({
        title: "Upload Successful",
        description: "Your presentation has been uploaded successfully",
      });
      setPresentationFile(null);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload presentation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getDefenseTypeBadge = (type: string) => {
    switch (type) {
      case 'INITIAL':
        return <Badge className="bg-blue-600">Initial Defense</Badge>;
      case 'RE_DEFENSE_1':
        return <Badge className="bg-orange-600">Re-Defense 1</Badge>;
      case 'RE_DEFENSE_2':
        return <Badge className="bg-red-600">Re-Defense 2 (Final)</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Proposal Defense</h3>
          <p className="text-sm text-gray-600">View defense schedule and upload presentation slides</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Defense Schedule</CardTitle>
            {getDefenseTypeBadge(mockDefenseSchedule.type)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-semibold">{new Date(mockDefenseSchedule.scheduledDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Time</p>
              <p className="font-semibold">{mockDefenseSchedule.time}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-600">Venue</p>
              <p className="font-semibold">{mockDefenseSchedule.venue}</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Committee Members</h4>
            <div className="space-y-2">
              {mockDefenseSchedule.committee.map((member, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="font-medium">{member.name}</span>
                  </div>
                  <Badge variant="outline">{member.role}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Defense Guidelines</h4>
            <ul className="space-y-2">
              {mockDefenseSchedule.guidelines.map((guideline, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-gray-700">{guideline}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-semibold mb-3">Upload Presentation</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ppt,.pptx,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
                {presentationFile && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">{presentationFile.name}</span>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setPresentationFile(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {presentationFile && (
                <Button onClick={handleUploadPresentation}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Presentation
                </Button>
              )}

              {mockDefenseSchedule.presentationUploaded && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-700 font-semibold">✓ Presentation uploaded successfully</p>
                </div>
              )}
            </div>
          </div>

          {mockDefenseSchedule.type !== 'INITIAL' && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-800 font-semibold mb-2">⚠️ Re-Defense Notice</p>
              <p className="text-gray-700">
                {mockDefenseSchedule.type === 'RE_DEFENSE_1' 
                  ? 'This is your first re-defense. Please address all feedback from the initial defense.'
                  : 'This is your final re-defense opportunity. Please ensure all requirements are met.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Proof Submission Content Component (for Conditional Students)
function ProofSubmissionContent({
  proofSubmissions,
  loadingProof,
  proofFile,
  setProofFile
}: {
  proofSubmissions: any[];
  loadingProof: boolean;
  proofFile: File | null;
  setProofFile: (file: File | null) => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<any>(null);

  // Load proof submissions from API
  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      
      const user = JSON.parse(userStr);
      
      // Get active announcement
      const announcementsRes = await fetch('/api/announcements');
      if (!announcementsRes.ok) {
        setSubmissions([]);
        return;
      }
      
      const announcements = await announcementsRes.json();
      const activeAnnouncement = announcements.find((a: any) => a.type === 'PROOF_SUBMISSION');
      
      if (!activeAnnouncement) {
        setSubmissions([]);
        return;
      }
      
      // Get submissions for this announcement
      const response = await fetch(`/api/committee/proof-submissions?announcementId=${activeAnnouncement.id}`);
      if (response.ok) {
        const allSubmissions = await response.json();
        // Filter to only show current user's submissions
        const userSubmissions = allSubmissions.filter((s: any) => s.studentId === user.id);
        setSubmissions(userSubmissions);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      setProofFile(file);
      toast({
        title: "File selected",
        description: `${file.name} ready to upload`,
      });
    }
  };

  const handleSubmitProof = async () => {
    if (!proofFile) {
      toast({
        title: "No file selected",
        description: "Please select a proof document first",
        variant: "destructive"
      });
      return;
    }

    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast({
          title: "Error",
          description: "User not found",
          variant: "destructive"
        });
        return;
      }
      const user = JSON.parse(userStr);

      // Get active announcement
      console.log('Fetching announcements...');
      const announcementsRes = await fetch('/api/announcements');
      if (!announcementsRes.ok) {
        const errorText = await announcementsRes.text();
        console.error('Failed to fetch announcements:', errorText);
        throw new Error(`Failed to fetch announcements: ${announcementsRes.status}`);
      }
      const announcements = await announcementsRes.json();
      console.log('Announcements:', announcements);
      const activeAnnouncement = announcements.find((a: any) => a.type === 'PROOF_SUBMISSION');
      
      if (!activeAnnouncement) {
        console.error('No PROOF_SUBMISSION announcement found. Available announcements:', announcements);
        toast({
          title: "No Active Announcement",
          description: "The committee head needs to create a proof submission announcement first. Please contact the committee head or admin.",
          variant: "destructive"
        });
        return;
      }

      console.log('Active announcement:', activeAnnouncement);


      // Upload file first (no project/group required for proof)
      console.log('Uploading file...');
      const formData = new FormData();
      formData.append('file', proofFile);
      formData.append('userId', user.id);
      formData.append('userName', user.name || 'Student');
      formData.append('fileType', 'proof');
      formData.append('type', 'proof');

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('File upload failed:', errorText);
        throw new Error(`File upload failed: ${uploadResponse.status}`);
      }

      const uploadData = await uploadResponse.json();
      console.log('Upload successful:', uploadData);

      // Submit proof (no groupId required)
      console.log('Submitting proof...');
      const submissionData = {
        announcementId: activeAnnouncement.id,
        proofFileUrl: uploadData.fileUrl,
        proofFileName: proofFile.name,
        proofFileSize: proofFile.size
      };
      console.log('Submission data:', submissionData);

      const submitResponse = await fetch('/api/committee/proof-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(submissionData)
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json();
        console.error('Submission failed:', errorData);
        throw new Error(errorData.error || `Submission failed: ${submitResponse.status}`);
      }

      const result = await submitResponse.json();
      console.log('Submission successful:', result);

      toast({
        title: "Proof Submitted",
        description: "Your proof has been submitted for committee review",
      });
      setProofFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Reload submissions
      await loadSubmissions();
    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit proof. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleViewFile = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    try {
      setDeletingId(submissionId);
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);

      const response = await fetch(`/api/committee/proof-submissions/${submissionId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id
        }
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      toast({
        title: "Submission Deleted",
        description: "Your submission has been deleted successfully",
      });

      // Reload submissions
      await loadSubmissions();
      
      // Close dialog
      setDeleteDialogOpen(false);
      setSubmissionToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete submission. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-600">✅ Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">❌ Rejected</Badge>;
      case 'PENDING':
        return <Badge variant="secondary">⏳ Pending Review</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Proof Submission</h3>
          <p className="text-sm text-gray-600">Upload proof documents for conditional registration approval</p>
        </div>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold">ℹ</span>
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Conditional Student Requirements</h4>
              <p className="text-blue-800 text-sm">
                As a conditional student, you need to upload proof of eligibility (e.g., summer semester transcript or clearance certificate) for committee approval.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Proof Document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label>Document Type</Label>
              <Select defaultValue="TRANSCRIPT">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSCRIPT">Summer Transcript</SelectItem>
                  <SelectItem value="CLEARANCE">Clearance Certificate</SelectItem>
                  <SelectItem value="OTHER">Other Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Upload File (PDF, Max 5MB)</Label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
                {proofFile && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">{proofFile.name}</span>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setProofFile(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {proofFile && (
              <Button onClick={handleSubmitProof}>
                <Upload className="w-4 h-4 mr-2" />
                Submit Proof
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submission History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSubmissions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No submissions yet</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium">{submission.proofFileName}</span>
                      {getStatusBadge((submission.status || '').toUpperCase())}
                    </div>
                    <p className="text-sm text-gray-600">
                      Uploaded on {new Date(submission.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Size: {(submission.proofFileSize / 1024).toFixed(2)} KB
                    </p>
                    {submission.status === 'APPROVED' && (
                      <p className="text-green-700 font-medium mt-2">Your proof has been <span className='font-bold'>approved</span> by the committee head.</p>
                    )}
                    {submission.status === 'REJECTED' && (
                      <p className="text-red-600 mt-2">Your proof was <span className='font-bold'>rejected</span> by the committee head.</p>
                    )}
                    {submission.reviewComments && (
                      <p className="text-sm text-red-600 mt-2">Feedback: {submission.reviewComments}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewFile(submission.proofFileUrl)}
                      title="View document"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {submission.status === 'PENDING' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSubmissionToDelete(submission);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={deletingId === submission.id}
                        title="Delete submission"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingId === submission.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this submission? This action cannot be undone.
              {submissionToDelete && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-900">
                    {submissionToDelete.proofFileName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Uploaded on {new Date(submissionToDelete.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setSubmissionToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => submissionToDelete && handleDeleteSubmission(submissionToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deletingId !== null}
            >
              {deletingId === submissionToDelete?.id ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Include all other content components (ProjectIdeasContent, GroupsManagementContent, etc.)
// These would be the same as in the original implementation
function ProjectIdeasContent({ 
  projectSearch, 
  setProjectSearch, 
  selectedProject, 
  setSelectedProject,
  allProjects,
  loadingProjects,
  conversations,
  setConversations,
  setSelectedConversation,
  setActiveSection,
  router
}: {
  projectSearch: string;
  setProjectSearch: (value: string) => void;
  selectedProject: any;
  setSelectedProject: (value: any) => void;
  allProjects: any[];
  loadingProjects: boolean;
  conversations: any[];
  setConversations: (value: any) => void;
  setSelectedConversation: (value: number) => void;
  setActiveSection: (value: string) => void;
  router: any;
}) {
  const { toast } = useToast();
  
  // Fallback mock projects if no real projects exist
  const mockProjects = [
    {
      id: '1',
      title: 'AI-Powered Healthcare System',
      description: 'Develop an intelligent healthcare system that uses machine learning algorithms to predict diseases and recommend treatments.',
      teacher: 'Dr. John Smith',
      department: 'Computer Science',
      postedAt: '2 days ago',
      tags: ['Machine Learning', 'Healthcare', 'AI'],
      email: 'john.smith@university.edu',
      requirements: ['Python', 'TensorFlow', 'React', 'Node.js'],
      duration: '6 months',
      teamSize: '3-4 students'
    },
    {
      id: '2',
      title: 'Smart Campus Navigation',
      description: 'Create a mobile application that helps students navigate the campus using augmented reality.',
      teacher: 'Dr. Sarah Johnson',
      department: 'Software Engineering',
      postedAt: '3 days ago',
      tags: ['Mobile Development', 'AR', 'Navigation'],
      email: 'sarah.j@university.edu',
      requirements: ['React Native', 'AR Core', 'Firebase', 'JavaScript'],
      duration: '4 months',
      teamSize: '2-3 students'
    },
    {
      id: '3',
      title: 'Blockchain Certificate Verification',
      description: 'Implement a blockchain system for verifying academic certificates to prevent fraud.',
      teacher: 'Dr. Michael Brown',
      department: 'Computer Science',
      postedAt: '1 week ago',
      tags: ['Blockchain', 'Security', 'Web Development'],
      email: 'michael.b@university.edu',
      requirements: ['Solidity', 'Web3.js', 'React', 'Node.js'],
      duration: '5 months',
      teamSize: '2-3 students'
    },
    {
      id: '4',
      title: 'E-Commerce Platform with AI',
      description: 'Build an e-commerce platform with AI-powered product recommendations and chatbot support.',
      teacher: 'Dr. Emily Davis',
      department: 'Data Science',
      postedAt: '4 days ago',
      tags: ['E-Commerce', 'AI', 'Chatbot'],
      email: 'emily.d@university.edu',
      requirements: ['Python', 'Django', 'TensorFlow', 'PostgreSQL'],
      duration: '6 months',
      teamSize: '3-4 students'
    }
  ];

  // Use real projects from API, fall back to mock if empty
  const projectsToDisplay = allProjects.length > 0 ? allProjects : mockProjects;

  // Map API projects to the format expected by the UI
  const formattedProjects = projectsToDisplay.map(project => {
    const requirementsStr = project.requirements ? String(project.requirements) : '';
    const requirementsArray = requirementsStr ? requirementsStr.split(',').map(r => r.trim()).filter(r => r) : [];
    
    return {
      id: project.id,
      title: project.title,
      description: project.description || '',
      teacher: project.teacher?.name || 'Unknown Teacher',
      department: project.teacher?.department || 'Computer Science',
      postedAt: project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Recently',
      tags: requirementsArray.length > 0 ? [requirementsArray[0]] : ['FYP'],
      email: project.teacher?.email || '',
      requirements: requirementsArray.length > 0 ? requirementsArray : ['No specific requirements'],
      duration: '6 months',
      teamSize: '2-3 students'
    };
  });

  const filteredProjects = formattedProjects.filter(project =>
    project.title.toLowerCase().includes(projectSearch.toLowerCase()) ||
    project.description.toLowerCase().includes(projectSearch.toLowerCase()) ||
    project.teacher.toLowerCase().includes(projectSearch.toLowerCase()) ||
    (project.tags && project.tags.some(tag => tag.toLowerCase().includes(projectSearch.toLowerCase())))
  );

  const handleContactTeacher = (teacherName: string, teacherEmail: string) => {
    // Navigate to the standalone messages page
    router.push('/messages');
  };

  const handleViewDetails = (project) => {
    setSelectedProject(project);
  };

  const closeDetails = () => {
    setSelectedProject(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Available Project Ideas</h3>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loadingProjects ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">Loading projects...</div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No projects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">{project.department}</Badge>
                <span className="text-xs text-gray-500">{project.postedAt}</span>
              </div>
              <CardTitle className="text-lg">{project.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {project.description}
              </p>
              <div className="flex flex-wrap gap-1 mb-4">
                {project.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Posted by:</span> {project.teacher}
                </div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleViewDetails(project)}
                    className="px-4 py-2 h-9 text-xs font-medium"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View Details
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleContactTeacher(project.teacher, project.email)}
                    className="px-4 py-2 h-9 text-xs font-medium"
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    Contact
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {/* Project Details Dialog */}
      {selectedProject && (
        <Dialog open={!!selectedProject} onOpenChange={closeDetails}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProject.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-gray-600">{selectedProject.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Teacher</h4>
                  <p className="text-gray-600">{selectedProject.teacher}</p>
                  <p className="text-sm text-gray-500">{selectedProject.email}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Department</h4>
                  <p className="text-gray-600">{selectedProject.department}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Duration</h4>
                  <p className="text-gray-600">{selectedProject.duration}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Team Size</h4>
                  <p className="text-gray-600">{selectedProject.teamSize}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Technical Requirements</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.requirements.map((req, index) => (
                    <Badge key={index} variant="outline">{req}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedProject.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button 
                  onClick={() => handleContactTeacher(selectedProject.teacher, selectedProject.email)}
                  className="flex-1 px-4 py-2"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Teacher
                </Button>
                <Button variant="outline" onClick={closeDetails} className="px-4 py-2">
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function GroupsManagementContent({ 
  groupSearch, 
  setGroupSearch, 
  groupTab, 
  setGroupTab,
  sentRequests,
  setSentRequests,
  receivedRequests,
  setReceivedRequests,
  handleSendGroupRequest,
  handleAcceptGroupRequest,
  handleRejectGroupRequest,
  handleCancelGroupRequest,
  myGroup,
  loadingMyGroup,
  isEditGroupNameDialogOpen,
  setIsEditGroupNameDialogOpen,
  editGroupNameInput,
  setEditGroupNameInput,
  handleUpdateGroupName,
  isLeaveGroupDialogOpen,
  setIsLeaveGroupDialogOpen,
  user,
  toast,
  loadMyGroup,
  loadGroupRequests
}: {
  groupSearch: string;
  setGroupSearch: (value: string) => void;
  groupTab: string;
  setGroupTab: (value: string) => void;
  sentRequests: any[];
  setSentRequests: (value: any[]) => void;
  receivedRequests: any[];
  setReceivedRequests: (value: any[]) => void;
  handleSendGroupRequest: (studentId: string, studentName: string) => void;
  handleAcceptGroupRequest: (id: number) => void;
  handleRejectGroupRequest: (id: number) => void;
  handleCancelGroupRequest: (id: string) => void;
  myGroup: any;
  loadingMyGroup: boolean;
  isEditGroupNameDialogOpen: boolean;
  setIsEditGroupNameDialogOpen: (value: boolean) => void;
  editGroupNameInput: string;
  setEditGroupNameInput: (value: string) => void;
  handleUpdateGroupName: () => void;
  isLeaveGroupDialogOpen: boolean;
  setIsLeaveGroupDialogOpen: (value: boolean) => void;
  user: any;
  toast: any;
  loadMyGroup: () => Promise<void>;
  loadGroupRequests: (userId: string) => Promise<void>;
}) {
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState('name');
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  // Get current user
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setCurrentUser({ id: parsed.id });
      } catch (err) {
        console.error('Failed to parse user', err);
      }
    }
  }, []);

  // Load students from API
  useEffect(() => {
    if (!currentUser) return;
    fetchStudents();
  }, [currentUser]);

  const fetchStudents = async (query = '', type = 'name') => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      params.append('type', type);
      
      const response = await fetch(`/api/students/search?${params.toString()}`, {
        headers: {
          'x-user-id': currentUser.id
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableStudents(data);
      } else {
        console.error('Failed to fetch students');
        setAvailableStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setAvailableStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    fetchStudents(groupSearch.trim(), searchType);
  };

  const filteredStudents = availableStudents;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-4 sm:mb-6 bg-gray-100 p-1 rounded-lg w-full sm:w-fit">
        <Button 
          variant={groupTab === 'your-group' ? 'default' : 'ghost'} 
          className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
          onClick={() => setGroupTab('your-group')}
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Your Group</span>
          <span className="sm:hidden">Group</span>
        </Button>
        <Button 
          variant={groupTab === 'search' ? 'default' : 'ghost'} 
          className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
          onClick={() => setGroupTab('search')}
        >
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Find Members</span>
          <span className="sm:hidden">Find</span>
        </Button>
        <Button 
          variant={groupTab === 'sent' ? 'default' : 'ghost'} 
          className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
          onClick={() => setGroupTab('sent')}
        >
          <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Sent Requests</span>
          <span className="sm:hidden">Sent</span>
        </Button>
        <Button 
          variant={groupTab === 'received' ? 'default' : 'ghost'} 
          className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
          onClick={() => setGroupTab('received')}
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Received Requests</span>
          <span className="sm:hidden">Received</span>
        </Button>
      </div>

      {/* Your Group Tab */}
      {groupTab === 'your-group' && (
        <div className="space-y-3 sm:space-y-4">
          {loadingMyGroup ? (
            <Card>
              <CardContent className="py-6 sm:py-8">
                <p className="text-center text-xs sm:text-sm text-gray-500">Loading your group...</p>
              </CardContent>
            </Card>
          ) : myGroup ? (
            <>
              {/* Show approval status banner */}
              {!myGroup.isApproved && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="py-2.5 sm:py-3">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-yellow-900">Group Pending Approval</p>
                        <p className="text-xs text-yellow-700 mt-0.5">
                          Your group needs to be approved by the committee before you can proceed with project proposals.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Show deadline warning if group has only one member and deadline is set */}
              {myGroup.addMemberDeadline && myGroup.memberCount === 1 && (
                <Card className="border-red-300 bg-red-50">
                  <CardContent className="py-2.5 sm:py-3">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-red-900">⚠️ Action Required: Add Group Member</p>
                        <p className="text-xs text-red-700 mt-1">
                          Your group "{myGroup.name}" now has only one member. You must add another member by{' '}
                          <strong>{new Date(myGroup.addMemberDeadline).toLocaleDateString()} at {new Date(myGroup.addMemberDeadline).toLocaleTimeString()}</strong>{' '}
                          to continue with the project.
                        </p>
                        <p className="text-[10px] sm:text-xs text-red-600 mt-1.5">
                          A member was removed due to proof submission rejection. Use the "Find Members" tab to send group requests.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {myGroup.isApproved && (
              <Card>
                <CardHeader className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                    <CardTitle className="flex items-center text-sm sm:text-base">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                      <span className="truncate">{myGroup.name}</span>
                      <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 border-green-300 text-[10px] sm:text-xs">
                        Approved
                      </Badge>
                    </CardTitle>
                    <div className="flex gap-2">
                      {myGroup.isLeader && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditGroupNameInput(myGroup.name);
                            setIsEditGroupNameDialogOpen(true);
                          }}
                          className="text-xs h-7 sm:h-8 px-2 sm:px-3"
                        >
                          <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                          <span className="hidden sm:inline">Edit Name</span>
                          <span className="sm:hidden">Edit</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-3 sm:space-y-4">
                    {/* Group Info */}
                    <div className="flex items-center justify-between p-2.5 sm:p-3 bg-blue-50 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-gray-600">
                          {myGroup.isLeader ? 'You are the Group Leader' : 'You are a Group Member'}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                          {myGroup.memberCount}/3 Members
                        </p>
                      </div>
                      <Badge variant={myGroup.isLeader ? "default" : "secondary"} className="text-[10px] sm:text-xs flex-shrink-0">
                        {myGroup.isLeader ? 'Leader' : 'Member'}
                      </Badge>
                    </div>

                    {/* Supervisor Section */}
                    {myGroup.supervisor && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Supervisor</h4>
                        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={myGroup.supervisor.profileImage || ''} alt={myGroup.supervisor.name} />
                            <AvatarFallback className="bg-green-600 text-white">
                              {myGroup.supervisor.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{myGroup.supervisor.name}</p>
                            <p className="text-xs text-gray-600">{myGroup.supervisor.email}</p>
                            {myGroup.supervisor.department && (
                              <p className="text-xs text-gray-500">{myGroup.supervisor.department}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            Supervisor
                          </Badge>
                        </div>
                      </div>
                    )}
                    
                    {/* Group Members */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        Group Members ({myGroup.memberCount}/3)
                      </h4>
                      <div className="space-y-2">
                        {myGroup.members.map((member: any) => (
                          <div 
                            key={member.id} 
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={member.profileImage || ''} alt={member.name} />
                                <AvatarFallback className="bg-blue-600 text-white">
                                  {member.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{member.name}</p>
                                <p className="text-xs text-gray-500">{member.rollNumber}</p>
                                {member.email && (
                                  <p className="text-xs text-gray-400">{member.email}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {member.isLeader && (
                                <Badge variant="secondary" className="text-xs">Leader</Badge>
                              )}
                              {member.department && (
                                <Badge variant="outline" className="text-xs">{member.department}</Badge>
                              )}
                              {/* Leader can remove other members */}
                              {myGroup.isLeader && !member.isLeader && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={async () => {
                                    if (!confirm(`Are you sure you want to remove ${member.name} from the group?`)) {
                                      return;
                                    }
                                    
                                    try {
                                      const response = await fetch(`/api/groups/${myGroup.id}/members/${member.id}`, {
                                        method: 'DELETE',
                                        headers: {
                                          'x-user-id': user.id
                                        }
                                      });

                                      const data = await response.json();

                                      if (response.ok) {
                                        toast({
                                          title: 'Success',
                                          description: `${member.name} has been removed from the group`
                                        });
                                        await loadMyGroup();
                                      } else {
                                        toast({
                                          title: 'Error',
                                          description: data.error || 'Failed to remove member',
                                          variant: 'destructive'
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Error removing member:', error);
                                      toast({
                                        title: 'Error',
                                        description: 'Failed to remove member',
                                        variant: 'destructive'
                                      });
                                    }
                                  }}
                                >
                                  <UserMinus className="w-3 h-3 mr-1" />
                                  Remove
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Warning if group is not complete */}
                    {myGroup.memberCount < 3 && (
                      <div className="text-sm text-gray-700 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <div className="flex items-start space-x-2">
                          <Users className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-yellow-800">Group Incomplete</p>
                            <p className="text-yellow-700 mt-1">
                              Your group needs {3 - myGroup.memberCount} more member(s) to reach the maximum capacity.
                              Use the "Find Members" tab to send group requests.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Leave Group Button - Available for all members */}
                    <div className="pt-4 border-t">
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => setIsLeaveGroupDialogOpen(true)}
                      >
                        <UserMinus className="w-4 h-4 mr-2" />
                        Leave Group
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <Users className="w-16 h-16 text-gray-300 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">No Group Yet</h3>
                    <p className="text-sm text-gray-600 mt-2">
                      You haven't joined a group yet. Use the "Find Members" tab to search for students and send group requests.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setGroupTab('search')}
                    className="mt-4"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Find Members
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Leave Group Confirmation Dialog */}
      <AlertDialog open={isLeaveGroupDialogOpen} onOpenChange={setIsLeaveGroupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this group? This action cannot be undone.
              {myGroup && myGroup.memberCount <= 2 && (
                <span className="block mt-2 text-red-600 font-medium">
                  Warning: The group will be deactivated as it will have less than 2 members.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!user || !myGroup) return;
                
                try {
                  const response = await fetch(`/api/groups/${myGroup.id}/leave`, {
                    method: 'DELETE',
                    headers: {
                      'x-user-id': user.id
                    }
                  });

                  const data = await response.json();

                  if (response.ok) {
                    toast({
                      title: 'Success',
                      description: 'You have left the group successfully'
                    });
                    await loadMyGroup();
                    if (user?.id) {
                      await loadGroupRequests(user.id);
                    }
                    // Refresh the student search results
                    fetchStudents(groupSearch.trim(), searchType);
                    setIsLeaveGroupDialogOpen(false);
                  } else {
                    toast({
                      title: 'Error',
                      description: data.error || 'Failed to leave group',
                      variant: 'destructive'
                    });
                  }
                } catch (error) {
                  console.error('Error leaving group:', error);
                  toast({
                    title: 'Error',
                    description: 'Failed to leave group',
                    variant: 'destructive'
                  });
                }
              }}
            >
              Leave Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {groupTab === 'search' && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isLoading ? 'Loading...' : `Available Students (${availableStudents.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4 mb-6">
              <select 
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
              >
                <option value="name">Search by Name</option>
                <option value="rollNumber">Search by Roll Number</option>
              </select>
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder={searchType === 'name' ? 'Enter student name...' : 'Enter roll number...'}
                  className="pl-10"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  disabled={isLoading}
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading}>
                <Search className="w-4 h-4 mr-2" />
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading students...</p>
                </div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                <p className="text-gray-600">
                  {groupSearch 
                    ? 'Try adjusting your search criteria' 
                    : 'No students are available at the moment'}
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{filteredStudents.map((student) => {
              const pendingRequest = sentRequests.find(req => req.toUserId === student.id && req.status === 'PENDING');
              const acceptedRequest = sentRequests.find(req => req.toUserId === student.id && req.status === 'ACCEPTED');
              const isInGroup = student.isInGroup;
              
              // If student is NOT in group but has accepted request, they must have left - allow resending
              const canSendRequest = !isInGroup && !pendingRequest;
              const showAcceptedButLeft = !isInGroup && acceptedRequest;
              
              return (
                <Card key={student.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{student.name}</h3>
                        <p className="text-sm text-gray-600">Roll: {student.rollNumber}</p>
                        <p className="text-sm text-gray-500">{student.department}</p>
                        <p className="text-sm text-gray-500">GPA: {student.gpa}</p>
                        {isInGroup && student.currentGroup && (
                          <p className="text-xs text-blue-600 mt-1">
                            📌 {student.currentGroup.name}
                          </p>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => canSendRequest && handleSendGroupRequest(student.id, student.name)}
                        disabled={!canSendRequest || isInGroup}
                        className={
                          isInGroup
                            ? 'bg-gray-400 cursor-not-allowed'
                            : showAcceptedButLeft
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                            : ''
                        }
                      >
                        {isInGroup
                          ? 'Already in Group'
                          : showAcceptedButLeft
                          ? 'Send New Request'
                          : pendingRequest
                          ? 'Requested'
                          : 'Send Request'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
            )}
          </CardContent>
        </Card>
      )}

      {groupTab === 'sent' && (
        <Card>
          <CardHeader>
            <CardTitle>Sent Group Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {sentRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No group requests sent yet.</p>
            ) : (
              <div className="space-y-4">
                {sentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{request.name}</h4>
                      <p className="text-sm text-gray-500">Roll: {request.rollNumber}</p>
                      <p className="text-sm text-gray-500">Sent on {request.date}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          request.status === 'ACCEPTED' ? 'default' : 
                          request.status === 'REJECTED' ? 'destructive' : 
                          'secondary'
                        }
                        className={
                          request.status === 'ACCEPTED' ? 'bg-green-500 hover:bg-green-600' : ''
                        }
                      >
                        {request.status}
                      </Badge>
                      {(request.status === 'PENDING' || request.status === 'ACCEPTED') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCancelGroupRequest(request.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {groupTab === 'received' && (
        <Card>
          <CardHeader>
            <CardTitle>Received Group Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {receivedRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No group requests received yet.</p>
            ) : (
              <div className="space-y-4">
                {receivedRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{request.name}</h4>
                      <p className="text-sm text-gray-500">Roll: {request.rollNumber}</p>
                      <p className="text-sm text-gray-500">Received on {request.date}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          request.status === 'ACCEPTED' ? 'default' : 
                          request.status === 'REJECTED' ? 'destructive' : 
                          'secondary'
                        }
                        className={
                          request.status === 'ACCEPTED' ? 'bg-green-500 hover:bg-green-600' : ''
                        }
                      >
                        {request.status}
                      </Badge>
                      {request.status === 'PENDING' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => handleAcceptGroupRequest(request.id)}
                          >
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRejectGroupRequest(request.id)}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Group Name Dialog */}
      <Dialog open={isEditGroupNameDialogOpen} onOpenChange={setIsEditGroupNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group Name</DialogTitle>
            <DialogDescription>
              Change your group's name. Only the group leader can modify the group name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="Enter new group name"
                value={editGroupNameInput}
                onChange={(e) => setEditGroupNameInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdateGroupName();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditGroupNameDialogOpen(false);
                setEditGroupNameInput('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateGroupName}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SupervisorContent({ 
  supervisorSearch, 
  setSupervisorSearch, 
  supervisorTab, 
  setSupervisorTab,
  supervisorRequests,
  setSupervisorRequests,
  currentSupervisor,
  setCurrentSupervisor,
  handleSupervisorRequest,
  setActiveSection,
  router,
  myGroup,
  user
}: {
  supervisorSearch: string;
  setSupervisorSearch: (value: string) => void;
  supervisorTab: string;
  setSupervisorTab: (value: string) => void;
  supervisorRequests: any[];
  setSupervisorRequests: (value: any[]) => void;
  currentSupervisor: any;
  setCurrentSupervisor: (value: any) => void;
  handleSupervisorRequest: (teacherId: string, teacherName: string) => void;
  setActiveSection: (section: string) => void;
  router: any;
  myGroup: any;
  user: any;
}) {
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Check if current user is group leader
  const isGroupLeader = myGroup?.members?.find((m: any) => m.id === user?.id)?.isLeader || false;

  // Load teachers from API
  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async (query = '') => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      
      const response = await fetch(`/api/teachers/search?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        setAvailableTeachers(data);
      } else {
        console.error('Failed to fetch teachers');
        setAvailableTeachers([]);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setAvailableTeachers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    fetchTeachers(supervisorSearch.trim());
  };

  const filteredTeachers = availableTeachers;

  return (
    <div className="space-y-6">
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <Button 
          variant={supervisorTab === 'find' ? 'default' : 'ghost'} 
          className="flex items-center space-x-2"
          onClick={() => setSupervisorTab('find')}
        >
          <Search className="w-4 h-4" />
          <span>Find Supervisor</span>
        </Button>
        <Button 
          variant={supervisorTab === 'requests' ? 'default' : 'ghost'} 
          className="flex items-center space-x-2"
          onClick={() => setSupervisorTab('requests')}
        >
          <Mail className="w-4 h-4" />
          <span>My Requests</span>
        </Button>
        <Button 
          variant={supervisorTab === 'current' ? 'default' : 'ghost'} 
          className="flex items-center space-x-2"
          onClick={() => setSupervisorTab('current')}
        >
          <User className="w-4 h-4" />
          <span>Current Supervisor</span>
        </Button>
      </div>

      {supervisorTab === 'find' && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isLoading ? 'Loading...' : `Available Supervisors (${availableTeachers.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentSupervisor && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2 text-yellow-800">
                  <User className="w-5 h-5" />
                  <p className="font-medium">
                    Your group already has a supervisor: {currentSupervisor.name}
                  </p>
                </div>
                <p className="text-sm text-yellow-700 mt-1 ml-7">
                  You cannot send requests to other supervisors.
                </p>
              </div>
            )}
            <div className="flex space-x-4 mb-6">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Enter supervisor name..."
                  className="pl-10"
                  value={supervisorSearch}
                  onChange={(e) => setSupervisorSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  disabled={isLoading || !!currentSupervisor}
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading || !!currentSupervisor}>
                <Search className="w-4 h-4 mr-2" />
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading supervisors...</p>
                </div>
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No supervisors found</h3>
                <p className="text-gray-600">
                  {supervisorSearch 
                    ? 'Try adjusting your search criteria' 
                    : 'No supervisors are available at the moment'}
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{filteredTeachers.map((teacher) => (
                <Card key={teacher.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{teacher.name}</h3>
                        <p className="text-sm text-gray-600">{teacher.department}</p>
                        <p className="text-sm text-gray-500">Specialization: {teacher.specialization}</p>
                        <p className="text-xs text-gray-400 mt-1">{teacher.email}</p>
                        {teacher.currentSupervising !== undefined && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-blue-600">
                              Supervising: {teacher.currentSupervising}/{teacher.maxSupervising} groups
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  teacher.currentSupervising >= teacher.maxSupervising 
                                    ? 'bg-red-500' 
                                    : 'bg-blue-500'
                                }`}
                                style={{ width: `${(teacher.currentSupervising / teacher.maxSupervising) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          if (!isGroupLeader) {
                            toast({
                              title: "Access Denied",
                              description: "Only the group leader can send supervisor requests",
                              variant: "destructive"
                            });
                            return;
                          }
                          handleSupervisorRequest(teacher.id, teacher.name);
                        }}
                        disabled={
                          !isGroupLeader ||
                          !!currentSupervisor ||
                          supervisorRequests.some(req => req.teacherId === teacher.id)
                        }
                        title={!isGroupLeader ? "Only group leader can send requests" : ""}
                        className={
                          supervisorRequests.find(req => req.teacherId === teacher.id && req.status === 'ACCEPTED')
                            ? 'bg-green-500 hover:bg-green-600'
                            : currentSupervisor || !isGroupLeader
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }
                      >
                        {!isGroupLeader 
                          ? '🔒 Leader Only'
                          : currentSupervisor && supervisorRequests.find(req => req.teacherId === teacher.id && req.status === 'ACCEPTED')
                          ? 'Your Supervisor'
                          : currentSupervisor
                          ? 'Send Request'
                          : supervisorRequests.find(req => req.teacherId === teacher.id)?.status === 'ACCEPTED'
                          ? 'Your Supervisor'
                          : supervisorRequests.some(req => req.teacherId === teacher.id)
                          ? 'Requested'
                          : 'Send Request'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            )}
          </CardContent>
        </Card>
      )}

      {supervisorTab === 'requests' && (
        <Card>
          <CardHeader>
            <CardTitle>Group Supervision Requests</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              All requests sent by your group members are shown here
            </p>
          </CardHeader>
          <CardContent>
            {supervisorRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No supervision requests sent yet.</p>
            ) : (
              <div className="space-y-4">
                {supervisorRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{request.name || request.teacher?.name}</h4>
                      <p className="text-sm text-gray-500">
                        Requested by {request.student?.name || 'You'} on {request.date}
                      </p>
                      {request.teacher?.department && (
                        <p className="text-xs text-gray-400 mt-1">
                          {request.teacher.department}
                        </p>
                      )}
                    </div>
                    <Badge 
                      variant={
                        request.status === 'ACCEPTED' ? 'default' : 
                        request.status === 'REJECTED' ? 'destructive' : 
                        'secondary'
                      }
                      className={
                        request.status === 'ACCEPTED' ? 'bg-green-500 hover:bg-green-600' : ''
                      }
                    >
                      {request.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {supervisorTab === 'current' && (
        <Card>
          <CardHeader>
            <CardTitle>Current Supervisor</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              This supervisor is assigned to your entire group
            </p>
          </CardHeader>
          <CardContent>
            {currentSupervisor ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-green-800 mb-2">
                    <CheckCheck className="w-5 h-5" />
                    <p className="font-medium">Supervision Confirmed</p>
                  </div>
                  <p className="text-sm text-green-700 ml-7">
                    Your group has an assigned supervisor
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={currentSupervisor.profileImage || ''} alt={currentSupervisor.name} />
                    <AvatarFallback className="bg-green-600 text-white text-xl">
                      {currentSupervisor.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{currentSupervisor.name}</h3>
                    <p className="text-gray-600">{currentSupervisor.department}</p>
                    <p className="text-sm text-gray-500">{currentSupervisor.email}</p>
                    {currentSupervisor.specialization && currentSupervisor.specialization !== 'N/A' && (
                      <p className="text-xs text-gray-400 mt-1">
                        Specialization: {currentSupervisor.specialization}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm"
                    onClick={() => router.push('/messages')}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => router.push('/schedule-meeting')}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Meeting
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You don't have a supervisor yet.</p>
                <Button onClick={() => setSupervisorTab('find')}>
                  Find a Supervisor
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MessagesContent({ 
  selectedConversation, 
  setSelectedConversation, 
  messageInput, 
  setMessageInput, 
  conversations, 
  setConversations,
  myGroup
}: {
  selectedConversation: number;
  setSelectedConversation: (value: number) => void;
  messageInput: string;
  setMessageInput: (value: string) => void;
  conversations: any[];
  setConversations: (value: React.SetStateAction<any[]>) => void;
  myGroup: any;
}) {
  const currentConv = conversations[selectedConversation];
  
  const handleSendMessage = () => {
    if (messageInput.trim()) {
      const newMessage = {
        id: Date.now(),
        sender: 'me',
        text: messageInput,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: true
      };
      
      setConversations((prev: any[]) => prev.map(conv => {
        if (conv.id === selectedConversation) {
          return {
            ...conv,
            messages: [...conv.messages, newMessage],
            message: messageInput,
            time: 'Just now'
          };
        }
        return conv;
      }));
      
      setMessageInput('');
    }
  };

  const handleSelectConversation = (convId) => {
    setSelectedConversation(convId);
    // Mark messages as read
    setConversations((prev: any[]) => prev.map(conv => {
      if (conv.id === convId) {
        return { ...conv, unread: 0 };
      }
      return conv;
    }));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex h-[600px] bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Conversations List */}
        <div className="w-80 border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Conversations</h3>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {conversations.map((conv) => (
                <div 
                  key={conv.id} 
                  className={`p-3 hover:bg-gray-50 rounded-lg cursor-pointer ${selectedConversation === conv.id ? 'bg-blue-50' : ''}`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 truncate">{conv.name}</p>
                        <span className="text-xs text-gray-500">{conv.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate">{conv.message}</p>
                        {conv.unread > 0 && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            {conv.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
              <div>
                <h2 className="font-semibold text-gray-900">{currentConv.name}</h2>
                <p className="text-sm text-gray-500">
                  {currentConv.role === 'Group' ? `${myGroup.members.length} members` : 'Active now'}
                </p>
              </div>
            </div>
          </div>

          {/* Group Members Section - Only show for group chats */}
          {currentConv.role === 'Group' && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Group Members</h3>
              <div className="space-y-2">
                {myGroup.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          member.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.rollNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {member.role === 'Leader' && (
                        <Badge variant="secondary" className="text-xs">Leader</Badge>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        member.status === 'online' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {member.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {currentConv.messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'me' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {/* Show sender name for group messages */}
                    {currentConv.role === 'Group' && message.sender !== 'me' && (
                      <p className="text-xs font-semibold mb-1 text-gray-600">
                        {message.text.split(':')[0]}
                      </p>
                    )}
                    <p className="text-sm">{message.text}</p>
                    <div className={`flex items-center justify-end space-x-1 mt-1 ${
                      message.sender === 'me' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <span className="text-xs">{message.time}</span>
                      {message.sender === 'me' && message.read && <CheckCheck className="w-3 h-3" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <Input 
                placeholder="Type a message..." 
                className="flex-1" 
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button size="icon" onClick={handleSendMessage}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadProposalContent({ 
  myGroup,
  user,
  toast,
  loadingMyGroup
}: {
  myGroup: any;
  user: any;
  toast: any;
  loadingMyGroup: boolean;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedWeeklyReportFile, setSelectedWeeklyReportFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [weeklyReportDragActive, setWeeklyReportDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingWeeklyReport, setIsUploadingWeeklyReport] = useState(false);
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const weeklyReportInputRef = useRef<HTMLInputElement>(null);
  const [weeklyReportWeek, setWeeklyReportWeek] = useState<string>('');
  const [projectStatus, setProjectStatus] = useState<string>('');
  const [uploadType, setUploadType] = useState<'proposal' | 'report' | 'documentation'>('proposal');
  
  const [proposalData, setProposalData] = useState({
    title: '',
    projectTrack: 'Product', // Product, Service, Research & Development
    programOfStudy: '',
    session: '',
    domain: '',
    date: new Date().toISOString().split('T')[0], // Default to today
    members: [
      { name: '', cmsId: '', cellNumber: '', email: '' },
      { name: '', cmsId: '', cellNumber: '', email: '' },
      { name: '', cmsId: '', cellNumber: '', email: '' }
    ]
  });

  const [reportData, setReportData] = useState({
    title: '',
    description: ''
  });

  // Check if current user is group leader
  const isGroupLeader = myGroup?.members?.find((m: any) => m.id === user?.id)?.isLeader || false;

  useEffect(() => {
    loadRecentUploads();
    checkProjectStatus();
  }, [myGroup]);

  const checkProjectStatus = async () => {
    if (!myGroup?.projectId) return;
    try {
      // Check if there are any FYP I submissions or if project status indicates FYP I
      const response = await fetch('/api/files', {
        headers: {
          'x-user-id': user?.id || '',
        },
      });
      if (response.ok) {
        const data = await response.json();
        const groupFiles = (data.files || []).filter((file: any) => {
          const isInSameGroup = myGroup.members?.some((m: any) => m.id === file.studentId || m.userId === file.studentId);
          return isInSameGroup;
        });
        
        // Check if there's an accepted proposal defense or FYP I status
        const hasAcceptedProposal = groupFiles.some((f: any) => 
          f.fileType === 'PROPOSAL' && 
          (f.status === 'ADMIN_APPROVED' || f.status === 'COMMITTEE_APPROVED')
        );
        
        // Check if there are FYP I files or weekly reports
        const hasFypIFiles = groupFiles.some((f: any) => 
          f.fileType === 'FYP_I' || f.fileType === 'WEEKLY_REPORT'
        );
        
        if (hasAcceptedProposal || hasFypIFiles) {
          setProjectStatus('FYP_I');
        }
      }
    } catch (error) {
      console.error('Error checking project status:', error);
    }
  };

  const loadRecentUploads = async () => {
    if (!myGroup?.id || !user?.id) return;
    
    setLoadingFiles(true);
    try {
      const response = await fetch('/api/files', {
        headers: {
          'x-user-id': user.id,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Filter files to only show from current user's group
        const groupFiles = (data.files || []).filter((file: any) => {
          // Check if the file's student is in the same group
          const isInSameGroup = myGroup.members?.some((m: any) => m.id === file.studentId || m.userId === file.studentId);
          return isInSameGroup;
        }).map((file: any) => ({
          id: file.id,
          name: file.fileName || file.name,
          uploadedAt: file.createdAt || file.uploadedAt,
          fileType: file.fileType,
          status: file.status,
          supervisorApprovalStatus: file.supervisorApprovalStatus || 'PENDING',
          fileUrl: file.fileUrl,
          studentName: file.student?.name || 'Unknown'
        }));
        setRecentUploads(groupFiles);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleWeeklyReportDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setWeeklyReportDragActive(true);
    } else if (e.type === "dragleave") {
      setWeeklyReportDragActive(false);
    }
  };

  const handleWeeklyReportDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWeeklyReportDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedWeeklyReportFile(e.dataTransfer.files[0]);
    }
  };

  const handleWeeklyReportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedWeeklyReportFile(e.target.files[0]);
    }
  };

  const handleWeeklyReportUpload = async () => {
    if (!isGroupLeader) {
      toast({
        title: "Access Denied",
        description: "Only the group leader can upload weekly reports",
        variant: "destructive"
      });
      return;
    }

    if (!selectedWeeklyReportFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    if (!weeklyReportWeek) {
      toast({
        title: "Week Number Required",
        description: "Please enter the week number",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingWeeklyReport(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedWeeklyReportFile);
      formData.append('fileType', 'WEEKLY_REPORT');
      formData.append('type', 'weekly-report');
      formData.append('userId', user.id);
      formData.append('userName', user.name);
      formData.append('projectId', myGroup.projectId || '');
      formData.append('projectTitle', myGroup.project?.title || 'Weekly Report');
      formData.append('description', `Weekly Report - Week ${weeklyReportWeek}`);
      formData.append('version', weeklyReportWeek); // Store week number in version field

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      toast({
        title: "Upload Successful",
        description: `Weekly report for Week ${weeklyReportWeek} has been uploaded successfully`,
      });

      // Reset form
      setSelectedWeeklyReportFile(null);
      setWeeklyReportWeek('');
      if (weeklyReportInputRef.current) {
        weeklyReportInputRef.current.value = '';
      }

      // Reload uploads
      await loadRecentUploads();

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingWeeklyReport(false);
    }
  };

  const handleUpload = async () => {
    if (!isGroupLeader) {
      toast({
        title: "Access Denied",
        description: "Only the group leader can upload files",
        variant: "destructive"
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

      // Validation based on upload type
    if (uploadType === 'proposal') {
      if (!proposalData.title || !proposalData.programOfStudy || !proposalData.session || !proposalData.domain) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields (Title, Program of Study, Session, Domain)",
          variant: "destructive"
        });
        return;
      }
      // Validate at least first member (team lead) is filled
      if (!proposalData.members[0].name || !proposalData.members[0].cmsId || !proposalData.members[0].email) {
        toast({
          title: "Missing Information",
          description: "Please fill in at least the team lead's information (Name, CMS ID, Email)",
          variant: "destructive"
        });
        return;
      }
    } else if (uploadType === 'report' || uploadType === 'documentation') {
      if (!reportData.title || !reportData.description) {
        toast({
          title: "Missing Information",
          description: "Please provide a title and description",
          variant: "destructive"
        });
        return;
      }
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Set file type based on upload type
      if (uploadType === 'proposal') {
        formData.append('fileType', 'PROPOSAL');
        formData.append('type', 'proposal');
        formData.append('projectTitle', proposalData.title);
        
        // Add proposal form data as description (JSON format for structured data)
        const proposalFormData = {
          projectTrack: proposalData.projectTrack,
          programOfStudy: proposalData.programOfStudy,
          session: proposalData.session,
          domain: proposalData.domain,
          date: proposalData.date,
          members: proposalData.members.filter(m => m.name || m.cmsId || m.email) // Only include filled members
        };
        
        formData.append('description', JSON.stringify(proposalFormData));
      } else if (uploadType === 'report') {
        formData.append('fileType', 'REPORT');
        formData.append('type', 'report');
        formData.append('projectTitle', reportData.title);
        formData.append('description', reportData.description);
      } else if (uploadType === 'documentation') {
        formData.append('fileType', 'DOCUMENTATION');
        formData.append('type', 'documentation');
        formData.append('projectTitle', reportData.title);
        formData.append('description', reportData.description);
      }
      
      formData.append('userId', user.id);
      formData.append('userName', user.name);
      formData.append('projectId', myGroup.projectId || '');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      toast({
        title: "Upload Successful",
        description: `${selectedFile.name} has been uploaded successfully`,
      });

      // Reset form
      setSelectedFile(null);
      setUploadType('proposal');
      setProposalData({
        title: '',
        projectTrack: 'Product',
        programOfStudy: '',
        session: '',
        domain: '',
        date: new Date().toISOString().split('T')[0],
        members: [
          { name: '', cmsId: '', cellNumber: '', email: '' },
          { name: '', cmsId: '', cellNumber: '', email: '' },
          { name: '', cmsId: '', cellNumber: '', email: '' }
        ]
      });
      setReportData({
        title: '',
        description: ''
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Reload uploads
      await loadRecentUploads();

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const [fileToDelete, setFileToDelete] = useState<any>(null);

  const handleViewFile = (file: any) => {
    if (file.fileUrl) {
      window.open(file.fileUrl, '_blank');
    }
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      const response = await fetch(`/api/files/${fileToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "File Deleted",
          description: "The file has been successfully deleted",
        });
        await loadRecentUploads();
      } else {
        throw new Error('Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Failed to delete file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setFileToDelete(null);
    }
  };

  // Show loading state while checking for group
  if (loadingMyGroup) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading group information...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message if no group found after loading
  if (!myGroup) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Group Found</h3>
              <p className="text-gray-600">
                You need to be part of a group to upload proposals.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Proposal Submission Form</h1>
        <p className="text-gray-600 mt-1">Department of Computing - Final Year Project Proposal Submission Form</p>
      </div>

      {!isGroupLeader && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-yellow-800">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">
                Only the group leader can upload proposals
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5" />
              <span>{uploadType === 'proposal' ? 'Proposal Submission Form' : uploadType === 'report' ? 'Upload Report' : 'Upload Documentation'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Type Selection */}
            <div>
              <Label htmlFor="upload-type">Upload Type *</Label>
              <Select 
                value={uploadType} 
                onValueChange={(value: 'proposal' | 'report' | 'documentation') => {
                  setUploadType(value);
                  // Reset form data when changing type
                  setSelectedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                disabled={!isGroupLeader}
              >
                <SelectTrigger id="upload-type">
                  <SelectValue placeholder="Select upload type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposal">Proposal Submission Form</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              } ${!isGroupLeader ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={isGroupLeader ? handleDrop : undefined}
              onClick={() => isGroupLeader && fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-1">
                {selectedFile ? selectedFile.name : 'Drag and drop your file here, or click to browse'}
              </p>
              <p className="text-sm text-gray-500">
                Supported formats: PDF, DOC, DOCX (Max 10MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                disabled={!isGroupLeader}
              />
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Conditional Form Fields Based on Upload Type */}
            {uploadType === 'proposal' ? (
              <>
                <div className="space-y-4 pt-4 border-t">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Project Details: (to be filled-in by student)</p>
                  </div>

                  <div>
                    <Label>Project Title *</Label>
                    <Input
                      value={proposalData.title}
                      onChange={(e) => setProposalData({...proposalData, title: e.target.value})}
                      placeholder="Enter project title"
                      disabled={!isGroupLeader}
                    />
                  </div>

                  <div>
                    <Label>Project Track *</Label>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="projectTrack"
                          value="Product"
                          checked={proposalData.projectTrack === 'Product'}
                          onChange={(e) => setProposalData({...proposalData, projectTrack: e.target.value})}
                          disabled={!isGroupLeader}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Product</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="projectTrack"
                          value="Service"
                          checked={proposalData.projectTrack === 'Service'}
                          onChange={(e) => setProposalData({...proposalData, projectTrack: e.target.value})}
                          disabled={!isGroupLeader}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Service</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="projectTrack"
                          value="Research & Development"
                          checked={proposalData.projectTrack === 'Research & Development'}
                          onChange={(e) => setProposalData({...proposalData, projectTrack: e.target.value})}
                          disabled={!isGroupLeader}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Research & Development</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Program of Study *</Label>
                      <Input
                        value={proposalData.programOfStudy}
                        onChange={(e) => setProposalData({...proposalData, programOfStudy: e.target.value})}
                        placeholder="e.g., BS Computer Science"
                        disabled={!isGroupLeader}
                      />
                    </div>
                    <div>
                      <Label>Session *</Label>
                      <Input
                        value={proposalData.session}
                        onChange={(e) => setProposalData({...proposalData, session: e.target.value})}
                        placeholder="e.g., Fall 2025"
                        disabled={!isGroupLeader}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Domain / Area of Project *</Label>
                      <Input
                        value={proposalData.domain}
                        onChange={(e) => setProposalData({...proposalData, domain: e.target.value})}
                        placeholder="e.g., Web Development, AI, Mobile Apps"
                        disabled={!isGroupLeader}
                      />
                    </div>
                    <div>
                      <Label>Date *</Label>
                      <Input
                        type="date"
                        value={proposalData.date}
                        onChange={(e) => setProposalData({...proposalData, date: e.target.value})}
                        disabled={!isGroupLeader}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Label className="mb-3 block">Project Member(s): (to be filled-in by student; student #1 is the team lead) *</Label>
                    <div className="space-y-4">
                      {proposalData.members.map((member, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                          <p className="text-sm font-semibold mb-3">Student #{index + 1} {index === 0 && '(Team Lead)'}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Name *</Label>
                              <Input
                                value={member.name}
                                onChange={(e) => {
                                  const newMembers = [...proposalData.members];
                                  newMembers[index].name = e.target.value;
                                  setProposalData({...proposalData, members: newMembers});
                                }}
                                placeholder="Full name"
                                disabled={!isGroupLeader}
                              />
                            </div>
                            <div>
                              <Label>CMS ID *</Label>
                              <Input
                                value={member.cmsId}
                                onChange={(e) => {
                                  const newMembers = [...proposalData.members];
                                  newMembers[index].cmsId = e.target.value;
                                  setProposalData({...proposalData, members: newMembers});
                                }}
                                placeholder="CMS ID"
                                disabled={!isGroupLeader}
                              />
                            </div>
                            <div>
                              <Label>Cell #</Label>
                              <Input
                                value={member.cellNumber}
                                onChange={(e) => {
                                  const newMembers = [...proposalData.members];
                                  newMembers[index].cellNumber = e.target.value;
                                  setProposalData({...proposalData, members: newMembers});
                                }}
                                placeholder="Phone number"
                                disabled={!isGroupLeader}
                              />
                            </div>
                            <div>
                              <Label>E-mail ID *</Label>
                              <Input
                                type="email"
                                value={member.email}
                                onChange={(e) => {
                                  const newMembers = [...proposalData.members];
                                  newMembers[index].email = e.target.value;
                                  setProposalData({...proposalData, members: newMembers});
                                }}
                                placeholder="Email address"
                                disabled={!isGroupLeader}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t bg-yellow-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Supervisor Recommendation:</p>
                    <p className="text-xs text-gray-600">(This section will be filled by the supervisor after reviewing your proposal)</p>
                  </div>
                </div>
              </>
            ) : (
              /* Report/Documentation Form Fields - Simplified */
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label>Project Title *</Label>
                  <Input
                    value={reportData.title}
                    onChange={(e) => setReportData({...reportData, title: e.target.value})}
                    placeholder="Enter project title"
                    disabled={!isGroupLeader}
                  />
                </div>

                <div>
                  <Label>Description *</Label>
                  <Textarea
                    value={reportData.description}
                    onChange={(e) => setReportData({...reportData, description: e.target.value})}
                    placeholder={`Enter description for ${uploadType === 'report' ? 'report' : 'documentation'}`}
                    rows={5}
                    disabled={!isGroupLeader}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!isGroupLeader || isUploading || !selectedFile}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadType === 'proposal' ? 'Submit Proposal Form' : uploadType === 'report' ? 'Upload Report' : 'Upload Documentation'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Weekly Report Upload Section - Only show if project has proceeded to FYP I */}
        {(projectStatus === 'FYP_I' || projectStatus === 'IN_PROGRESS' || recentUploads.some((f: any) => f.fileType === 'FYP_I' || f.status === 'ACCEPTED')) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Upload Weekly Report</span>
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Submit your weekly progress reports for FYP I execution</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Week Number Input */}
              <div>
                <Label>Week Number *</Label>
                <Input
                  type="number"
                  min="1"
                  value={weeklyReportWeek}
                  onChange={(e) => setWeeklyReportWeek(e.target.value)}
                  placeholder="Enter week number (e.g., 1, 2, 3...)"
                  disabled={!isGroupLeader}
                />
              </div>

              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  weeklyReportDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                } ${!isGroupLeader ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onDragEnter={handleWeeklyReportDrag}
                onDragLeave={handleWeeklyReportDrag}
                onDragOver={handleWeeklyReportDrag}
                onDrop={isGroupLeader ? handleWeeklyReportDrop : undefined}
                onClick={() => isGroupLeader && weeklyReportInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 font-medium mb-1">
                  {selectedWeeklyReportFile ? selectedWeeklyReportFile.name : 'Drag and drop your weekly report here, or click to browse'}
                </p>
                <p className="text-sm text-gray-500">
                  Supported formats: PDF, DOC, DOCX (Max 10MB)
                </p>
                <input
                  ref={weeklyReportInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={handleWeeklyReportFileSelect}
                  disabled={!isGroupLeader}
                />
              </div>

              {selectedWeeklyReportFile && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">{selectedWeeklyReportFile.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(selectedWeeklyReportFile.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWeeklyReportFile(null);
                      if (weeklyReportInputRef.current) weeklyReportInputRef.current.value = '';
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <Button
                onClick={handleWeeklyReportUpload}
                disabled={!isGroupLeader || isUploadingWeeklyReport || !selectedWeeklyReportFile || !weeklyReportWeek}
                className="w-full"
              >
                {isUploadingWeeklyReport ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Weekly Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Uploads - Group Files Only */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Group Uploads</CardTitle>
            <p className="text-sm text-gray-500">Files uploaded by {myGroup.name}</p>
          </CardHeader>
          <CardContent>
            {loadingFiles ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            ) : recentUploads.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No uploads yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentUploads.map((file) => {
                  const isApproved = ['APPROVED', 'ADMIN_APPROVED', 'COMMITTEE_APPROVED'].includes(file.status);
                  // Allow group leaders to delete proposals (even if approved, but with warning)
                  const canDelete = isGroupLeader;
                  const statusColor =
                    file.status === 'ADMIN_APPROVED' || file.status === 'COMMITTEE_APPROVED'
                      ? 'bg-green-100 text-green-700'
                      : file.status === 'REJECTED' || file.status === 'COMMITTEE_REJECTED' || file.status === 'ADMIN_REJECTED'
                      ? 'bg-red-100 text-red-700'
                      : file.status === 'CHANGES_REQUESTED'
                      ? 'bg-yellow-100 text-yellow-700'
                      : file.supervisorApprovalStatus === 'APPROVED' && (file.status === 'PENDING' || file.status === 'APPROVED')
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-yellow-100 text-yellow-700';
                  
                  return (
                  <div key={file.id} className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">by {file.studentName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {file.fileType || 'PROPOSAL'}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewFile(file)}
                          title="View file"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFileToDelete(file)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Professional Delete Confirmation Dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <p>Are you sure you want to delete <span className="font-semibold text-gray-900">{fileToDelete?.name}</span>?</p>
              {fileToDelete && ['APPROVED', 'ADMIN_APPROVED', 'COMMITTEE_APPROVED'].includes(fileToDelete.status) && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Warning: This proposal has been approved
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Deleting an approved proposal may affect your project status. Please proceed with caution.
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">This action cannot be undone. The file will be permanently removed from the system.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFile} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProfileContent({ 
  profileData, 
  setProfileData, 
  profilePicturePreview, 
  setProfilePicturePreview, 
  fileInputRef,
  showSaveConfirmDialog,
  setShowSaveConfirmDialog,
  handleProfileSave
}: {
  profileData: any;
  setProfileData: (value: any) => void;
  profilePicturePreview: string | null;
  setProfilePicturePreview: (value: string | null) => void;
  fileInputRef: any;
  showSaveConfirmDialog: boolean;
  setShowSaveConfirmDialog: (value: boolean) => void;
  handleProfileSave: () => void;
}) {
  const { toast } = useToast();

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload to server immediately
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const userData = localStorage.getItem('user');
        const parsedUser = userData ? JSON.parse(userData) : null;
        
        const response = await fetch(`/api/profile/picture?userId=${parsedUser?.id || ''}`, {
          method: 'POST',
          headers: {
            'x-user-id': parsedUser?.id || '',
          },
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          const profilePicUrl = result.profilePictureUrl;
          
          // Store the server URL in profile data (not the File object)
          setProfileData({ ...profileData, profilePicture: profilePicUrl });
          
          toast({
            title: "Success",
            description: "Profile picture uploaded successfully!",
          });
        } else {
          console.error('Failed to upload profile picture');
          toast({
            title: "Upload Failed",
            description: "Failed to upload profile picture. Please try again.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error uploading profile picture:', error);
        toast({
          title: "Upload Failed",
          description: "Failed to upload profile picture. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const confirmSaveProfile = () => {
    handleProfileSave();
    setShowSaveConfirmDialog(false);
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-gray-300 rounded-full overflow-hidden">
                    {profilePicturePreview ? (
                      <img src={profilePicturePreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Change Photo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{profileData.fullName}</h3>
                  <p className="text-sm text-gray-500">{profileData.department}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input 
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Roll Number</Label>
                  <Input 
                    value={profileData.rollNumber}
                    onChange={(e) => setProfileData({...profileData, rollNumber: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Department</Label>
                  <Input 
                    value={profileData.department}
                    onChange={(e) => setProfileData({...profileData, department: e.target.value})}
                  />
                </div>
                <div>
                  <Label>GPA</Label>
                  <Input 
                    value={profileData.gpa}
                    onChange={(e) => setProfileData({...profileData, gpa: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Semester</Label>
                  <Input 
                    value={profileData.semester}
                    onChange={(e) => setProfileData({...profileData, semester: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input 
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  />
                </div>
              </div>
              
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleProfileSave}>
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showSaveConfirmDialog} onOpenChange={setShowSaveConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Save Changes</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to save the changes to your profile?</p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowSaveConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSaveProfile}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Proposal Submission Dialog Component
function ProposalSubmissionDialog({
  isOpen,
  onClose,
  proposalFormData,
  setProposalFormData,
  linkedFacultyIdea
}: {
  isOpen: boolean;
  onClose: () => void;
  proposalFormData: any;
  setProposalFormData: (data: any) => void;
  linkedFacultyIdea: any;
}) {
  const { toast } = useToast();
  const [availableSupervisors, setAvailableSupervisors] = useState<any[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAvailableSupervisors();
    }
  }, [isOpen]);

  const loadAvailableSupervisors = async () => {
    setLoadingSupervisors(true);
    try {
      const response = await fetch('/api/teachers/available');
      if (response.ok) {
        const data = await response.json();
        setAvailableSupervisors(data);
      }
    } catch (error) {
      console.error('Error loading supervisors:', error);
    } finally {
      setLoadingSupervisors(false);
    }
  };

  const handleSubmitProposal = async () => {
    // Validation
    if (!proposalFormData.title || !proposalFormData.description) {
      toast({
        title: "Error",
        description: "Title and description are required",
        variant: "destructive"
      });
      return;
    }

    if (!selectedSupervisorId && !linkedFacultyIdea) {
      toast({
        title: "Error",
        description: "Please select a supervisor",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const userData = localStorage.getItem('user');
      const parsedUser = userData ? JSON.parse(userData) : null;

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('title', proposalFormData.title);
      formData.append('description', proposalFormData.description);
      formData.append('domain', proposalFormData.domain || '');
      formData.append('objectives', proposalFormData.objectives || '');
      formData.append('abstract', proposalFormData.abstract || '');
      formData.append('tools', proposalFormData.tools || '');
      formData.append('supervisorId', linkedFacultyIdea ? linkedFacultyIdea.teacherId : selectedSupervisorId);
      
      if (linkedFacultyIdea) {
        formData.append('linkedFacultyIdeaId', linkedFacultyIdea.id);
        formData.append('isFacultyProposed', 'true');
      }

      if (documentFile) {
        formData.append('proposalDocument', documentFile);
      }

      const response = await fetch('/api/proposals/submit', {
        method: 'POST',
        headers: {
          'x-user-id': parsedUser?.id || ''
        },
        body: formData
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Proposal submitted successfully! Awaiting supervisor review."
        });
        onClose();
        // Reset form
        setProposalFormData({
          title: '',
          description: '',
          domain: '',
          objectives: '',
          abstract: '',
          tools: '',
          linkedFacultyIdeaId: null,
        });
        setDocumentFile(null);
        setSelectedSupervisorId('');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit proposal');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit proposal",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {linkedFacultyIdea ? 'Submit Proposal (Faculty Idea)' : 'Submit Proposal (Self-Proposed)'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {linkedFacultyIdea && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-blue-900">Faculty Idea Selected:</p>
              <p className="text-sm text-blue-700">{linkedFacultyIdea.title}</p>
              <p className="text-xs text-blue-600">by {linkedFacultyIdea.teacher?.name}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="proposal-title">Project Title *</Label>
              <Input
                id="proposal-title"
                value={proposalFormData.title}
                onChange={(e) => setProposalFormData({...proposalFormData, title: e.target.value})}
                placeholder="Enter project title"
              />
            </div>

            <div>
              <Label htmlFor="proposal-domain">Domain/Area</Label>
              <Input
                id="proposal-domain"
                value={proposalFormData.domain}
                onChange={(e) => setProposalFormData({...proposalFormData, domain: e.target.value})}
                placeholder="e.g., Machine Learning, Web Development"
              />
            </div>

            <div>
              <Label htmlFor="proposal-objectives">Objectives</Label>
              <Textarea
                id="proposal-objectives"
                value={proposalFormData.objectives}
                onChange={(e) => setProposalFormData({...proposalFormData, objectives: e.target.value})}
                placeholder="What are the main objectives of this project?"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="proposal-abstract">Abstract</Label>
              <Textarea
                id="proposal-abstract"
                value={proposalFormData.abstract}
                onChange={(e) => setProposalFormData({...proposalFormData, abstract: e.target.value})}
                placeholder="Brief summary of the project"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="proposal-description">Description *</Label>
              <Textarea
                id="proposal-description"
                value={proposalFormData.description}
                onChange={(e) => setProposalFormData({...proposalFormData, description: e.target.value})}
                placeholder="Detailed description of the project"
                rows={5}
              />
            </div>

            <div>
              <Label htmlFor="proposal-tools">Tools & Technologies</Label>
              <Input
                id="proposal-tools"
                value={proposalFormData.tools}
                onChange={(e) => setProposalFormData({...proposalFormData, tools: e.target.value})}
                placeholder="e.g., Python, TensorFlow, React, Node.js"
              />
            </div>

            {!linkedFacultyIdea && (
              <div>
                <Label htmlFor="proposal-supervisor">Select Supervisor *</Label>
                {loadingSupervisors ? (
                  <p className="text-sm text-gray-500">Loading supervisors...</p>
                ) : (
                  <Select value={selectedSupervisorId} onValueChange={setSelectedSupervisorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSupervisors.map((supervisor) => (
                        <SelectItem key={supervisor.id} value={supervisor.id}>
                          {supervisor.name} - {supervisor.isAvailable ? '🟢 Available' : '🔴 Full'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="proposal-document">Upload Proposal Document (Optional)</Label>
              <Input
                id="proposal-document"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
              />
              {documentFile && (
                <p className="text-xs text-gray-600 mt-1">Selected: {documentFile.name}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitProposal} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Proposal'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}