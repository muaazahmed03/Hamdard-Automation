'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionTimeout } from '@/hooks/use-session-timeout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import NotificationsPanel from '@/components/notifications-panel';
import AnnouncementPopup from '@/components/announcement-popup';
import { 
  BookOpen, 
  Users, 
  Calendar, 
  MessageCircle, 
  Settings, 
  LogOut,
  Search,
  Plus,
  Edit,
  Eye,
  UserCheck,
  BarChart3,
  Trash2,
  Check,
  X,
  Clock,
  FileText,
  Send,
  Download,
  User,
  Camera,
  Menu
} from 'lucide-react';

export default function TeacherDashboard() {
  useSessionTimeout();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [user, setUser] = useState(null);
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // State for projects
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isViewProjectOpen, setIsViewProjectOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectFormData, setProjectFormData] = useState({
    title: '',
    description: '',
    requirements: ''
  });

  // State for students
  const [students, setStudents] = useState([]);
  const [supervisedGroups, setSupervisedGroups] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // State for supervision requests
  const [supervisionRequests, setSupervisionRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [capacityError, setCapacityError] = useState<{message: string; capacity: number; currentCount: number} | null>(null);

  // State for messages
  const [conversations, setConversations] = useState([]);

  // State for files
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('ALL');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  
  // State for recent activities
  const [recentActivities, setRecentActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  // State for file actions
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileActionDialog, setFileActionDialog] = useState({ open: false, action: '', fileId: '' });
  const [changesFeedback, setChangesFeedback] = useState('');

  // State for request changes dialog
  const [requestChangesDialog, setRequestChangesDialog] = useState<{open: boolean; requestId: string; feedback: string}>({
    open: false,
    requestId: '',
    feedback: ''
  });

  // Stats state
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeStudents: 0,
    pendingRequests: 0,
    meetingsToday: 0,
    supervisionCapacity: 4,
    currentSupervision: 0
  });

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!userData || !token) {
      window.location.href = '/';
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'TEACHER') {
      window.location.href = '/';
      return;
    }
    
    setUser(parsedUser);
  }, []);

  // Load data when user is set
  useEffect(() => {
    if (user) {
      loadProjects();
      loadStudents();
      loadSupervisionRequests();
      loadSupervisionCapacity();
      loadMessages();
      loadFiles();
      loadRecentActivities();
      
      // Auto-refresh activities every 30 seconds
      const interval = setInterval(loadRecentActivities, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  // API Functions
  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch('/api/admin/projects');
      if (response.ok) {
        const data = await response.json();
        // Show all projects created by this teacher
        const teacherProjects = data.filter(project => 
          project.teacherId === user?.id
        );
        setProjects(teacherProjects);
        setStats(prev => ({ ...prev, totalProjects: teacherProjects.length }));
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive"
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      if (!user?.id) {
        console.log('❌ No user ID found');
        return;
      }
      
      console.log('🔍 Fetching supervised groups for teacher:', user.id);
      
      // Fetch groups supervised by this teacher
      const response = await fetch(`/api/groups/supervised`, {
        headers: {
          'x-user-id': user.id
        }
      });
      
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const groups = await response.json();
        console.log('✅ Supervised groups loaded:', groups.length, groups);
        setSupervisedGroups(groups);
        
        // Extract all students from all supervised groups
        const allStudents = groups.flatMap(group => 
          group.members?.map(member => ({
            ...member,
            groupId: group.id,
            groupName: group.name
          })) || []
        );
        
        // Remove duplicates (student might be in multiple groups)
        const uniqueStudents = Array.from(
          new Map(allStudents.map(s => [s.id, s])).values()
        );
        
        setStudents(uniqueStudents);
        setStats(prev => ({ ...prev, activeStudents: uniqueStudents.length }));
      }
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive"
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadSupervisionRequests = async () => {
    setLoadingRequests(true);
    try {
      const userData = localStorage.getItem('user');
      const parsedUser = userData ? JSON.parse(userData) : null;
      
      if (!parsedUser?.id) {
        console.error('No user ID found');
        return;
      }

      const response = await fetch('/api/supervision/requests', {
        headers: {
          'x-user-id': parsedUser.id,
          'x-user-role': 'TEACHER'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const formattedRequests = data.map((req: any) => ({
          id: req.id,
          student: {
            name: req.student?.name || 'Unknown',
            email: req.student?.email || '',
            rollNumber: req.student?.rollNumber || 'N/A'
          },
          project: req.project?.title || req.message || 'FYP Project',
          message: req.message || '',
          status: req.status,
          date: new Date(req.createdAt).toLocaleDateString(),
          studentId: req.studentId
        }));
        
        setSupervisionRequests(formattedRequests);
        setStats(prev => ({ 
          ...prev, 
          pendingRequests: formattedRequests.filter((r: any) => r.status === 'PENDING').length 
        }));
      }
    } catch (error) {
      console.error('Error loading supervision requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadSupervisionCapacity = async () => {
    try {
      const userData = localStorage.getItem('user');
      const parsedUser = userData ? JSON.parse(userData) : null;
      
      if (!parsedUser?.id) {
        console.error('No user ID found');
        return;
      }

      const response = await fetch('/api/supervision/capacity', {
        headers: {
          'x-user-id': parsedUser.id
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({ 
          ...prev, 
          supervisionCapacity: data.capacity || 4,
          currentSupervision: data.currentCount || 0
        }));
      }
    } catch (error) {
      console.error('Error loading supervision capacity:', error);
    }
  };

  const loadMessages = async () => {
    try {
      // Mock data for conversations
      const mockConversations = [
        {
          id: '1',
          participant: { name: 'Alice Johnson', avatar: null },
          lastMessage: 'Thank you for the feedback on my proposal',
          timestamp: '2 hours ago',
          unread: 1
        },
        {
          id: '2',
          participant: { name: 'Bob Smith', avatar: null },
          lastMessage: 'Can we schedule a meeting for next week?',
          timestamp: '1 day ago',
          unread: 0
        }
      ];
      setConversations(mockConversations);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadFiles = async () => {
    if (!user?.id) {
      console.warn('Cannot load files: user ID not found');
      return;
    }
    
    setLoadingFiles(true);
    try {
      const response = await fetch(`/api/teacher/files?teacherId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Files API response:', {
          filesCount: data.files?.length || 0,
          groupsCount: data.groups?.length || 0,
          debug: data.debug
        });
        setUploadedFiles(data.files || []);
        // Update stats with total files count
        setStats(prev => ({ ...prev, totalFiles: (data.files || []).length }));
        
        // Show warning if no files but debug info suggests there should be
        if ((data.files || []).length === 0 && data.debug) {
          console.warn('No files found. Debug info:', data.debug);
          if (data.debug.supervisedGroupsCount === 0 && data.debug.supervisedStudentIdsCount === 0) {
            toast({
              title: "No Supervised Students",
              description: "You don't have any supervised groups or students yet. Students need to request supervision first.",
              variant: "default"
            });
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch files:', response.status, errorData);
        toast({
          title: "Error",
          description: errorData.error || "Failed to load uploaded files",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading files:', error);
      toast({
        title: "Error",
        description: "Failed to load uploaded files. Please check the console for details.",
        variant: "destructive"
      });
    } finally {
      setLoadingFiles(false);
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
        setRecentActivities(notifications.slice(0, 5));
      } else {
        setRecentActivities([]);
      }
    } catch (error) {
      console.error('Error loading recent activities:', error);
      setRecentActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  // Helper functions for activities
  const formatActivityTime = (dateString) => {
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

  const getActivityStyle = (type) => {
    const typeUpper = type.toUpperCase();
    
    if (typeUpper.includes('ACCEPTED') || typeUpper.includes('APPROVED') || typeUpper.includes('SUCCESS')) {
      return { bgColor: 'bg-green-50', dotColor: 'bg-green-500', badge: 'Success' };
    }
    if (typeUpper.includes('REJECTED') || typeUpper.includes('DECLINED')) {
      return { bgColor: 'bg-red-50', dotColor: 'bg-red-500', badge: 'Declined' };
    }
    if (typeUpper.includes('PENDING') || typeUpper.includes('REQUEST')) {
      return { bgColor: 'bg-yellow-50', dotColor: 'bg-yellow-500', badge: 'Pending' };
    }
    if (typeUpper.includes('MESSAGE')) {
      return { bgColor: 'bg-blue-50', dotColor: 'bg-blue-500', badge: 'Message' };
    }
    return { bgColor: 'bg-blue-50', dotColor: 'bg-blue-500', badge: 'New' };
  };

  // Project Management Functions
  const handleAddProject = async () => {
    try {
      const response = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectFormData,
          teacherId: user.id
        })
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Project created successfully",
        });
        setIsAddProjectOpen(false);
        setProjectFormData({ title: '', description: '', requirements: '' });
        loadProjects();
      } else {
        throw new Error('Failed to create project');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project: " + error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditProject = (project) => {
    setSelectedProject(project);
    setProjectFormData({
      title: project.title,
      description: project.description,
      requirements: project.requirements || ''
    });
    setIsEditProjectOpen(true);
  };

  const handleViewProject = (project) => {
    setSelectedProject(project);
    setIsViewProjectOpen(true);
  };

  const handleUpdateProject = async () => {
    try {
      const response = await fetch(`/api/admin/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectFormData)
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Project updated successfully",
        });
        setIsEditProjectOpen(false);
        loadProjects();
      } else {
        throw new Error('Failed to update project');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update project: " + error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Project deleted successfully",
        });
        loadProjects();
      } else {
        throw new Error('Failed to delete project');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project: " + error.message,
        variant: "destructive"
      });
    }
  };

  // Supervision Request Functions
  const handleSupervisionRequest = async (requestId, action) => {
    try {
      const userData = localStorage.getItem('user');
      const parsedUser = userData ? JSON.parse(userData) : null;
      
      if (!parsedUser?.id) {
        console.error('No user ID found');
        return;
      }

      const response = await fetch(`/api/supervision/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': parsedUser.id
        },
        body: JSON.stringify({
          action: action.toLowerCase()
        })
      });

      if (response.ok) {
        // Reload supervision requests and capacity after update
        await loadSupervisionRequests();
        await loadSupervisionCapacity();
        
        // If accepted, also reload students and files to show the new group
        if (action.toLowerCase() === 'accept' || action.toLowerCase() === 'accepted') {
          await loadStudents();
          await loadFiles();
        }
        
        toast({
          title: "Success",
          description: `Supervision request ${action.toLowerCase()}ed successfully`,
        });
      } else {
        const error = await response.json();
        
        // Check if it's a capacity exceeded error
        if (response.status === 400 && error.error === 'Supervision capacity exceeded') {
          setCapacityError({
            message: error.message,
            capacity: error.capacity,
            currentCount: error.currentCount
          });
          return;
        }
        
        throw new Error(error.error || 'Failed to update request');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update supervision request",
        variant: "destructive"
      });
    }
  };

  const handleRequestChanges = async () => {
    if (!requestChangesDialog.feedback.trim()) {
      toast({
        title: "Error",
        description: "Please provide feedback for the requested changes",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/supervision/requests/${requestChangesDialog.requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'request_changes',
          feedback: requestChangesDialog.feedback
        })
      });

      if (response.ok) {
        toast({
          title: "Changes Requested",
          description: "Student has been notified to revise their proposal",
        });
        setRequestChangesDialog({ open: false, requestId: '', feedback: '' });
        await loadSupervisionRequests();
      } else {
        throw new Error('Failed to request changes');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request changes. Please try again.",
        variant: "destructive"
      });
    }
  };

  // File Action Handlers
  const handleApproveFile = async (fileId) => {
    try {
      const response = await fetch(`/api/teacher/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'APPROVED',
          teacherId: user.id
        })
      });

      if (response.ok) {
        toast({
          title: "File Approved",
          description: "The file has been approved and forwarded to committee head",
        });
        await loadFiles();
      } else {
        throw new Error('Failed to approve file');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRejectFile = async (fileId) => {
    try {
      const response = await fetch(`/api/teacher/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'REJECTED',
          teacherId: user.id
        })
      });

      if (response.ok) {
        toast({
          title: "File Rejected",
          description: "The group has been notified and can select another supervisor",
        });
        await loadFiles();
      } else {
        throw new Error('Failed to reject file');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRequestFileChanges = async (fileId, feedback) => {
    if (!feedback.trim()) {
      toast({
        title: "Error",
        description: "Please provide feedback for the requested changes",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/teacher/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'CHANGES_REQUESTED',
          feedback: feedback,
          teacherId: user.id
        })
      });

      if (response.ok) {
        toast({
          title: "Changes Requested",
          description: "The group has been notified to make changes and re-upload",
        });
        setFileActionDialog({ open: false, action: '', fileId: '' });
        setChangesFeedback('');
        await loadFiles();
      } else {
        throw new Error('Failed to request changes');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request changes. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Message Functions
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;
    
    try {
      // Mock API call
      const newMessage = {
        id: Date.now().toString(),
        content: messageInput,
        sender: user.name,
        timestamp: new Date().toISOString(),
        isOwn: true
      };
      
      setMessages([...messages, newMessage]);
      setMessageInput('');
      
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'projects', label: 'My Projects', icon: BookOpen },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'supervision', label: 'Supervision Requests', icon: UserCheck },
    { id: 'schedule-meeting', label: 'Schedule Meeting', icon: Calendar },
    { id: 'project-execution', label: 'Project Execution', icon: FileText, href: '/teacher/project-execution' },
    { id: 'files', label: 'Uploaded Files', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'profile', label: 'Profile', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardContent 
          stats={stats} 
          setActiveSection={setActiveSection}
          recentActivities={recentActivities}
          loadingActivities={loadingActivities}
          formatActivityTime={formatActivityTime}
          getActivityStyle={getActivityStyle}
        />;
      case 'projects':
        return <ProjectsContent 
          projects={projects}
          loadingProjects={loadingProjects}
          setIsAddProjectOpen={setIsAddProjectOpen}
          handleEditProject={handleEditProject}
          handleViewProject={handleViewProject}
          handleDeleteProject={handleDeleteProject}
        />;
      case 'students':
        return <StudentsContent 
          students={students}
          loadingStudents={loadingStudents}
          studentSearchQuery={studentSearchQuery}
          setStudentSearchQuery={setStudentSearchQuery}
          supervisedGroups={supervisedGroups}
        />;
      case 'supervision':
        return <SupervisionContent 
          supervisionRequests={supervisionRequests}
          loadingRequests={loadingRequests}
          handleSupervisionRequest={handleSupervisionRequest}
          capacityError={capacityError}
          setCapacityError={setCapacityError}
          requestChangesDialog={requestChangesDialog}
          setRequestChangesDialog={setRequestChangesDialog}
          handleRequestChanges={handleRequestChanges}
        />;
      case 'schedule-meeting':
        router.push('/teacher/meetings');
        return null;
      case 'project-execution':
        router.push('/teacher/project-execution');
        return null;
      case 'files':
        return <FilesContent 
          uploadedFiles={uploadedFiles}
          loadingFiles={loadingFiles}
          fileSearchQuery={fileSearchQuery}
          setFileSearchQuery={setFileSearchQuery}
          fileTypeFilter={fileTypeFilter}
          setFileTypeFilter={setFileTypeFilter}
          selectedGroupFilter={selectedGroupFilter}
          setSelectedGroupFilter={setSelectedGroupFilter}
          supervisedGroups={supervisedGroups}
          handleApproveFile={handleApproveFile}
          handleRejectFile={handleRejectFile}
          handleRequestFileChanges={handleRequestFileChanges}
          fileActionDialog={fileActionDialog}
          setFileActionDialog={setFileActionDialog}
          changesFeedback={changesFeedback}
          setChangesFeedback={setChangesFeedback}
        />;

      case 'messages':
        // Redirect to dedicated messages page
        router.push('/teacher/messages');
        return null;
      case 'profile':
        return <ProfileContent user={user} setUser={setUser} />;
      default:
        return <DashboardContent 
          stats={stats} 
          setActiveSection={setActiveSection}
          recentActivities={recentActivities}
          loadingActivities={loadingActivities}
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
      <AnnouncementPopup userRole="TEACHER" />
      
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
              <p className="text-[10px] text-gray-500 truncate">Teacher Dashboard</p>
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
              {user?.profileImage && user.profileImage !== '' && user.profileImage !== 'null' ? (
                <img 
                  src={user.profileImage} 
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
              {(!user?.profileImage || user.profileImage === '' || user.profileImage === 'null') && (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{user?.name || 'Teacher'}</p>
              <p className="text-[10px] text-gray-500 truncate">Teacher</p>
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
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 md:px-8 py-4 flex items-center justify-between">
            {/* Mobile Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Mobile Header */}
                  <SheetHeader className="p-6 border-b">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                        <img src="/hamdard-logo.png" alt="Hamdard" className="w-8 h-8 object-contain" />
                      </div>
                      <div>
                        <SheetTitle className="text-xl font-bold text-gray-900">FYP Portal</SheetTitle>
                        <p className="text-sm text-gray-500">Teacher Dashboard</p>
                      </div>
                    </div>
                  </SheetHeader>

                  {/* Navigation */}
                  <nav className="flex-1 overflow-y-auto p-4 space-y-2">
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
                            }
                            setIsMobileMenuOpen(false);
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
                  </nav>

                  {/* User Profile & Logout */}
                  <div className="border-t border-gray-200 p-4">
                    <div className="flex items-center space-x-3 px-2 py-3 mb-2">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Teacher'}</p>
                        <p className="text-xs text-gray-500">Teacher</p>
                      </div>
                    </div>
                    <button 
                      className="w-full flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                      onClick={() => {
                        router.push('/');
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
                  Manage your projects and supervise students
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

      {/* Add Project Dialog */}
      <Dialog open={isAddProjectOpen} onOpenChange={setIsAddProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Project</DialogTitle>
            <DialogDescription>
              Create a new project for students to work on
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Project Title</Label>
              <Input
                value={projectFormData.title}
                onChange={(e) => setProjectFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter project title"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={projectFormData.description}
                onChange={(e) => setProjectFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the project"
                rows={4}
              />
            </div>
            <div>
              <Label>Requirements</Label>
              <Textarea
                value={projectFormData.requirements}
                onChange={(e) => setProjectFormData(prev => ({ ...prev, requirements: e.target.value }))}
                placeholder="List project requirements"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddProjectOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddProject}>
                Create Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Project Title</Label>
              <Input
                value={projectFormData.title}
                onChange={(e) => setProjectFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter project title"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={projectFormData.description}
                onChange={(e) => setProjectFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the project"
                rows={4}
              />
            </div>
            <div>
              <Label>Requirements</Label>
              <Textarea
                value={projectFormData.requirements}
                onChange={(e) => setProjectFormData(prev => ({ ...prev, requirements: e.target.value }))}
                placeholder="List project requirements"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditProjectOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateProject}>
                Update Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Project Dialog */}
      <Dialog open={isViewProjectOpen} onOpenChange={setIsViewProjectOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProject?.title}</DialogTitle>
            <DialogDescription>
              Project Details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">Description</Label>
              <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                {selectedProject?.description || 'No description provided'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Requirements</Label>
              <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                {selectedProject?.requirements || 'No requirements specified'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Status</Label>
              <Badge className="mt-1">
                {selectedProject?.status || 'PROPOSED'}
              </Badge>
            </div>
            {selectedProject?.teacher && (
              <div>
                <Label className="text-sm font-semibold text-gray-700">Teacher</Label>
                <p className="mt-1 text-sm text-gray-600">
                  {selectedProject.teacher.name}
                  {selectedProject.teacher.department && ` - ${selectedProject.teacher.department}`}
                </p>
              </div>
            )}
            {selectedProject?.submissions && selectedProject.submissions.length > 0 && (
              <div>
                <Label className="text-sm font-semibold text-gray-700">Submissions</Label>
                <p className="mt-1 text-sm text-gray-600">
                  {selectedProject.submissions.length} submission(s)
                </p>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setIsViewProjectOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Changes Dialog */}
      <AlertDialog open={requestChangesDialog.open} onOpenChange={(open) => setRequestChangesDialog({ ...requestChangesDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Provide feedback for the student to revise their proposal
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Feedback</Label>
              <Textarea
                value={requestChangesDialog.feedback}
                onChange={(e) => setRequestChangesDialog({ ...requestChangesDialog, feedback: e.target.value })}
                placeholder="Explain what changes are needed..."
                rows={4}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRequestChangesDialog({ open: false, requestId: '', feedback: '' })}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRequestChanges}>
              Send Feedback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DashboardContent({ stats, setActiveSection, recentActivities, loadingActivities, formatActivityTime, getActivityStyle }) {
  const router = useRouter();
  
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Quick Actions */}
      <section>
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
          <div onClick={() => setActiveSection('supervision')} className="block h-full">
            <Card className="relative h-full flex flex-col overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-2 border-l-blue-500">
              <CardHeader className="pb-1.5 flex-grow p-2.5 sm:p-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-500 rounded-lg flex items-center justify-center mb-1.5 sm:mb-2 shadow-inner">
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <CardTitle className="text-xs sm:text-sm font-semibold leading-tight">View Requests</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-2 sm:pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs text-gray-600 leading-snug">
                Review supervision requests
              </CardContent>
            </Card>
          </div>
          <div onClick={() => setActiveSection('projects')} className="block h-full">
            <Card className="relative h-full flex flex-col overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-2 border-l-blue-500">
              <CardHeader className="pb-1.5 flex-grow p-2.5 sm:p-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-purple-500 rounded-lg flex items-center justify-center mb-1.5 sm:mb-2 shadow-inner">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <CardTitle className="text-xs sm:text-sm font-semibold leading-tight">My Projects</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-2 sm:pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs text-gray-600 leading-snug">
                Manage your projects
              </CardContent>
            </Card>
          </div>
          <div onClick={() => setActiveSection('messages')} className="block h-full">
            <Card className="relative h-full flex flex-col overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-2 border-l-blue-500">
              <CardHeader className="pb-1.5 flex-grow p-2.5 sm:p-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-orange-500 rounded-lg flex items-center justify-center mb-1.5 sm:mb-2 shadow-inner">
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <CardTitle className="text-xs sm:text-sm font-semibold leading-tight">Send Message</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-2 sm:pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs text-gray-600 leading-snug">
                Chat with students
              </CardContent>
            </Card>
          </div>
          <div onClick={() => setActiveSection('files')} className="block h-full">
            <Card className="relative h-full flex flex-col overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-2 border-l-blue-500">
              <CardHeader className="pb-1.5 flex-grow p-2.5 sm:p-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-cyan-500 rounded-lg flex items-center justify-center mb-1.5 sm:mb-2 shadow-inner">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <CardTitle className="text-xs sm:text-sm font-semibold leading-tight">View Files</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-2 sm:pb-2.5 px-2.5 sm:px-3 text-[11px] sm:text-xs text-gray-600 leading-snug">
                Student file uploads
              </CardContent>
            </Card>
          </div>
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

// Files Content Component
function FilesContent({ 
  uploadedFiles, 
  loadingFiles, 
  fileSearchQuery, 
  setFileSearchQuery,
  fileTypeFilter,
  setFileTypeFilter,
  selectedGroupFilter,
  setSelectedGroupFilter,
  supervisedGroups,
  handleApproveFile,
  handleRejectFile,
  handleRequestFileChanges,
  fileActionDialog,
  setFileActionDialog,
  changesFeedback,
  setChangesFeedback
}) {
  const [viewMode, setViewMode] = useState<'grouped'>('grouped');
  const { toast } = useToast();

  const handleViewFile = async (file) => {
    try {
      console.log('[View File] Attempting to view file:', { id: file.id, fileUrl: file.fileUrl, fileName: file.fileName })
      
      // Use fileUrl directly if available and it's a full URL or starts with /
      if (file.fileUrl && (file.fileUrl.startsWith('http') || file.fileUrl.startsWith('/'))) {
        console.log('[View File] Using direct fileUrl:', file.fileUrl)
        // For PDFs and other viewable files, try opening directly
        // If it's a PDF, we can open it directly
        if (file.fileUrl.toLowerCase().endsWith('.pdf') || file.fileType?.toLowerCase() === 'pdf') {
          window.open(file.fileUrl, '_blank')
          return
        }
        // For other files, use the download endpoint with inline parameter
      }
      
      // Fallback to download endpoint with inline=1 for viewing
      console.log('[View File] Using download endpoint for file ID:', file.id)
      const url = `/api/admin/files/${encodeURIComponent(String(file.id))}/download?inline=1`
      const resp = await fetch(url)
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to fetch file')
      }
      
      const contentType = resp.headers.get('Content-Type') || file.fileType || 'application/octet-stream'
      const arrayBuffer = await resp.arrayBuffer()
      const blob = new Blob([arrayBuffer], { type: contentType })
      const blobUrl = window.URL.createObjectURL(blob)
      
      const newWindow = window.open(blobUrl, '_blank')
      if (!newWindow) {
        // Popup blocked, try downloading instead
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = file.originalName || file.fileName || 'download'
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)
        toast({ 
          title: 'Popup blocked', 
          description: 'File download started. Please check your downloads folder.', 
        })
        return
      }
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)
      console.log('[View File] File opened successfully')
    } catch (error) {
      console.error('[View File] Error:', error)
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to open file. Please try downloading.', 
        variant: 'destructive' 
      })
    }
  };

  const handleDownloadFile = (file) => {
    const link = document.createElement('a');
    link.href = file.fileUrl;
    link.download = file.originalName || file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileTypeBadge = (fileType) => {
    // Normalize fileType to uppercase for case-insensitive matching
    const normalizedType = (fileType || '').toUpperCase();
    
    const types = {
      'PROPOSAL': { label: 'Proposal Form', className: 'bg-blue-100 text-blue-800' },
      'REPORT': { label: 'Report', className: 'bg-green-100 text-green-800' },
      'DOCUMENTATION': { label: 'Documentation', className: 'bg-purple-100 text-purple-800' },
      'WEEKLY_REPORT': { label: 'Weekly Report', className: 'bg-green-100 text-green-800' },
      'OTHER': { label: 'Other', className: 'bg-gray-100 text-gray-800' },
    };
    
    // Return the matching type or default to OTHER
    return types[normalizedType] || types['OTHER'];
  };

  const getStatusBadge = (status, supervisorApprovalStatus, fileType) => {
    const fileTypeUpper = (fileType || '').toUpperCase();
    
    // For REPORT and DOCUMENTATION files, show "Forwarded for Tracking" status
    if (fileTypeUpper === 'REPORT' || fileTypeUpper === 'DOCUMENTATION') {
      if (status === 'APPROVED' || supervisorApprovalStatus === 'APPROVED') {
        return { label: 'Forwarded for Tracking', className: 'bg-blue-100 text-blue-800' };
      }
      return { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' };
    }
    
    // Check final approval status first (for PROPOSAL files)
    if (status === 'REJECTED' || status === 'COMMITTEE_REJECTED' || status === 'ADMIN_REJECTED') {
      return { label: 'Rejected', className: 'bg-red-100 text-red-800' };
    }
    if (status === 'ADMIN_APPROVED' || status === 'COMMITTEE_APPROVED') {
      return { label: 'Approved', className: 'bg-green-100 text-green-800' };
    }
    if (status === 'CHANGES_REQUESTED') {
      return { label: 'Changes Requested', className: 'bg-yellow-100 text-yellow-800' };
    }
    
    // Check if supervisor has approved
    // If supervisorApprovalStatus is 'APPROVED', show pending from committee/admin
    // Also check if status is 'APPROVED' (which happens when supervisor approves a proposal)
    // Handle case-insensitive file type check
    const isProposal = fileType && (fileType.toUpperCase() === 'PROPOSAL' || fileType.toLowerCase() === 'proposal');
    // Check if supervisor has approved - check both supervisorApprovalStatus and status
    // When supervisor approves, status becomes 'APPROVED' and supervisorApprovalStatus should be 'APPROVED'
    const isSupervisorApproved = supervisorApprovalStatus === 'APPROVED' || 
                                 (status === 'APPROVED' && isProposal && 
                                  supervisorApprovalStatus !== 'REJECTED');
    
    if (isSupervisorApproved) {
      return { label: 'Pending from Committee/Admin', className: 'bg-orange-100 text-orange-800' };
    }
    
    // If supervisor rejected
    if (supervisorApprovalStatus === 'REJECTED') {
      return { label: 'Rejected by Supervisor', className: 'bg-red-100 text-red-800' };
    }
    
    // Default: pending from supervisor
    return { label: 'Pending from Supervisor', className: 'bg-yellow-100 text-yellow-800' };
  };

  // Filter files based on search and filters
  const filteredFiles = uploadedFiles.filter(file => {
    if (!file) return false;
    
    // Search filter - check if search query is empty or matches any field
    const searchQuery = (fileSearchQuery || '').trim().toLowerCase();
    const matchesSearch = !searchQuery || 
                         (file.name && file.name.toLowerCase().includes(searchQuery)) ||
                         (file.originalName && file.originalName.toLowerCase().includes(searchQuery)) ||
                         (file.student?.name && file.student.name.toLowerCase().includes(searchQuery)) ||
                         (file.student?.email && file.student.email.toLowerCase().includes(searchQuery)) ||
                         (file.groupName && file.groupName.toLowerCase().includes(searchQuery)) ||
                         (file.description && file.description.toLowerCase().includes(searchQuery));
    
    // File type filter - case-insensitive comparison
    const fileTypeUpper = (file.fileType || '').toUpperCase();
    const filterTypeUpper = (fileTypeFilter || 'ALL').toUpperCase();
    const matchesType = filterTypeUpper === 'ALL' || fileTypeUpper === filterTypeUpper;
    
    // Group filter - compare as strings to handle ID mismatches and null values
    const groupFilter = selectedGroupFilter || 'ALL';
    const matchesGroup = groupFilter === 'ALL' || 
                        (file.groupId && String(file.groupId) === String(groupFilter)) ||
                        (file.groupName && file.groupName === groupFilter);
    
    return matchesSearch && matchesType && matchesGroup;
  });

  // Group files by group for grouped view
  const groupedFiles = supervisedGroups?.map(group => ({
    ...group,
    files: filteredFiles.filter(f => f.groupId === group.id)
  })).filter(g => g.files.length > 0) || [];

  // No ungrouped files - all files must belong to a group

  const renderFileRow = (file) => {
    const typeBadge = getFileTypeBadge(file.fileType);
    const statusBadge = getStatusBadge(file.status, file.supervisorApprovalStatus, file.fileType);
    
    return (
      <TableRow key={file.id}>
        <TableCell>
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <div>
              <p className="font-medium text-sm">{file.name}</p>
              {file.description && (
                <p className="text-xs text-gray-500">{file.description}</p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge className={typeBadge.className}>
            {typeBadge.label}
          </Badge>
        </TableCell>
        <TableCell>
          <div>
            <p className="text-sm font-medium">{file.student?.name || 'Unknown'}</p>
            <p className="text-xs text-gray-500">{file.student?.email}</p>
          </div>
        </TableCell>
        <TableCell>
          <span className="text-sm text-gray-600">
            {new Date(file.uploadedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </TableCell>
        <TableCell>
          <Badge className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewFile(file)}
              title="View file"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownloadFile(file)}
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </Button>
            {/* Show approve/reject buttons only for PROPOSAL files that haven't been approved by supervisor yet */}
            {/* REPORT and DOCUMENTATION files don't need approval - they're automatically forwarded */}
            {file.status === 'PENDING' && 
             file.supervisorApprovalStatus !== 'APPROVED' && 
             file.supervisorApprovalStatus !== 'REJECTED' &&
             file.fileType?.toUpperCase() === 'PROPOSAL' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => handleApproveFile(file.id)}
                  title="Approve"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRejectFile(file.id)}
                  title="Reject"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                  onClick={() => setFileActionDialog({ open: true, action: 'changes', fileId: file.id })}
                  title="Request Changes"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Uploaded Files</h2>
          <p className="text-gray-600">View files uploaded by your supervised students</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm mb-2">Search Files</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by file name, student, or group..."
                  value={fileSearchQuery}
                  onChange={(e) => setFileSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm mb-2">File Type</Label>
              <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="PROPOSAL">Proposal Form</SelectItem>
                  <SelectItem value="REPORT">Report</SelectItem>
                  <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm mb-2">Filter by Group</Label>
              <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Groups</SelectItem>
                  {supervisedGroups && supervisedGroups.length > 0 ? (
                    supervisedGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No groups available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      {loadingFiles ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      ) : filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Files Found</h3>
              <p className="text-gray-600">
                {uploadedFiles.length === 0 
                  ? "Your students haven't uploaded any files yet" 
                  : "No files match your search criteria"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Grouped View (always show grouped by group)
        <div className="space-y-4">
          {groupedFiles.length > 0 ? (
            groupedFiles.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span>{group.name}</span>
                      <Badge variant="outline">{group.files?.length || 0} Files</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.files?.map(renderFileRow)}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Files Found</h3>
                  <p className="text-gray-600">No files match your search criteria</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      {/* Request Changes Dialog */}
      <AlertDialog open={fileActionDialog.open && fileActionDialog.action === 'changes'} onOpenChange={(open) => setFileActionDialog({ ...fileActionDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Provide feedback for the group to revise their file
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Feedback</Label>
              <Textarea
                value={changesFeedback}
                onChange={(e) => setChangesFeedback(e.target.value)}
                placeholder="Explain what changes are needed..."
                rows={4}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setFileActionDialog({ open: false, action: '', fileId: '' });
              setChangesFeedback('');
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleRequestFileChanges(fileActionDialog.fileId, changesFeedback)}>
              Send Feedback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProjectsContent({ 
  projects, 
  loadingProjects, 
  setIsAddProjectOpen, 
  handleEditProject, 
  handleViewProject,
  handleDeleteProject 
}) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'APPROVED':
        return <Badge className="bg-blue-500">Approved</Badge>;
      case 'PROPOSED':
        return <Badge variant="outline">Proposed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loadingProjects) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">My Projects</h3>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setIsAddProjectOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Projects Yet</h3>
            <p className="text-gray-600 mb-4">Create your first project to get started</p>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setIsAddProjectOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  {getStatusBadge(project.status)}
                </div>
                <CardTitle className="text-lg">{project.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">{project.description}</p>
                {project.group && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Students:</p>
                    <div className="flex flex-wrap gap-1">
                      {project.group.members?.slice(0, 3).map((member, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {member.user.name}
                        </Badge>
                      ))}
                      {project.group.members?.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{project.group.members.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {project.submissions?.length || 0} submissions
                  </span>
                  <div className="flex space-x-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewProject(project)}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditProject(project)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Project</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{project.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteProject(project.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentsContent({ 
  students, 
  loadingStudents, 
  studentSearchQuery, 
  setStudentSearchQuery,
  supervisedGroups 
}) {
  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    student.email?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    student.rollNumber?.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  if (loadingStudents) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  // Filter groups based on search query
  const filteredGroups = supervisedGroups?.filter(group => {
    // Check if group name matches
    const groupNameMatches = group.name?.toLowerCase().includes(studentSearchQuery.toLowerCase());
    
    // Check if any student in the group matches
    const hasMatchingStudent = group.members?.some(student =>
      student.name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      student.rollNumber?.toLowerCase().includes(studentSearchQuery.toLowerCase())
    );
    
    return studentSearchQuery === '' || groupNameMatches || hasMatchingStudent;
  }).map(group => ({
    ...group,
    // Filter students within the group
    members: group.members?.filter(student =>
      studentSearchQuery === '' ||
      student.name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      student.rollNumber?.toLowerCase().includes(studentSearchQuery.toLowerCase())
    )
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Supervised Students</h3>
          <p className="text-sm text-gray-500">
            {supervisedGroups?.length || 0} {supervisedGroups?.length === 1 ? 'Group' : 'Groups'} • {students.length} {students.length === 1 ? 'Student' : 'Students'}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search students..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {studentSearchQuery ? 'No Results Found' : 'No Supervised Groups'}
              </h3>
              <p className="text-gray-600">
                {studentSearchQuery 
                  ? 'No groups or students match your search criteria'
                  : 'You are not currently supervising any groups'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(group => (
            <Card key={group.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      {group.description && (
                        <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-white">
                      {group.members?.length || 0} {group.members?.length === 1 ? 'Member' : 'Members'}
                    </Badge>
                    {group.projects && group.projects.length > 0 && (
                      <Badge variant="outline" className="bg-white">
                        {group.projects.length} {group.projects.length === 1 ? 'Project' : 'Projects'}
                      </Badge>
                    )}
                    {group.isApproved && (
                      <Badge className="bg-green-500 text-white">
                        Approved
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Display Projects */}
                {group.projects && group.projects.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase">Projects</p>
                    {group.projects.map(project => (
                      <div key={project.id} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-gray-900">{project.title}</h4>
                            {project.description && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{project.description}</p>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">
                            {project.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="p-0">
                {!group.members || group.members.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-gray-500">No students in this group</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Name</TableHead>
                          <TableHead className="font-semibold">Roll Number</TableHead>
                          <TableHead className="font-semibold">Email</TableHead>
                          <TableHead className="font-semibold">Department</TableHead>
                          <TableHead className="font-semibold">GPA</TableHead>
                          <TableHead className="font-semibold">Role</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.members.map((student) => (
                          <TableRow key={student.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                                  {student.profileImage ? (
                                    <img 
                                      src={student.profileImage} 
                                      alt={student.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-blue-100">
                                      <User className="w-4 h-4 text-blue-600" />
                                    </div>
                                  )}
                                </div>
                                <span className="font-medium">{student.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>{student.rollNumber || 'N/A'}</TableCell>
                            <TableCell className="text-sm">{student.email}</TableCell>
                            <TableCell>{student.department || 'N/A'}</TableCell>
                            <TableCell>
                              {student.gpa ? (
                                <span className={`font-medium ${student.gpa >= 3.0 ? 'text-green-600' : 'text-gray-600'}`}>
                                  {student.gpa.toFixed(2)}
                                </span>
                              ) : (
                                'N/A'
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {student.role || 'MEMBER'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={student.status === 'APPROVED' ? 'default' : 'secondary'}
                                className={student.status === 'APPROVED' ? 'bg-green-500' : ''}
                              >
                                {student.status || 'Active'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end space-x-2">
                                <Button size="sm" variant="outline" title="View Profile">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" title="Send Message">
                                  <MessageCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SupervisionContent({ 
  supervisionRequests, 
  loadingRequests, 
  handleSupervisionRequest,
  capacityError,
  setCapacityError,
  requestChangesDialog,
  setRequestChangesDialog,
  handleRequestChanges
}) {
  if (loadingRequests) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading supervision requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Capacity Exceeded Alert Dialog */}
      <AlertDialog open={!!capacityError} onOpenChange={(open) => !open && setCapacityError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <X className="w-5 h-5" />
              Supervision Limit Exceeded
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p className="text-gray-700 font-medium">
                {capacityError?.message}
              </p>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Maximum Capacity:</span>
                  <span className="font-semibold text-gray-900">{capacityError?.capacity} projects</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Currently Supervising:</span>
                  <span className="font-semibold text-red-600">{capacityError?.currentCount} projects</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Please complete or reduce your current supervision commitments before accepting new requests.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setCapacityError(null)}>
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Supervision Requests</h3>
        <Badge variant="outline" className="text-sm">
          {supervisionRequests.filter(req => req.status === 'PENDING').length} Pending
        </Badge>
      </div>
      
      {supervisionRequests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Supervision Requests</h3>
            <p className="text-gray-600">No students have requested your supervision yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {supervisionRequests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-lg">{request.student.name}</h4>
                    <p className="text-sm text-gray-600">{request.student.email}</p>
                    <p className="text-xs text-gray-500">Roll Number: {request.student.rollNumber}</p>
                  </div>
                  <Badge variant={request.status === 'ACCEPTED' ? 'default' : 
                              request.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                    {request.status}
                  </Badge>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Project:</p>
                  <p className="text-sm text-gray-600">{request.project}</p>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Message:</p>
                  <p className="text-sm text-gray-600">{request.message}</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{request.date}</span>
                  {request.status === 'PENDING' && (
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleSupervisionRequest(request.id, 'accept')}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setRequestChangesDialog({ open: true, requestId: request.id, feedback: '' })}
                      >
                        Request Changes
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleSupervisionRequest(request.id, 'reject')}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileContent({ user, setUser }) {
  const { toast } = useToast();
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || '',
    designation: 'Associate Professor',
    officeHours: 'Mon-Fri 9:00 AM - 5:00 PM'
  });
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(user?.profileImage || null);
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(user?.profileImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load profile data
    const loadProfile = async () => {
      try {
        const userData = localStorage.getItem('user');
        const parsedUser = userData ? JSON.parse(userData) : null;
        
        if (!parsedUser?.id) return;

        const response = await fetch(`/api/profile?userId=${parsedUser.id}`, {
          headers: {
            'x-user-id': parsedUser.id,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setProfileData(prev => ({
            ...prev,
            name: data.name || prev.name,
            email: data.email || prev.email,
            department: data.department || prev.department,
            designation: data.designation || data.teacherProfile?.designation || prev.designation,
            officeHours: data.officeHours || data.teacherProfile?.officeHours || prev.officeHours,
          }));
          if (data.profileImage) {
            setProfilePicturePreview(data.profileImage);
            setUserProfilePicture(data.profileImage);
            // Update user object
            parsedUser.profileImage = data.profileImage;
            localStorage.setItem('user', JSON.stringify(parsedUser));
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    loadProfile();
  }, []);

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
          setUserProfilePicture(profilePicUrl);
          localStorage.setItem('userProfilePicture', profilePicUrl);
          setProfilePicturePreview(profilePicUrl);
          
          // Update user state in parent component and localStorage
          if (parsedUser) {
            parsedUser.profileImage = profilePicUrl;
            localStorage.setItem('user', JSON.stringify(parsedUser));
            if (setUser) {
              setUser({ ...parsedUser });
            }
          }
          
          toast({
            title: "Success",
            description: "Profile picture uploaded successfully",
          });
        } else {
          throw new Error('Failed to upload');
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

  const handleSaveProfile = async () => {
    try {
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

      const response = await fetch(`/api/profile?userId=${parsedUser.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': parsedUser.id,
        },
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email,
          department: profileData.department,
          designation: profileData.designation,
          officeHours: profileData.officeHours,
        }),
      });
      
      if (response.ok) {
        // Update localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          parsedUser.name = profileData.name;
          parsedUser.department = profileData.department;
          localStorage.setItem('user', JSON.stringify(parsedUser));
        }
        
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-20 h-20 bg-gray-300 rounded-full overflow-hidden flex items-center justify-center">
                  {profilePicturePreview ? (
                    <img src={profilePicturePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-gray-600">
                      {user?.name?.charAt(0) || 'T'}
                    </span>
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
                <h3 className="text-lg font-semibold">{profileData.name || user?.name || 'Teacher'}</h3>
                <p className="text-sm text-gray-500">{profileData.department || user?.department || 'Computer Science Department'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input 
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label>Department</Label>
                <Input 
                  value={profileData.department}
                  onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                />
              </div>
              <div>
                <Label>Designation</Label>
                <Input 
                  value={profileData.designation}
                  onChange={(e) => setProfileData(prev => ({ ...prev, designation: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Office Hours</Label>
                <Input 
                  value={profileData.officeHours}
                  onChange={(e) => setProfileData(prev => ({ ...prev, officeHours: e.target.value }))}
                />
              </div>
            </div>
            
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSaveProfile}
            >
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}