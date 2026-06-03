'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionTimeout } from '@/hooks/use-session-timeout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import NotificationsPanel from '@/components/notifications-panel'
import { 
  Users, 
  FolderOpen, 
  Calendar, 
  CheckCircle, 
  Check,
  X,
  Clock, 
  AlertTriangle, 
  Bell, 
  LogOut, 
  FileText, 
  MessageSquare, 
  Settings, 
  BarChart3,
  Search,
  Plus,
  Edit,
  Eye,
  Trash2,
  Download,
  Star,
  ThumbsUp,
  ThumbsDown,
  Send,
  Video,
  MapPin,
  Users2,
  XCircle,
  Building2,
  Shield,
  Menu,
  MoreVertical,
  User,
  Camera
} from 'lucide-react'

const sidebarItems = [
  { id: 'overview', label: 'Overview', description: 'Dashboard snapshot', icon: BarChart3 },
  { id: 'projects', label: 'Review Projects', description: 'Track progress', icon: FolderOpen },
  { id: 'announcements', label: 'Announcements', description: 'Create announcements', icon: Bell, href: '/committee-head/announcements' },
  { id: 'forms', label: 'Form Submissions', description: 'Review & approve forms', icon: FileText, href: '/committee-head/forms' },
  { id: 'jury', label: 'Jury Management', description: 'Defense schedules', icon: Users2 },
  { id: 'organization', label: 'Organization', description: 'Manage committee', icon: Building2 },
  { id: 'groups', label: 'Group Approvals', description: 'Review student groups', icon: Users2 },
  { id: 'reports', label: 'Reports', description: 'Generate reports', icon: FileText },
  { id: 'files', label: 'File Tracking', description: 'Student uploads', icon: FolderOpen },
  { id: 'profile', label: 'Profile', description: 'Manage profile', icon: Settings }
];

function SidebarContent({ user, activeTab, setActiveTab, handleLogout, onItemClick }: any) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Section */}
      <div className="p-3 sm:p-4 lg:p-6 flex-shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6 lg:mb-8">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 flex-shrink-0">
            <img src="/hamdard-logo.png" alt="Hamdard" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">FYP Portal</h1>
            <p className="text-xs sm:text-sm text-gray-500 truncate">Committee Head</p>
          </div>
        </div>
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <nav className="space-y-1.5 sm:space-y-2 px-3 sm:px-4 lg:px-6 pb-2">
          {sidebarItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'jury') {
                    window.location.href = '/admin/jury-management'
                  } else if (item.href) {
                    window.location.href = item.href
                  } else {
                    setActiveTab(item.id)
                  }
                  onItemClick?.()
                }}
                className={`w-full flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 sm:py-2.5 lg:py-3 rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-green-50 text-green-600 border-l-4 border-green-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate">{item.label}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">{item.description}</p>
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Fixed Footer */}
      <div className="p-3 sm:p-4 lg:p-6 border-t border-gray-200 flex-shrink-0 bg-white">
        <div className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-300 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-sm relative">
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
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{user?.name || 'Committee Head'}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 truncate">Committee Head</p>
          </div>
        </div>
        <button 
          className="w-full flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors mt-2 sm:mt-3"
          onClick={handleLogout}
        >
          <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="text-xs sm:text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
}

export default function CommitteeHeadDashboard() {
  useSessionTimeout()
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const { toast } = useToast()
  const router = useRouter()

  // ensure favicon shows the hamdard icon for this portal
  useEffect(() => {
    try {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null
      if (link) link.href = '/hamdardfavicon.png'
      else {
        const l = document.createElement('link')
        l.rel = 'icon'
        l.href = '/hamdardfavicon.png'
        document.head.appendChild(l)
      }
    } catch (e) {}
  }, [])

  // State for projects
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [projectSearchQuery, setProjectSearchQuery] = useState('')
  const [projectStatusFilter, setProjectStatusFilter] = useState('ALL')

  // State for reviews
  const [reviews, setReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewFormData, setReviewFormData] = useState({
    projectId: '',
    score: 0,
    feedback: '',
    recommendation: 'APPROVED',
    comments: ''
  })

  // State for meetings
  const [meetings, setMeetings] = useState([])
  const [isAddMeetingOpen, setIsAddMeetingOpen] = useState(false)
  const [meetingFormData, setMeetingFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    attendees: []
  })

  // State for reports
  const [reports, setReports] = useState([])
  const [isGenerateReportOpen, setIsGenerateReportOpen] = useState(false)
  const [reportFormData, setReportFormData] = useState({
    type: 'PROJECT_SUMMARY',
    dateRange: 'LAST_MONTH',
    department: 'ALL',
    groupId: ''
  })
  const [analytics, setAnalytics] = useState({
    projectCompletionRate: 0,
    averageReviewScore: 0,
    committeeEfficiency: 0
  })
  const [loadingReports, setLoadingReports] = useState(false)
  const [availableGroups, setAvailableGroups] = useState([])

  // File Tracking State (committee-head view only)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [fileSearchQuery, setFileSearchQuery] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState('ALL')
  const [fileDepartmentFilter, setFileDepartmentFilter] = useState('ALL')
  const [selectedFile, setSelectedFile] = useState<any>(null)

  // Group Approvals State
  const [groups, setGroups] = useState([])
  const [groupStatusFilter, setGroupStatusFilter] = useState('pending')
  const [loadingGroups, setLoadingGroups] = useState(false)

  // Organization/Committee State
  const [committee, setCommittee] = useState(null)
  const [loadingCommittee, setLoadingCommittee] = useState(false)
  const [isEditCommitteeDialogOpen, setIsEditCommitteeDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState(null)

  // Stats state
  const [stats, setStats] = useState({
    totalProjects: 0,
    pendingReviews: 0,
    completedReviews: 0,
    upcomingMeetings: 0
  })

  // Recent Activity state
  const [recentActivities, setRecentActivities] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  // Profile state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    department: '',
  })
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!userData || !token) {
      window.location.href = '/';
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'COMMITTEE_HEAD') {
      window.location.href = '/';
      return;
    }
    
    setUser(parsedUser);
    
    // Initialize profile data
    if (parsedUser) {
      setProfileData({
        name: parsedUser.name || '',
        email: parsedUser.email || '',
        department: parsedUser.department || '',
      });
      setProfilePicturePreview(parsedUser.profileImage || null);
    }
    
    // Load initial data
    loadProjects();
    loadReviews();
    loadMeetings();
    loadReports();
    loadAnalytics();
    loadAvailableGroups();
    loadFiles();
    loadRecentActivities();
  }, []);

  // Reload groups when dialog opens
  useEffect(() => {
    if (isGenerateReportOpen) {
      loadAvailableGroups();
    }
  }, [isGenerateReportOpen]);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/profile?userId=${user.id}`, {
        headers: {
          'x-user-id': user.id,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfileData(prev => ({
          ...prev,
          name: data.name || prev.name,
          email: data.email || prev.email,
          department: data.department || prev.department,
        }));
        if (data.profileImage) {
          setProfilePicturePreview(data.profileImage);
          const parsedUser = JSON.parse(localStorage.getItem('user') || '{}');
          parsedUser.profileImage = data.profileImage;
          localStorage.setItem('user', JSON.stringify(parsedUser));
          setUser(parsedUser);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

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
          setProfilePicturePreview(profilePicUrl);
          parsedUser.profileImage = profilePicUrl;
          localStorage.setItem('user', JSON.stringify(parsedUser));
          setUser(parsedUser);
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
          description: "User not authenticated",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': parsedUser.id,
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        const updatedData = await response.json();
        parsedUser.name = updatedData.name;
        parsedUser.email = updatedData.email;
        parsedUser.department = updatedData.department;
        localStorage.setItem('user', JSON.stringify(parsedUser));
        setUser(parsedUser);
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    try {
      const userData = localStorage.getItem('user');
      const parsedUser = userData ? JSON.parse(userData) : null;
      
      if (!parsedUser?.id) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': parsedUser.id,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: data.message || "Password changed successfully",
        });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        // Try to parse error as JSON, fallback to text if it fails
        let errorMessage = 'Failed to change password';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (parseError) {
          // If response is not JSON (e.g., HTML error page), use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadRecentActivities();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'groups' && user) {
      loadGroups();
    }
  }, [activeTab, groupStatusFilter, user]);

  useEffect(() => {
    if (activeTab === 'organization' && user) {
      loadCommittee();
    }
  }, [activeTab, user]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  // API Functions
  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user?.id) {
        console.error('User not authenticated');
        setProjects([]);
        return;
      }

      const response = await fetch('/api/committee/projects', {
        headers: {
          'x-user-id': user.id
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data || []);
        setStats(prev => ({ 
          ...prev, 
          totalProjects: data.length,
          pendingReviews: data.filter((p: any) => p.projectStatus === 'PROPOSED' || p.projectStatus === 'IN_PROGRESS').length
        }));
      } else {
        console.error('Failed to load projects:', response.status);
        setProjects([]);
        toast({
          title: "Error",
          description: "Failed to load projects",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive"
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadReviews = async () => {
    setLoadingReviews(true);
    try {
      // Mock data for reviews
      const mockReviews = [
        {
          id: '1',
          projectId: '1',
          projectTitle: 'AI-Based Student Attendance System',
          students: ['Ali Khan', 'Sara Ahmed'],
          supervisor: 'Dr. Muhammad Ali',
          score: 85,
          feedback: 'Good implementation with room for improvement',
          recommendation: 'APPROVED',
          reviewer: 'Dr. Committee Head',
          date: '2024-01-15'
        },
        {
          id: '2',
          projectId: '2',
          projectTitle: 'E-Commerce Platform with React',
          students: ['Fatima Noor', 'Usman Malik'],
          supervisor: 'Prof. Ayesha Khan',
          score: 92,
          feedback: 'Excellent work, well-structured code',
          recommendation: 'APPROVED',
          reviewer: 'Dr. Committee Head',
          date: '2024-01-14'
        }
      ];
      setReviews(mockReviews);
      setStats(prev => ({ 
        ...prev, 
        completedReviews: mockReviews.length 
      }));
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const loadMeetings = async () => {
    try {
      // Mock data for meetings
      const mockMeetings = [
        {
          id: '1',
          title: 'FYP Proposal Defense - Batch 2024',
          date: '2024-01-20',
          time: '10:00 AM',
          location: 'Conference Room A',
          attendees: ['Dr. Muhammad Ali', 'Prof. Ayesha Khan', 'Dr. Bilal Ahmed'],
          status: 'SCHEDULED'
        },
        {
          id: '2',
          title: 'Progress Review Meeting',
          date: '2024-01-22',
          time: '2:00 PM',
          location: 'Lab 301',
          attendees: ['Dr. Sara Noor', 'Prof. Usman Malik'],
          status: 'SCHEDULED'
        }
      ];
      setMeetings(mockMeetings);
      const upcomingMeetings = mockMeetings.filter(m => 
        new Date(m.date) >= new Date()
      );
      setStats(prev => ({ 
        ...prev, 
        upcomingMeetings: upcomingMeetings.length 
      }));
    } catch (error) {
      console.error('Error loading meetings:', error);
    }
  };

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const response = await fetch('/api/committee/reports');
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else {
        console.error('Failed to load reports');
        setReports([]);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/committee/reports/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const loadAvailableGroups = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user?.id) {
        console.error('User not authenticated');
        return;
      }

      const response = await fetch('/api/admin/groups?status=all', {
        headers: {
          'x-user-id': user.id
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableGroups(data || []);
        console.log('Loaded groups:', data?.length || 0);
      } else {
        console.error('Failed to load groups:', response.status);
        setAvailableGroups([]);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      setAvailableGroups([]);
    }
  };

  // File functions (limited: view & download for committee-head)
  const loadFiles = async () => {
    setLoadingFiles(true)
    try {
      console.log('[Committee Head] Fetching files from /api/committee/files...')
      const response = await fetch('/api/committee/files')
      console.log('[Committee Head] Response status:', response.status, response.statusText)
      
      if (response.ok) {
        const filesData = await response.json()
        console.log('[Committee Head] Received files data:', filesData)
        console.log('[Committee Head] Number of files received:', Array.isArray(filesData) ? filesData.length : 'Not an array')
        
        // Filter out any files that might not have valid IDs or are null/undefined
        const validFiles = (filesData || []).filter((file: any) => file && file.id)
        console.log('[Committee Head] Valid files after filtering:', validFiles.length)
        setUploadedFiles(validFiles)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('[Committee Head] API Error:', response.status, errorData)
        setUploadedFiles([])
      }
    } catch (error) {
      console.error('[Committee Head] Error loading files:', error)
      setUploadedFiles([])
    } finally {
      setLoadingFiles(false)
    }
  }

  // Group Approval Functions
  const loadGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await fetch(`/api/admin/groups?status=${groupStatusFilter}`, {
        headers: {
          'x-user-id': user?.id || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive"
      });
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleApproveGroup = async (groupId: string, approve: boolean) => {
    try {
      const response = await fetch(`/api/admin/groups/${groupId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ approve })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Group ${approve ? 'approved' : 'rejected'} successfully`
        });
        loadGroups();
      } else {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${approve ? 'approve' : 'reject'} group`);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${approve ? 'approve' : 'reject'} group`,
        variant: "destructive"
      });
    }
  };

  // Committee Management Functions
  const loadCommittee = async () => {
    setLoadingCommittee(true);
    try {
      const response = await fetch(`/api/admin/committees?headId=${user?.id}`, {
        headers: {
          'x-user-id': user?.id || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const myCommittee = data.find((c: any) => c.headId === user?.id);
        setCommittee(myCommittee || null);
      }
    } catch (error) {
      console.error('Error loading committee:', error);
      toast({
        title: "Error",
        description: "Failed to load committee",
        variant: "destructive"
      });
    } finally {
      setLoadingCommittee(false);
    }
  };

  const handleApproveFile = async (fileId: string) => {
    try {
      const response = await fetch('/api/committee/files', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, status: 'COMMITTEE_APPROVED' }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Proposal approved! Student has been notified.',
        });
        loadFiles(); // Reload files
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to approve file',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error approving file:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve file',
        variant: 'destructive',
      });
    }
  };

  const handleRejectFile = async (fileId: string) => {
    try {
      const response = await fetch('/api/committee/files', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, status: 'COMMITTEE_REJECTED' }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'File rejected',
        });
        loadFiles(); // Reload files
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to reject file',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error rejecting file:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject file',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!fileId) {
      toast({
        title: 'Error',
        description: 'Invalid file ID',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/committee/files/${fileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'File deleted successfully',
        });
        loadFiles(); // Reload files
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to delete file';
        
        // If file not found, remove it from the list
        if (response.status === 404) {
          setUploadedFiles((prevFiles) => prevFiles.filter((f: any) => f.id !== fileId));
          toast({
            title: 'File Removed',
            description: 'File was not found in database and has been removed from the list',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Error',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete file. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleViewFile = (file: any) => {
    // Set the selected file to show details in dialog
    setSelectedFile(file)
  }

  const handleDownloadFile = async (file) => {
    try {
      console.log('[Download File] Attempting to download file:', { id: file.id, fileUrl: file.fileUrl, fileName: file.fileName })
      
      // Use fileUrl directly if available and it's a full URL or starts with /
      if (file.fileUrl && (file.fileUrl.startsWith('http') || file.fileUrl.startsWith('/'))) {
        console.log('[Download File] Using direct fileUrl:', file.fileUrl)
        const a = document.createElement('a')
        a.href = file.fileUrl
        a.download = file.originalName || file.fileName || 'download'
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        a.remove()
        console.log('[Download File] Download started via direct URL')
        return
      }
      
      // Fallback to download endpoint
      console.log('[Download File] Using download endpoint for file ID:', file.id)
      const url = `/api/admin/files/${encodeURIComponent(String(file.id))}/download`
      const a = document.createElement('a')
      a.href = url
      a.download = file.originalName || file.fileName || 'download'
      document.body.appendChild(a)
      a.click()
      a.remove()
      console.log('[Download File] Download started via endpoint')
    } catch (error) {
      console.error('[Download File] Error:', error)
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to download file. Please try again.', 
        variant: 'destructive' 
      })
    }
  }

  // Review Functions
  const handleStartReview = (project) => {
    setSelectedProject(project);
    setReviewFormData({
      projectId: project.id,
      score: 0,
      feedback: '',
      recommendation: 'APPROVED',
      comments: ''
    });
    setIsReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    try {
      // Mock API call
      const newReview = {
        id: Date.now().toString(),
        projectId: reviewFormData.projectId,
        projectTitle: selectedProject?.proposalTitle || selectedProject?.title,
        students: selectedProject?.group?.members?.map((m: any) => m.name) || selectedProject?.submittedBy?.name ? [selectedProject.submittedBy.name] : [],
        supervisor: selectedProject?.supervisor?.name || 'N/A',
        score: reviewFormData.score,
        feedback: reviewFormData.feedback,
        recommendation: reviewFormData.recommendation,
        reviewer: user.name,
        date: new Date().toISOString().split('T')[0]
      };
      
      setReviews([newReview, ...reviews]);
      setIsReviewDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Review submitted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive"
      });
    }
  };

  // Meeting Functions
  const handleAddMeeting = async () => {
    try {
      const newMeeting = {
        id: Date.now().toString(),
        title: meetingFormData.title,
        date: meetingFormData.date,
        time: meetingFormData.time,
        location: meetingFormData.location,
        attendees: meetingFormData.attendees,
        status: 'SCHEDULED'
      };
      
      setMeetings([newMeeting, ...meetings]);
      setIsAddMeetingOpen(false);
      setMeetingFormData({ title: '', description: '', date: '', time: '', location: '', attendees: [] });
      
      toast({
        title: "Success",
        description: "Meeting scheduled successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule meeting",
        variant: "destructive"
      });
    }
  };

  // Report Functions
  const handleGenerateReport = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user?.id) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch('/api/committee/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(reportFormData)
      });

      if (response.ok) {
        const newReport = await response.json();
        setReports([newReport, ...reports]);
        setIsGenerateReportOpen(false);
        setReportFormData({
          type: 'PROJECT_SUMMARY',
          dateRange: 'LAST_MONTH',
          department: 'ALL',
          groupId: ''
        });
        
        toast({
          title: "Success",
          description: "Report generated successfully",
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate report');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive"
      });
    }
  };

  const handleDownloadReport = async (report: any) => {
    try {
      // For defense schedule reports, get group ID from assignments
      let groupId = report.groupId;
      
      if (!groupId && report.defenseScheduleId) {
        // Fetch the defense schedule to get group ID
        const scheduleResponse = await fetch(`/api/admin/jury/schedules/${report.defenseScheduleId}`);
        if (scheduleResponse.ok) {
          const schedule = await scheduleResponse.json();
          if (schedule.juryAssignments && schedule.juryAssignments.length > 0) {
            groupId = schedule.juryAssignments[0].groupId;
          }
        }
      }

      // If still no groupId, try to get it from the report data
      if (!groupId && report.data?.group?.id) {
        groupId = report.data.group.id;
      }

      // For reports generated via API, use the report ID directly
      const reportId = report.id || report.defenseScheduleId;
      
      if (!reportId) {
        toast({
          title: "Error",
          description: "Report ID not found",
          variant: "destructive"
        });
        return;
      }

      // Construct download URL
      let downloadUrl = `/api/committee/reports/${reportId}/download`;
      if (groupId) {
        downloadUrl += `?groupId=${groupId}`;
      }

      // Open in new tab to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Success",
        description: "Report download started",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download report",
        variant: "destructive"
      });
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

  const getActivityStyle = (type: string) => {
    const typeUpper = type.toUpperCase();
    
    if (typeUpper.includes('ACCEPTED') || typeUpper.includes('APPROVED') || typeUpper.includes('SUCCESS')) {
      return { bgColor: 'bg-green-50', dotColor: 'bg-green-500', badge: 'Success', badgeVariant: 'default' as const };
    }
    if (typeUpper.includes('REJECTED') || typeUpper.includes('DECLINED')) {
      return { bgColor: 'bg-red-50', dotColor: 'bg-red-500', badge: 'Declined', badgeVariant: 'destructive' as const };
    }
    if (typeUpper.includes('PENDING') || typeUpper.includes('REQUEST')) {
      return { bgColor: 'bg-yellow-50', dotColor: 'bg-yellow-500', badge: 'Pending', badgeVariant: 'secondary' as const };
    }
    if (typeUpper.includes('MESSAGE')) {
      return { bgColor: 'bg-blue-50', dotColor: 'bg-blue-500', badge: 'Message', badgeVariant: 'secondary' as const };
    }
    return { bgColor: 'bg-blue-50', dotColor: 'bg-blue-500', badge: 'New', badgeVariant: 'secondary' as const };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending Review":
        return <Badge variant="secondary">{status}</Badge>;
      case "Under Review":
        return <Badge variant="default">{status}</Badge>;
      case "Approved":
        return <Badge className="bg-green-500">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const activeSidebarItem = sidebarItems.find(item => item.id === activeTab);

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 xl:w-64 bg-white shadow-lg flex-col h-full">
        <SidebarContent user={user} activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />
      </aside>

      {/* Main Area */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 flex items-center justify-between">
            {/* Mobile Menu Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden mr-1.5 sm:mr-2 h-7 w-7 sm:h-8 sm:w-8">
                  <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SidebarContent 
                  user={user} 
                  activeTab={activeTab} 
                  setActiveTab={setActiveTab} 
                  handleLogout={handleLogout}
                  onItemClick={() => {
                    const closeButton = document.querySelector('[data-sheet-close]') as HTMLButtonElement
                    closeButton?.click()
                  }} 
                />
              </SheetContent>
            </Sheet>

            <div className="flex-1 min-w-0">
              <h2 className="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-gray-900 truncate">
                {activeSidebarItem?.label || 'Committee Dashboard'}
              </h2>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 hidden sm:block truncate">
                {activeSidebarItem?.description || 'FYP Committee Management'}
              </p>
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2 lg:space-x-3">
              <NotificationsPanel />
            </div>
          </div>
        </header>

        <main className="p-2 sm:p-3 lg:p-4">
          <Tabs value={activeTab} onValueChange={(value) => {
            if (value === 'jury') {
              window.location.href = '/admin/jury-management'
            } else if (value === 'announcements') {
              window.location.href = '/committee-head/announcements'
            } else {
              setActiveTab(value)
            }
          }} className="space-y-3 sm:space-y-4 lg:space-y-6">

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-3 sm:space-y-4 lg:space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
              <div onClick={() => setActiveTab('projects')} className="cursor-pointer">
                <Card className="hover:shadow-lg transition-shadow h-full min-h-[85px] sm:min-h-[95px]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-4">
                    <CardTitle className="text-[11px] sm:text-xs font-medium">Total Projects</CardTitle>
                    <FolderOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0 pb-3 sm:pb-4">
                    <div className="text-lg sm:text-xl font-bold">{stats.totalProjects}</div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Assigned for review
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div onClick={() => setActiveTab('reviews')} className="cursor-pointer">
                <Card className="hover:shadow-lg transition-shadow h-full min-h-[85px] sm:min-h-[95px]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-4">
                    <CardTitle className="text-[11px] sm:text-xs font-medium">Pending Reviews</CardTitle>
                    <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0 pb-3 sm:pb-4">
                    <div className="text-lg sm:text-xl font-bold">{stats.pendingReviews}</div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Awaiting evaluation
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div onClick={() => setActiveTab('reviews')} className="cursor-pointer">
                <Card className="hover:shadow-lg transition-shadow h-full min-h-[85px] sm:min-h-[95px]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-4">
                    <CardTitle className="text-[11px] sm:text-xs font-medium">Completed Reviews</CardTitle>
                    <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0 pb-3 sm:pb-4">
                    <div className="text-lg sm:text-xl font-bold">{stats.completedReviews}</div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Evaluated projects
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div onClick={() => setActiveTab('files')} className="cursor-pointer">
                <Card className="hover:shadow-lg transition-shadow h-full min-h-[85px] sm:min-h-[95px]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-4">
                    <CardTitle className="text-[11px] sm:text-xs font-medium">Files Uploaded</CardTitle>
                    <FolderOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0 pb-3 sm:pb-4">
                    <div className="text-lg sm:text-xl font-bold">{uploadedFiles.length}</div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Student submissions
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Quick Actions */}
            <section>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                <div onClick={() => setActiveTab('reviews')} className="block h-full">
                  <Card className="relative h-full flex flex-col overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                    <CardHeader className="pb-1.5 sm:pb-2 flex-grow p-3 sm:p-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-lg flex items-center justify-center mb-1.5 sm:mb-2 shadow-inner">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <CardTitle className="text-sm sm:text-base">Review Projects</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3 sm:pb-4 text-[11px] sm:text-xs text-gray-600 p-3 sm:p-4">
                      Evaluate FYP projects
                    </CardContent>
                  </Card>
                </div>
                <div onClick={() => router.push('/committee-head/announcements')} className="block h-full">
                  <Card className="relative h-full flex flex-col overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                    <CardHeader className="pb-1.5 sm:pb-2 flex-grow p-3 sm:p-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 rounded-lg flex items-center justify-center mb-1.5 sm:mb-2 shadow-inner">
                        <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <CardTitle className="text-sm sm:text-base">Make Announcement</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3 sm:pb-4 text-[11px] sm:text-xs text-gray-600 p-3 sm:p-4">
                      Create FYP announcements
                    </CardContent>
                  </Card>
                </div>
                <div onClick={() => setActiveTab('groups')} className="block h-full">
                  <Card className="relative h-full flex flex-col overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                    <CardHeader className="pb-1.5 sm:pb-2 flex-grow p-3 sm:p-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-500 rounded-lg flex items-center justify-center mb-1.5 sm:mb-2 shadow-inner">
                        <Users2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <CardTitle className="text-sm sm:text-base">Group Approvals</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3 sm:pb-4 text-[11px] sm:text-xs text-gray-600 p-3 sm:p-4">
                      Review student groups
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-sm sm:text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                {loadingActivities ? (
                  <div className="flex items-center justify-center py-4 sm:py-6">
                    <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : recentActivities.length === 0 ? (
                  <div className="text-center py-4 sm:py-6">
                    <p className="text-xs sm:text-sm text-gray-500">No recent activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {recentActivities.map((activity: any) => {
                      const style = getActivityStyle(activity.type);
                      return (
                        <div key={activity.id} className={`flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 ${style.bgColor} rounded-lg`}>
                          <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 ${style.dotColor} rounded-full flex-shrink-0`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] sm:text-xs font-medium text-gray-900 truncate">{activity.title}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500">{formatActivityTime(activity.createdAt)}</p>
                          </div>
                          <Badge variant={style.badgeVariant} className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 flex-shrink-0">{style.badge}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">All Projects</h3>
                  <p className="text-sm text-gray-600">Complete list of projects assigned for committee review</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search projects..."
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="PROPOSED">Proposed</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loadingProjects ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading projects...</p>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Proposal Title</TableHead>
                            <TableHead>Students</TableHead>
                            <TableHead>Supervisor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Submitted Date</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {projects.length === 0 && !loadingProjects ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                No approved projects found
                              </TableCell>
                            </TableRow>
                          ) : (
                            projects
                              .filter((project: any) => {
                                const matchesSearch = project.proposalTitle?.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                                                     project.proposalDescription?.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                                                     project.projectTitle?.toLowerCase().includes(projectSearchQuery.toLowerCase());
                                const matchesStatus = projectStatusFilter === 'ALL' || project.projectStatus === projectStatusFilter;
                                return matchesSearch && matchesStatus;
                              })
                              .map((project: any) => (
                              <TableRow key={project.id} className="hover:bg-gray-50">
                                <TableCell className="font-medium">
                                  <div>
                                    <div className="font-semibold">{project.proposalTitle}</div>
                                    {project.projectTitle && project.projectTitle !== project.proposalTitle && (
                                      <div className="text-xs text-gray-500 mt-1">Project: {project.projectTitle}</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {project.group?.members?.map((member: any) => member.name).join(', ') || project.submittedBy?.name || 'No students assigned'}
                                </TableCell>
                                <TableCell>{project.supervisor?.name || 'No supervisor'}</TableCell>
                                <TableCell>
                                  <Badge variant={
                                    project.projectStatus === 'COMPLETED' ? 'default' : 
                                    project.projectStatus === 'IN_PROGRESS' ? 'secondary' : 
                                    project.projectStatus === 'APPROVED' ? 'default' : 'outline'
                                  }>
                                    {project.projectStatus?.replace('_', ' ') || 'APPROVED'}
                                  </Badge>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {project.status === 'COMMITTEE_APPROVED' ? 'Committee Approved' : 
                                     project.status === 'ADMIN_APPROVED' ? 'Admin Approved' : ''}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">{new Date(project.submittedDate).toLocaleDateString()}</div>
                                  {project.approvedDate && (
                                    <div className="text-xs text-gray-500">Approved: {new Date(project.approvedDate).toLocaleDateString()}</div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex space-x-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleStartReview(project)}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      Review
                                    </Button>
                                    {project.fileUrl && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => window.open(project.fileUrl, '_blank')}
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Project Reviews</h3>
                  <p className="text-sm text-gray-600">Evaluate and provide feedback on FYP projects</p>
                </div>
                <Badge variant="outline" className="text-sm">
                  {reviews.length} Reviews Completed
                </Badge>
              </div>

              {loadingReviews ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading reviews...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reviews Yet</h3>
                        <p className="text-gray-600">Start reviewing projects to provide feedback</p>
                      </CardContent>
                    </Card>
                  ) : (
                    reviews.map((review) => (
                      <Card key={review.id}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-semibold text-lg">{review.projectTitle}</h4>
                              <p className="text-sm text-gray-600">Students: {review.students.join(', ')}</p>
                              <p className="text-sm text-gray-600">Supervisor: {review.supervisor}</p>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              <Badge variant={review.recommendation === 'APPROVED' ? 'default' : 'destructive'}>
                                {review.recommendation}
                              </Badge>
                              <div className="flex items-center space-x-1">
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                <span className="text-sm font-medium">{review.score}/100</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Feedback:</p>
                            <p className="text-sm text-gray-600">{review.feedback}</p>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              Reviewed by {review.reviewer} on {review.date}
                            </span>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4 mr-1" />
                                View Details
                              </Button>
                              <Button size="sm" variant="outline">
                                <Edit className="w-4 h-4 mr-1" />
                                Edit Review
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="p-3 sm:p-4 lg:p-6">
                  <CardTitle className="text-sm sm:text-base lg:text-lg">Profile Settings</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage your profile information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center space-x-4 sm:space-x-6">
                    <div className="relative">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {profilePicturePreview ? (
                          <img src={profilePicturePreview} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-gray-400" />
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="mt-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 h-7 sm:h-8"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
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
                      <h3 className="text-base sm:text-lg lg:text-xl font-semibold">{profileData.name || user?.name || 'Committee Head'}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">{profileData.email || user?.email || ''}</p>
                      <p className="text-xs text-gray-500">Committee Head</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-xs sm:text-sm">Full Name</Label>
                      <Input 
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        className="h-8 sm:h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">Email</Label>
                      <Input 
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        className="h-8 sm:h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">Department</Label>
                      <Input 
                        value={profileData.department}
                        onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                        className="h-8 sm:h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">Role</Label>
                      <Input value="Committee Head" disabled className="h-8 sm:h-9 text-sm" />
                    </div>
                  </div>

                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-8 sm:h-9"
                    onClick={handleSaveProfile}
                  >
                    Save Changes
                  </Button>

                  <div className="pt-3 sm:pt-4 border-t">
                    <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Change Password</h4>
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <Label className="text-xs sm:text-sm">Current Password</Label>
                        <Input 
                          type="password" 
                          placeholder="Enter current password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="h-8 sm:h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs sm:text-sm">New Password</Label>
                        <Input 
                          type="password" 
                          placeholder="Enter new password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="h-8 sm:h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs sm:text-sm">Confirm New Password</Label>
                        <Input 
                          type="password" 
                          placeholder="Confirm new password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="h-8 sm:h-9 text-sm"
                        />
                      </div>
                      <Button 
                        className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-8 sm:h-9"
                        onClick={handlePasswordChange}
                      >
                        Update Password
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Organization Tab - Committee Management */}
          <TabsContent value="organization">
            <Card>
              <CardHeader>
                <CardTitle>My Committee</CardTitle>
                <CardDescription>
                  Manage your committee members (view and edit only - cannot create new committees)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCommittee ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading committee...</p>
                    </div>
                  </div>
                ) : !committee ? (
                  <div className="text-center py-12">
                    <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Committee Assigned</h3>
                    <p className="text-gray-600">You are not currently assigned as head of any committee.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{committee.name}</h3>
                      <p className="text-sm text-gray-600 mb-4">{committee.description}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Department</p>
                          <p className="font-medium">{committee.department}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Members</p>
                          <p className="font-medium">{committee.members?.length || 0}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold mb-4">Committee Members</h4>
                      <div className="space-y-4">
                        {committee.members?.map((member: any) => (
                          <Card key={member.id || member} className="border-2 hover:shadow-md transition-shadow">
                            <CardContent className="pt-6">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-4 flex-1">
                                  {/* Profile Image/Avatar */}
                                  <div className="relative">
                                    {member.profileImage && member.profileImage !== '' && member.profileImage !== 'null' ? (
                                      <img 
                                        src={member.profileImage} 
                                        alt={member.name || 'Member'}
                                        className="w-16 h-16 rounded-full object-cover border-2 border-green-200"
                                      />
                                    ) : (
                                      <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center border-2 border-green-200">
                                        <span className="text-2xl font-bold text-white">
                                          {(member.name || member)?.charAt(0)?.toUpperCase() || 'U'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Member Details */}
                                  <div className="flex-1 space-y-2">
                                    <div>
                                      <h5 className="text-lg font-bold text-gray-900">{member.name || member}</h5>
                                      {member.designation && (
                                        <p className="text-sm font-medium text-green-600">{member.designation}</p>
                                      )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                      {member.email && (
                                        <div className="flex items-center space-x-2">
                                          <span className="text-gray-500">Email:</span>
                                          <span className="text-gray-700">{member.email}</span>
                                        </div>
                                      )}
                                      {member.department && (
                                        <div className="flex items-center space-x-2">
                                          <span className="text-gray-500">Department:</span>
                                          <span className="text-gray-700">{member.department}</span>
                                        </div>
                                      )}
                                      {member.employeeId && (
                                        <div className="flex items-center space-x-2">
                                          <span className="text-gray-500">Employee ID:</span>
                                          <span className="text-gray-700">{member.employeeId}</span>
                                        </div>
                                      )}
                                      {member.officeHours && (
                                        <div className="flex items-center space-x-2">
                                          <span className="text-gray-500">Office Hours:</span>
                                          <span className="text-gray-700">{member.officeHours}</span>
                                        </div>
                                      )}
                                      {member.supervisionCapacity && (
                                        <div className="flex items-center space-x-2">
                                          <span className="text-gray-500">Supervision Capacity:</span>
                                          <span className="text-gray-700">{member.supervisionCapacity} students</span>
                                        </div>
                                      )}
                                      {member.role && (
                                        <div className="flex items-center space-x-2">
                                          <span className="text-gray-500">Role:</span>
                                          <Badge variant="secondary" className="text-xs">
                                            {member.role}
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                  {member.id && member.id !== user?.id && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setEditingMember(member);
                                            setIsEditCommitteeDialogOpen(true);
                                          }}
                                        >
                                          <Edit className="mr-2 h-4 w-4" />
                                          Edit Member
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-red-600"
                                          onClick={async () => {
                                            if (confirm('Remove this member from the committee?')) {
                                              try {
                                                const response = await fetch(`/api/admin/committees/${committee?.id}/members/${member.id}`, {
                                                  method: 'DELETE',
                                                  headers: { 'x-user-id': user?.id || '' }
                                                });
                                                if (response.ok) {
                                                  toast({ title: "Success", description: "Member removed" });
                                                  if (activeTab === 'organization' && user) {
                                                    const resp = await fetch(`/api/admin/committees?headId=${user?.id}`, {
                                                      headers: { 'x-user-id': user?.id || '' }
                                                    });
                                                    if (resp.ok) {
                                                      const data = await resp.json();
                                                      setCommittee(data.find((c: any) => c.headId === user?.id) || null);
                                                    }
                                                  }
                                                } else {
                                                  throw new Error('Failed to remove member');
                                                }
                                              } catch (error: any) {
                                                toast({ title: "Error", description: error.message, variant: "destructive" });
                                              }
                                            }
                                          }}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Remove Member
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Group Approvals Tab */}
          <TabsContent value="groups">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                  <div>
                    <CardTitle className="text-sm sm:text-base md:text-lg">Group Approvals</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Review and approve student groups for FYP projects
                    </CardDescription>
                  </div>
                  <Select value={groupStatusFilter} onValueChange={setGroupStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] h-8 sm:h-9 md:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="all">All Groups</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                {loadingGroups ? (
                  <div className="flex items-center justify-center py-6 sm:py-8 md:py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 border-b-2 border-green-600 mx-auto mb-2 sm:mb-3 md:mb-4"></div>
                      <p className="text-gray-600 text-xs sm:text-sm md:text-base">Loading groups...</p>
                    </div>
                  </div>
                ) : groups.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 md:py-12">
                    <Users2 className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-2 sm:mb-3 md:mb-4" />
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">No Groups Found</h3>
                    <p className="text-gray-600 text-xs sm:text-sm">
                      {groupStatusFilter === 'pending' && 'No groups are pending approval'}
                      {groupStatusFilter === 'approved' && 'No groups have been approved yet'}
                      {groupStatusFilter === 'all' && 'No active groups in the system'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {groups.map((group: any) => (
                      <Card key={group.id} className="border-2">
                        <CardContent className="pt-3 sm:pt-4 md:pt-6 p-3 sm:p-4 md:p-6">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                            <div className="flex-1 w-full min-w-0">
                              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 md:mb-4 flex-wrap">
                                <h3 className="text-sm sm:text-base md:text-lg font-semibold truncate">{group.name}</h3>
                                <Badge className={`${group.isApproved ? 'bg-green-500' : 'bg-yellow-500'} text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1`}>
                                  {group.isApproved ? 'Approved' : 'Pending'}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-3 md:mb-4">
                                <div>
                                  <p className="text-[11px] sm:text-xs md:text-sm text-gray-500">Members</p>
                                  <p className="font-medium text-xs sm:text-sm md:text-base">{group.members?.length || 0}/3</p>
                                </div>
                                <div>
                                  <p className="text-[11px] sm:text-xs md:text-sm text-gray-500">Created</p>
                                  <p className="font-medium text-xs sm:text-sm md:text-base">{new Date(group.createdAt).toLocaleDateString()}</p>
                                </div>
                                {group.isApproved && group.approvedAt && (
                                  <div>
                                    <p className="text-[11px] sm:text-xs md:text-sm text-gray-500">Approved On</p>
                                    <p className="font-medium text-xs sm:text-sm md:text-base">{new Date(group.approvedAt).toLocaleDateString()}</p>
                                  </div>
                                )}
                              </div>

                              {group.isApproved && group.approver && (
                                <div className="mb-2 sm:mb-3 md:mb-4 p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                                  <p className="text-[10px] sm:text-xs text-green-700 font-medium mb-1">Approved By</p>
                                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                    <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-green-600 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium text-green-900 truncate">{group.approver.name}</span>
                                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                                      {group.approver.role === 'ADMIN' ? 'Super Admin' : 'Committee Head'}
                                    </Badge>
                                  </div>
                                </div>
                              )}

                              <div>
                                <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Group Members:</p>
                                <div className="space-y-1.5 sm:space-y-2">
                                  {group.members?.map((member: any) => (
                                    <div key={member.id} className="flex items-center space-x-2 sm:space-x-3 p-1.5 sm:p-2 bg-gray-50 rounded">
                                      <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-[10px] sm:text-xs md:text-sm font-medium text-blue-700">
                                          {member.user?.name?.charAt(0) || 'U'}
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-medium truncate">{member.user?.name}</p>
                                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                                          {member.user?.rollNumber} • {member.user?.department}
                                        </p>
                                      </div>
                                      {member.role === 'LEADER' && (
                                        <Badge variant="secondary" className="text-[10px] sm:text-xs flex-shrink-0">Leader</Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {!group.isApproved && (
                              <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-[11px] sm:text-xs md:text-sm px-2 sm:px-3 py-1.5 sm:py-2 h-7 sm:h-8 md:h-9 flex-1 sm:flex-none"
                                  onClick={() => handleApproveGroup(group.id, true)}
                                >
                                  <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="text-[11px] sm:text-xs md:text-sm px-2 sm:px-3 py-1.5 sm:py-2 h-7 sm:h-8 md:h-9 flex-1 sm:flex-none"
                                  onClick={() => handleApproveGroup(group.id, false)}
                                >
                                  <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-2" />
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* File Tracking Tab (Committee Head: view & download only) */}
          <TabsContent value="files">
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                <div>
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">File Uploads</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Manage all student file submissions</p>
                </div>
                <Badge variant="outline" className="text-[11px] sm:text-xs md:text-sm px-2 sm:px-3 py-1 sm:py-1.5">
                  {uploadedFiles.length} Files
                </Badge>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
                <div className="flex-1 min-w-full sm:min-w-[200px]">
                  <Label className="text-[11px] sm:text-xs md:text-sm mb-1">Search Files</Label>
                  <div className="relative">
                    <Search className="absolute left-2 sm:left-3 top-2 sm:top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search files..."
                      value={fileSearchQuery}
                      onChange={(e) => setFileSearchQuery(e.target.value)}
                      className="pl-8 sm:pl-10 h-8 sm:h-9 md:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-auto min-w-[150px]">
                  <Label className="text-[11px] sm:text-xs md:text-sm mb-1">File Type</Label>
                  <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] h-8 sm:h-9 md:h-10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="PROPOSAL">Proposal</SelectItem>
                      <SelectItem value="REPORT">Report</SelectItem>
                      <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-auto min-w-[150px]">
                  <Label className="text-[11px] sm:text-xs md:text-sm mb-1">Department</Label>
                  <Select value={fileDepartmentFilter} onValueChange={setFileDepartmentFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] h-8 sm:h-9 md:h-10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Departments</SelectItem>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Software Engineering">Software Engineering</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Files Table */}
              {loadingFiles ? (
                <div className="flex items-center justify-center py-6 sm:py-8">
                  <div className="text-xs sm:text-sm text-muted-foreground">Loading files...</div>
                </div>
              ) : uploadedFiles.length === 0 ? (
                <Card>
                  <CardContent className="py-6 sm:py-8">
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-xs sm:text-sm">No files uploaded yet</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0 sm:p-4 md:p-6">
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap">File</TableHead>
                            <TableHead className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap hidden sm:table-cell">Student</TableHead>
                            <TableHead className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap hidden md:table-cell">Project</TableHead>
                            <TableHead className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap hidden lg:table-cell">Uploaded</TableHead>
                            <TableHead className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap">Status</TableHead>
                            <TableHead className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uploadedFiles.filter(file => {
                            const matchesSearch = (file.fileName || file.originalName || '').toLowerCase().includes(fileSearchQuery.toLowerCase()) ||
                              (file.studentName || '').toLowerCase().includes(fileSearchQuery.toLowerCase()) ||
                              (file.projectTitle || '').toLowerCase().includes(fileSearchQuery.toLowerCase())
                            const matchesType = fileTypeFilter === 'ALL' || (file.fileType || '').includes(fileTypeFilter)
                            const matchesDept = fileDepartmentFilter === 'ALL' || file.department === fileDepartmentFilter
                            return matchesSearch && matchesType && matchesDept
                          }).map((file) => {
                            const isApproved = file.status === 'COMMITTEE_APPROVED' || file.status === 'ADMIN_APPROVED';
                            let projectDisplay = '';
                            if ((file.fileType && file.fileType.toUpperCase() === 'PROOF') || file.projectTitle === 'No Project') {
                              projectDisplay = 'Proof Submission';
                            } else if (file.fileType && file.fileType.toUpperCase() === 'PROPOSAL' && file.groupName && file.groupName !== 'No Group') {
                              projectDisplay = `Proposal - ${file.groupName}`;
                            } else if (file.fileType && file.fileType.toUpperCase().includes('SUPERVISOR')) {
                              projectDisplay = 'Supervisor Change Request';
                            } else if (file.fileType && file.fileType.toUpperCase().includes('CONSENT')) {
                              projectDisplay = 'Consent Form';
                            } else if (file.fileType && file.fileType.toUpperCase().includes('EXTENSION')) {
                              projectDisplay = 'Extension Request';
                            } else if (file.fileType && file.fileType.toUpperCase().includes('REEVAL')) {
                              projectDisplay = 'Re-Evaluation Appeal';
                            } else if (file.fileType && file.fileType.toUpperCase().includes('GENERAL')) {
                              projectDisplay = 'General Request';
                            } else {
                              projectDisplay = file.projectTitle;
                            }
                            return (
                              <TableRow key={file.id}>
                                <TableCell className="text-xs sm:text-sm">
                                  <div className="font-medium truncate max-w-[120px] sm:max-w-none">{file.originalName || file.fileName}</div>
                                  <div className="text-[10px] sm:text-xs text-muted-foreground">{file.fileSize}</div>
                                  <div className="sm:hidden text-[10px] text-muted-foreground mt-1">
                                    {file.studentName} • {projectDisplay}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                                  <div className="font-medium truncate">{file.studentName}</div>
                                  <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{file.studentEmail}</div>
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm hidden md:table-cell truncate max-w-[150px]">{projectDisplay}</TableCell>
                                <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                                  <div className="text-xs sm:text-sm">{file.uploadDate}</div>
                                  <div className="text-[10px] sm:text-xs text-muted-foreground">{file.uploadTime}</div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 ${
                                      file.status === 'ADMIN_APPROVED' ? 'bg-green-600' :
                                      file.status === 'COMMITTEE_APPROVED' ? 'bg-blue-600' :
                                      file.status === 'COMMITTEE_REJECTED' ? 'bg-red-600' :
                                      file.status === 'ADMIN_REJECTED' ? 'bg-red-600' :
                                      file.status === 'REJECTED' ? 'bg-red-600' :
                                      'bg-yellow-500'
                                    }`}
                                  >
                                    {file.status === 'ADMIN_APPROVED'
                                      ? 'Approved by Admin'
                                      : file.status === 'COMMITTEE_APPROVED'
                                      ? 'Approved by Committee Head'
                                      : file.status === 'COMMITTEE_REJECTED'
                                      ? 'Rejected by Committee Head'
                                      : file.status === 'ADMIN_REJECTED'
                                      ? 'Rejected by Admin'
                                      : file.status === 'REJECTED'
                                      ? 'Rejected'
                                      : 'Pending'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex space-x-1 sm:space-x-2 flex-wrap gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewFile(file)}
                                      title="View"
                                      className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0"
                                    >
                                      <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDownloadFile(file)}
                                      title="Download"
                                      className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0"
                                    >
                                      <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                                    </Button>
                                    {!isApproved && (
                                      <>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => handleApproveFile(file.id)}
                                          title="Approve"
                                          className="bg-green-600 hover:bg-green-700 text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 sm:py-1.5 h-7 sm:h-8 md:h-9"
                                        >
                                          <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-0.5 sm:mr-1" />
                                          <span className="hidden sm:inline">Approve</span>
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => handleRejectFile(file.id)}
                                          title="Reject"
                                          className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 sm:py-1.5 h-7 sm:h-8 md:h-9"
                                        >
                                          <X className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-0.5 sm:mr-1" />
                                          <span className="hidden sm:inline">Reject</span>
                                        </Button>
                                      </>
                                    )}
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          title="Delete"
                                          className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0"
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-red-600" />
                                            Confirm Deletion
                                          </AlertDialogTitle>
                                          <AlertDialogDescription className="text-left space-y-2">
                                            <p>Are you sure you want to delete <span className="font-semibold text-gray-900">"{file.originalName || file.fileName}"</span>?</p>
                                            {isApproved && (
                                              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <p className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                                                  <AlertTriangle className="h-4 w-4" />
                                                  Warning: This file has been approved
                                                </p>
                                                <p className="text-xs text-yellow-700 mt-1">
                                                  Deleting an approved file may affect student records. Please proceed with caution.
                                                </p>
                                              </div>
                                            )}
                                            <p className="text-sm text-muted-foreground">This action cannot be undone. The file will be permanently removed from the system.</p>
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteFile(file.id)}
                                            className="bg-red-600 hover:bg-red-700"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* File Details Dialog */}
            <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {selectedFile?.fileType || 'File'} Details
                  </DialogTitle>
                  <DialogDescription>
                    View file submission details
                  </DialogDescription>
                </DialogHeader>
                {selectedFile && (
                  <div className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                          <User className="w-4 h-4" />
                          Submitted By
                        </div>
                        {selectedFile.studentName ? (
                          <>
                            <p className="text-sm font-semibold">{selectedFile.studentName}</p>
                            {selectedFile.studentEmail && (
                              <p className="text-xs text-gray-500">{selectedFile.studentEmail}</p>
                            )}
                            {selectedFile.studentRollNumber && (
                              <p className="text-xs text-gray-500">Roll Number: {selectedFile.studentRollNumber}</p>
                            )}
                            {selectedFile.department && (
                              <p className="text-xs text-gray-500">Department: {selectedFile.department}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Not available</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                          <Calendar className="w-4 h-4" />
                          Uploaded Date
                        </div>
                        <p className="text-sm">{selectedFile.uploadDate || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{selectedFile.uploadTime || ''}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <FileText className="w-4 h-4" />
                        File Details
                      </div>
                      <div className="bg-white border rounded-lg p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedFile.projectTitle && (
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">Project Title</label>
                              <p className="text-sm text-gray-900">{selectedFile.projectTitle}</p>
                            </div>
                          )}
                          {selectedFile.groupName && (
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">Group Name</label>
                              <p className="text-sm text-gray-900">{selectedFile.groupName}</p>
                            </div>
                          )}
                          {selectedFile.fileName && (
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">File Name</label>
                              <p className="text-sm text-gray-900">{selectedFile.originalName || selectedFile.fileName}</p>
                            </div>
                          )}
                          {selectedFile.fileSize && (
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">File Size</label>
                              <p className="text-sm text-gray-900">{selectedFile.fileSize}</p>
                            </div>
                          )}
                          {selectedFile.fileType && (
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">File Type</label>
                              <p className="text-sm text-gray-900">{selectedFile.fileType}</p>
                            </div>
                          )}
                          {selectedFile.status && (
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">Status</label>
                              <Badge
                                className={
                                  selectedFile.status === 'ADMIN_APPROVED' ? 'bg-green-600' :
                                  selectedFile.status === 'COMMITTEE_APPROVED' ? 'bg-blue-600' :
                                  selectedFile.status === 'COMMITTEE_REJECTED' ? 'bg-red-600' :
                                  selectedFile.status === 'ADMIN_REJECTED' ? 'bg-red-600' :
                                  selectedFile.status === 'REJECTED' ? 'bg-red-600' :
                                  'bg-yellow-500'
                                }
                              >
                                {selectedFile.status === 'ADMIN_APPROVED'
                                  ? 'Approved by Admin'
                                  : selectedFile.status === 'COMMITTEE_APPROVED'
                                  ? 'Approved by Committee Head'
                                  : selectedFile.status === 'COMMITTEE_REJECTED'
                                  ? 'Rejected by Committee Head'
                                  : selectedFile.status === 'ADMIN_REJECTED'
                                  ? 'Rejected by Admin'
                                  : selectedFile.status === 'REJECTED'
                                  ? 'Rejected'
                                  : 'Pending'}
                              </Badge>
                            </div>
                          )}
                        </div>
                        {(selectedFile.description || selectedFile.title) && (
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-500">Description</label>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedFile.description || selectedFile.title}</p>
                          </div>
                        )}
                        {selectedFile.fileUrl && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-500">File</label>
                            <a 
                              href={selectedFile.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              {selectedFile.originalName || selectedFile.fileName}
                            </a>
                          </div>
                        )}
                        {selectedFile.supervisorName && (
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-500">Supervisor</label>
                            <p className="text-sm text-gray-900">{selectedFile.supervisorName}</p>
                            {selectedFile.supervisorEmail && (
                              <p className="text-xs text-gray-500">{selectedFile.supervisorEmail}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Jury Management Tab - Redirects to dedicated page */}

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                <div>
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Reports & Analytics</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Generate reports and view analytics</p>
                </div>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-[11px] sm:text-xs md:text-sm px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 h-7 sm:h-8 md:h-9 w-full sm:w-auto"
                  onClick={() => {
                    setIsGenerateReportOpen(true);
                    loadAvailableGroups();
                  }}
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 mr-1 sm:mr-2" />
                  Generate Report
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {/* Analytics Cards */}
                <Card>
                  <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 md:p-6">
                    <CardTitle className="text-xs sm:text-sm font-medium">Project Completion Rate</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">{analytics.projectCompletionRate}%</div>
                    <p className="text-[10px] sm:text-xs text-gray-500">Last 30 days</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 md:p-6">
                    <CardTitle className="text-xs sm:text-sm font-medium">Average Review Score</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">{analytics.averageReviewScore}</div>
                    <p className="text-[10px] sm:text-xs text-gray-500">Out of 100</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 md:p-6">
                    <CardTitle className="text-xs sm:text-sm font-medium">Committee Efficiency</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">{analytics.committeeEfficiency}%</div>
                    <p className="text-[10px] sm:text-xs text-gray-500">Defense completion</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="p-3 sm:p-4 md:p-6">
                  <CardTitle className="text-sm sm:text-base md:text-lg">Generated Reports</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Download and manage committee reports</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                  {reports.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-2 sm:mb-3 md:mb-4" />
                      <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">No Reports Generated</h3>
                      <p className="text-gray-600 mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm">Generate your first report to get started</p>
                      <Button 
                        className="bg-green-600 hover:bg-green-700 text-[11px] sm:text-xs md:text-sm px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 h-7 sm:h-8 md:h-9"
                        onClick={() => {
                          setIsGenerateReportOpen(true);
                          loadAvailableGroups();
                        }}
                      >
                        <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 mr-1 sm:mr-2" />
                        Generate Report
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3 md:space-y-4">
                      {reports.map((report) => (
                        <div key={report.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-3 md:p-4 border rounded-lg">
                          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-1 min-w-0">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-green-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-xs sm:text-sm md:text-base truncate">{report.title}</h4>
                              <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 truncate">
                                Generated on {new Date(report.generatedDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5 sm:space-x-2 w-full sm:w-auto">
                            <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1">{report.status}</Badge>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDownloadReport(report)}
                              disabled={loadingReports}
                              className="text-[11px] sm:text-xs md:text-sm px-2 sm:px-3 py-1 sm:py-1.5 h-7 sm:h-8 md:h-9 flex-1 sm:flex-none"
                            >
                              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Project</DialogTitle>
            <DialogDescription>
              Evaluate and provide feedback for: {selectedProject?.proposalTitle || selectedProject?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Score (0-100)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={reviewFormData.score}
                onChange={(e) => setReviewFormData(prev => ({ ...prev, score: parseInt(e.target.value) || 0 }))}
                placeholder="Enter score"
              />
            </div>
            <div>
              <Label>Feedback</Label>
              <Textarea
                value={reviewFormData.feedback}
                onChange={(e) => setReviewFormData(prev => ({ ...prev, feedback: e.target.value }))}
                placeholder="Provide detailed feedback"
                rows={4}
              />
            </div>
            <div>
              <Label>Recommendation</Label>
              <Select
                value={reviewFormData.recommendation}
                onValueChange={(value) => setReviewFormData(prev => ({ ...prev, recommendation: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">Approve</SelectItem>
                  <SelectItem value="REJECTED">Reject</SelectItem>
                  <SelectItem value="REVISION_REQUIRED">Require Revision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Additional Comments</Label>
              <Textarea
                value={reviewFormData.comments}
                onChange={(e) => setReviewFormData(prev => ({ ...prev, comments: e.target.value }))}
                placeholder="Any additional comments"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitReview}>
                Submit Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Generate Report Dialog */}
      <Dialog open={isGenerateReportOpen} onOpenChange={setIsGenerateReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              Generate a new committee report with complete project data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Report Type</Label>
              <Select
                value={reportFormData.type}
                onValueChange={(value) => setReportFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROJECT_SUMMARY">Project Summary</SelectItem>
                  <SelectItem value="GROUP_REPORT">Group Report (Complete Digital File)</SelectItem>
                  <SelectItem value="PERFORMANCE">Committee Performance</SelectItem>
                  <SelectItem value="REVIEW_ANALYSIS">Review Analysis</SelectItem>
                  <SelectItem value="MEETING_SUMMARY">Meeting Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(reportFormData.type === 'GROUP_REPORT' || reportFormData.type === 'PROJECT_SUMMARY') && (
              <div>
                <Label>Select Group</Label>
                <Select
                  value={reportFormData.groupId}
                  onValueChange={(value) => setReportFormData(prev => ({ ...prev, groupId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGroups.map((group: any) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} {group.projects?.[0]?.title ? `- ${group.projects[0].title}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Date Range</Label>
              <Select
                value={reportFormData.dateRange}
                onValueChange={(value) => setReportFormData(prev => ({ ...prev, dateRange: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LAST_WEEK">Last Week</SelectItem>
                  <SelectItem value="LAST_MONTH">Last Month</SelectItem>
                  <SelectItem value="LAST_QUARTER">Last Quarter</SelectItem>
                  <SelectItem value="LAST_YEAR">Last Year</SelectItem>
                  <SelectItem value="ALL_TIME">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Select
                value={reportFormData.department}
                onValueChange={(value) => setReportFormData(prev => ({ ...prev, department: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  <SelectItem value="CS">Computer Science</SelectItem>
                  <SelectItem value="SE">Software Engineering</SelectItem>
                  <SelectItem value="IT">Information Technology</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsGenerateReportOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleGenerateReport}
                disabled={loadingReports || (reportFormData.type === 'GROUP_REPORT' && !reportFormData.groupId)}
              >
                {loadingReports ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}