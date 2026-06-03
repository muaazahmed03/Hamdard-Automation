'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Switch } from '@/components/ui/switch'
import { 
  Users, 
  FolderOpen, 
  Users2, 
  Activity, 
  Settings, 
  Database, 
  Shield, 
  Bell,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye,
  Check,
  X,
  Plus,
  LogOut,
  BarChart3,
  TrendingUp,
  Calendar,
  Mail,
  Phone,
  MapPin
} from 'lucide-react'


export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProjects: 0,
    committees: 0,
    systemHealth: 100
  })

  const [systemInfo] = useState({
    version: '1.0.0',
    environment: 'Development',
    database: 'SQLite',
    uptime: '99.9%'
  })
   // Define the overviewStats array
  const overviewStats = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      description: 'Registered users',
      icon: Users,
      borderColor: 'border-l-blue-500',
      bgColor: 'bg-blue-500'
    },
    {
      title: 'Active Projects',
      value: stats.activeProjects,
      description: 'Ongoing FYPs',
      icon: FolderOpen,
      borderColor: 'border-l-blue-500',
      bgColor: 'bg-blue-500'
    },
    {
      title: 'Committees',
      value: stats.committees,
      description: 'Active committees',
      icon: Users2,
      borderColor: 'border-l-blue-500',
      bgColor: 'bg-blue-500'
    },
    {
      title: 'System Health',
      value: `${stats.systemHealth}%`,
      description: 'Operational',
      icon: Activity,
      borderColor: 'border-l-blue-500',
      bgColor: 'bg-blue-500'
    }
  ];

  // User Management State
  const [users, setUsers] = useState([])
  const [searchUserQuery, setSearchUserQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [departmentFilter, setDepartmentFilter] = useState('ALL')
  const [loadingUsers, setLoadingUsers] = useState(false)
  // edit dialog not used for inline approval flow
  const router = useRouter()
  const { toast } = useToast()

  // Committee Management State
  const [committees, setCommittees] = useState([])
  const [loadingCommittees, setLoadingCommittees] = useState(false)
  const [selectedCommittee, setSelectedCommittee] = useState(null)
  const [isEditCommitteeOpen, setIsEditCommitteeOpen] = useState(false)
  const [committeeToDelete, setCommitteeToDelete] = useState(null)
  const [isDeleteCommitteeDialogOpen, setIsDeleteCommitteeDialogOpen] = useState(false)

  // Settings State
  const [activeSettingsTab, setActiveSettingsTab] = useState('general')
  const [settings, setSettings] = useState({
    general: {
      systemName: 'FYP Automation System',
      universityName: 'Hamdard University',
      contactEmail: 'admin@hamdard.edu.pk',
      maintenanceMode: false,
      allowRegistration: true
    },
    security: {
      minPasswordLength: 8,
      sessionTimeout: 24,
      maxLoginAttempts: 5,
      requireEmailVerification: false,
      enableTwoFactor: false
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      deadlineReminders: true,
      approvalNotifications: true
    },
    backup: {
      automaticBackup: true,
      backupFrequency: 'daily',
      retentionDays: 30
    }
  })

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    window.location.href = '/'
  }

  // User Management Functions
  // handleEditUser removed — edit dialog not used; approvals handled inline

  const handleAcceptUser = async (user) => {
    if (!user) return
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved' })
      })
        if (response.ok) {
          setUsers(users.map(u => u.id === user.id ? { ...u, status: 'Approved' } : u))
          toast({ title: 'Success', description: 'User approved' })
          await loadUsers()
          router.push('/admin?tab=users')
        } else {
        throw new Error('Failed to accept user')
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error approving user: ' + (error instanceof Error ? error.message : String(error)), variant: 'destructive' })
    }
  }

  const handleRejectUser = async (user) => {
    if (!user) return
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected' })
      })
      if (response.ok) {
        setUsers(users.map(u => u.id === user.id ? { ...u, status: 'Rejected' } : u))
        toast({ title: 'Success', description: 'User rejected' })
        await loadUsers()
        router.push('/admin?tab=users')
      } else {
        throw new Error('Failed to reject user')
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error rejecting user: ' + (error instanceof Error ? error.message : String(error)), variant: 'destructive' })
    }
  }

  // Backwards-compatible direct delete; use dialog-driven delete via UI where available
  const handleDeleteUser = async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      if (response.ok) {
        setUsers(users.filter(user => user.id !== userId))
        toast({ title: 'Success', description: 'User deleted successfully' })
      } else {
        throw new Error('Failed to delete user')
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error deleting user: ' + (error instanceof Error ? error.message : String(error)), variant: 'destructive' })
    }
  }

  // Dialog-driven delete flow
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState(null)
  const [pendingDeleteUserName, setPendingDeleteUserName] = useState('')
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false)

  const openDeleteUserDialog = (userId, userName) => {
    setPendingDeleteUserId(userId)
    setPendingDeleteUserName(userName || '')
    setIsDeleteUserDialogOpen(true)
  }

  const confirmDeleteUser = async () => {
    if (!pendingDeleteUserId) return
    setIsDeleteUserDialogOpen(false)
    try {
      const response = await fetch(`/api/admin/users/${pendingDeleteUserId}`, { method: 'DELETE' })
      if (response.ok) {
        setUsers(users.filter(u => u.id !== pendingDeleteUserId))
        toast({ title: 'Success', description: 'User deleted successfully' })
      } else {
        const err = await response.text().catch(() => 'Failed')
        throw new Error(err)
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error deleting user: ' + (error instanceof Error ? error.message : String(error)), variant: 'destructive' })
    } finally {
      setPendingDeleteUserId(null)
      setPendingDeleteUserName('')
    }
  }

  const handleUpdateUser = async (updatedUser) => {
    try {
      const response = await fetch(`/api/admin/users/${updatedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      })
      if (response.ok) {
        setUsers(users.map(user => user.id === updatedUser.id ? updatedUser : user))
        setIsEditUserOpen(false)
        setSelectedUser(null)
        alert('User updated successfully')
      } else {
        throw new Error('Failed to update user')
      }
    } catch (error) {
      alert('Error updating user: ' + error.message)
    }
  }

  // Committee Management Functions
  const handleEditCommittee = (committee) => {
    setSelectedCommittee(committee)
    setIsEditCommitteeOpen(true)
  }

  const handleDeleteCommittee = (committeeId) => {
    setCommitteeToDelete(committeeId)
    setIsDeleteCommitteeDialogOpen(true)
  }

  const confirmDeleteCommittee = async () => {
    if (!committeeToDelete) return

    try {
      const response = await fetch(`/api/admin/committees/${committeeToDelete}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setCommittees(committees.filter(committee => committee.id !== committeeToDelete))
        toast({
          title: "Committee Deleted",
          description: "Committee has been deleted successfully"
        })
      } else {
        throw new Error('Failed to delete committee')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete committee: " + error.message,
        variant: "destructive"
      })
    } finally {
      setCommitteeToDelete(null)
      setIsDeleteCommitteeDialogOpen(false)
    }
  }
    }
  }

  const handleUpdateCommittee = async (updatedCommittee) => {
    try {
      const response = await fetch(`/api/admin/committees/${updatedCommittee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCommittee)
      })
      if (response.ok) {
        setCommittees(committees.map(committee => committee.id === updatedCommittee.id ? updatedCommittee : committee))
        setIsEditCommitteeOpen(false)
        setSelectedCommittee(null)
        alert('Committee updated successfully')
      } else {
        throw new Error('Failed to update committee')
      }
    } catch (error) {
      alert('Error updating committee: ' + error.message)
    }
  }

  // Settings Functions
  const handleSaveSettings = async (section) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, settings: settings[section] })
      })
      if (response.ok) {
        alert(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully`)
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      alert('Error saving settings: ' + error.message)
    }
  }

  const updateSetting = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }

  useEffect(() => {
    // Mock data - in real app, fetch from API
    setStats({
      totalUsers: 156,
      activeProjects: 42,
      committees: 8,
      systemHealth: 100
    })

    // Mock users data
    setUsers([
      {
        id: 1,
        name: 'wajahat',
        email: 'wajahat@hamdard.edu',
        role: 'COMMITTEE_HEAD',
        status: 'Approved',
        department: 'Computer Science',
        joined: '2024-01-15'
      },
      {
        id: 2,
        name: 'teacher2',
        email: 'teacher2@gmail.com',
        role: 'TEACHER',
        status: 'Approved',
        department: 'Software Engineering',
        joined: '2024-01-10'
      },
      {
        id: 3,
        name: 'Ali Khan',
        email: 'ali@hamdard.edu',
        role: 'STUDENT',
        status: 'Approved',
        department: 'Computer Science',
        joined: '2024-01-12'
      },
      {
        id: 4,
        name: 'Sara Ahmed',
        email: 'sara@hamdard.edu',
        role: 'STUDENT',
        status: 'Pending',
        department: 'Computer Science',
        joined: '2024-01-18'
      },
      {
        id: 5,
        name: 'Dr. Muhammad Ali',
        email: 'm.ali@hamdard.edu',
        role: 'TEACHER',
        status: 'Approved',
        department: 'Computer Science',
        joined: '2023-12-01'
      },
      {
    ])

    // Mock committees data
    setCommittees([
      {
        id: 1,
        name: 'Computer Science Committee',
        head: 'Dr. Muhammad Ali',
        members: ['Dr. Ayesha Khan', 'Prof. Bilal Ahmed', 'Dr. Sara Noor'],
        status: 'Active',
        created: '2024-01-01'
      },
      {
        id: 2,
        name: 'Software Engineering Committee',
        head: 'Prof. Usman Malik',
        members: ['Dr. Fatima Noor', 'Dr. Hassan Raza'],
        status: 'Active',
        created: '2024-01-05'
      },
      {
        id: 3,
        name: 'AI Research Committee',
        head: 'Dr. Zainab Ali',
        members: ['Dr. Ahmed Khan', 'Dr. Mariam Yousuf'],
        status: 'Inactive',
        created: '2023-12-15'
      }
    ])
  }, [])
       id: 6,
        name: 'Admin User',
        email: 'ahmedshayan928@gmail.com',
        role: 'ADMIN',
        status: 'Approved',
        department: 'Administration',
        joined: '2023-11-15'
      }
 
  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchUserQuery.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
    const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter
    const matchesDepartment = departmentFilter === 'ALL' || user.department === departmentFilter
    return matchesSearch && matchesRole && matchesStatus && matchesDepartment
  })

  const getRoleBadge = (role: string) => {
    const roleColors = {
      'SUPER_ADMIN': 'bg-red-500',
      'ADMIN': 'bg-orange-500',
      'COMMITTEE_HEAD': 'bg-purple-500',
      'TEACHER': 'bg-blue-500',
      'STUDENT': 'bg-green-500'
    }
    return (
      <Badge className={roleColors[role as keyof typeof roleColors] || 'bg-gray-500'}>
        {role.replace('_', ' ')}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'Approved' ? 'default' : 'secondary'} className={
        status === 'Approved' ? 'bg-green-500' : 'bg-yellow-500'
      }>
        {status}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Welcome, Super Admin!</h1>
              <p className="text-green-100">System administration and oversight</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="secondary" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Navigation Tabs */}
        <Tabs defaultValue="overview" onValueChange={(value) => {
          if (value === 'jury') {
            window.location.href = '/admin/jury-management'
          }
        }} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Manage Users</TabsTrigger>
            <TabsTrigger value="jury">Jury Management</TabsTrigger>
            <TabsTrigger value="projects">Review Projects</TabsTrigger>
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="committees">Committees</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {overviewStats.map((item, index) => {
    const Icon = item.icon;
    return (
      <Card
        key={index}
        className={`card-accent hover:shadow-lg transition-shadow h-full flex flex-col`}
      >
        <CardHeader className="pb-3 flex-grow">
          <div className={`w-12 h-12 ${item.bgColor} rounded-lg flex items-center justify-center mb-3`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-lg">{item.title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold mb-1">{item.value}</div>
          <p className="text-sm text-gray-600">{item.description}</p>
        </CardContent>
      </Card>
    );
  })}
</div>

            {/* Quick Actions and System Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Schedule Meeting', description: 'Book a meeting with your students', icon: Calendar, color: 'bg-blue-500' },
                      { label: 'View Requests', description: 'Review supervision requests', icon: Users2, color: 'bg-green-500' },
                      { label: 'My Projects', description: 'Manage your projects', icon: FolderOpen, color: 'bg-purple-500' },
                      { label: 'Send Message', description: 'Chat with students', icon: Mail, color: 'bg-orange-500' }
                    ].map((quickAction) => {
                      const Icon = quickAction.icon
                      return (
                        <div key={quickAction.label} className="block h-full">
                          <Card
                            onClick={() => {}}
                            className="card-accent relative h-full flex flex-col overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-shadow cursor-pointer"
                          >
                            <CardHeader className="pb-3 flex-grow pl-11">
                              <div className={`w-12 h-12 ${quickAction.color} rounded-xl flex items-center justify-center mb-3 shadow-inner`}>
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              <CardTitle className="text-lg">{quickAction.label}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 pb-5 pl-10 text-sm text-gray-600">{quickAction.description}</CardContent>
                          </Card>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </div>

              {/* System Information */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                  <CardDescription>
                    Current system status and information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Version</label>
                      <p className="text-lg font-semibold">{systemInfo.version}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Environment</label>
                      <p className="text-lg font-semibold">
                        <Badge variant="secondary">{systemInfo.environment}</Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Database</label>
                      <p className="text-lg font-semibold">{systemInfo.database}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Uptime</label>
                      <p className="text-lg font-semibold text-green-600">{systemInfo.uptime}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Manage Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      Manage all system users and their permissions
                    </CardDescription>
                  </div>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter */}
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search users by name or email..."
                        value={searchUserQuery}
                        onChange={(e) => setSearchUserQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      More Filters
                    </Button>
                  </div>
                  <div className="flex gap-4">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Roles</SelectItem>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="COMMITTEE_HEAD">Committee Head</SelectItem>
                        <SelectItem value="TEACHER">Teacher</SelectItem>
                        <SelectItem value="STUDENT">Student</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="Eligible">Eligible</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Departments</SelectItem>
                        <SelectItem value="Computer Science">Computer Science</SelectItem>
                        <SelectItem value="Software Engineering">Software Engineering</SelectItem>
                        <SelectItem value="Information Technology">Information Technology</SelectItem>
                        <SelectItem value="Administration">Administration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Users Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getRoleBadge(user.role)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(user.status)}
                          </TableCell>
                          <TableCell>
                            {user.department || '—'}
                          </TableCell>
                          <TableCell>
                            {user.joined || (user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {user.status === 'Pending' ? (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => handleAcceptUser(user)} title="Approve">
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleRejectUser(user)} title="Reject">
                                    <X className="h-4 w-4 text-yellow-600" />
                                  </Button>
                                </>
                              ) : (
                                <span className="text-sm text-gray-500">—</span>
                              )}
                              <Button size="sm" variant="outline" onClick={() => openDeleteUserDialog(user.id, user.name)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jury Management Tab - Redirects to dedicated page */}

          {/* Review Projects Tab */}
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>Review Projects</CardTitle>
                <CardDescription>
                  Track and review student project progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Project review functionality - coming soon or redirect to main admin dashboard
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization">
            <Card>
              <CardHeader>
                <CardTitle>Organization</CardTitle>
                <CardDescription>
                  Manage faculties and departments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Organization management - coming soon or redirect to main admin dashboard
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Committees Tab */}
          <TabsContent value="committees">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Committee Management</CardTitle>
                    <CardDescription>
                      Manage FYP committees and their members
                    </CardDescription>
                  </div>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Committee
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Committees Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Committee</TableHead>
                        <TableHead>Head</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {committees.map((committee) => (
                        <TableRow key={committee.id}>
                          <TableCell>
                            <div className="font-medium">{committee.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <Users className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-medium">{committee.head}</div>
                                <div className="text-sm text-gray-500">Committee Head</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {committee.members.map((member, index) => (
                                <div key={index} className="text-sm">
                                  {member}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={committee.status === 'Active' ? 'bg-green-500' : 'bg-gray-500'}>
                              {committee.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {committee.created}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" onClick={() => alert('View committee details: ' + committee.name)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleEditCommittee(committee)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDeleteCommittee(committee.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <div className="space-y-6">
              {/* Reports Overview */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle>Reports & Analytics</CardTitle>
                  <CardDescription>
                    System-wide reports and performance analytics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Users</p>
                            <p className="text-2xl font-bold text-gray-900">156</p>
                            <p className="text-xs text-green-600">+12% from last month</p>
                          </div>
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Active Projects</p>
                            <p className="text-2xl font-bold text-gray-900">42</p>
                            <p className="text-xs text-green-600">+8% from last month</p>
                          </div>
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <FolderOpen className="w-6 h-6 text-green-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Completed Projects</p>
                            <p className="text-2xl font-bold text-gray-900">28</p>
                            <p className="text-xs text-green-600">+15% from last month</p>
                          </div>
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-purple-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Avg. Completion Time</p>
                            <p className="text-2xl font-bold text-gray-900">4.2 mo</p>
                            <p className="text-xs text-red-600">-5% from last month</p>
                          </div>
                          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-orange-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Project Status Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Proposed</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{width: '30%'}}></div>
                              </div>
                              <span className="text-sm text-gray-600">30%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">In Progress</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div className="bg-yellow-500 h-2 rounded-full" style={{width: '45%'}}></div>
                              </div>
                              <span className="text-sm text-gray-600">45%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Completed</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{width: '25%'}}></div>
                              </div>
                              <span className="text-sm text-gray-600">25%</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>User Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Daily Active Users</span>
                            <span className="text-sm font-bold">89</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Weekly Active Users</span>
                            <span className="text-sm font-bold">134</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Monthly Active Users</span>
                            <span className="text-sm font-bold">156</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">New Registrations</span>
                            <span className="text-sm font-bold">12</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Export Reports */}
                  <div className="flex justify-end space-x-4 mt-6">
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export Excel
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Generate Full Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              {/* General Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Basic system configuration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="systemName">System Name</Label>
                      <Input
                        id="systemName"
                        value={settings.systemName}
                        onChange={(e) => setSettings({...settings, systemName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="universityName">University Name</Label>
                      <Input
                        id="universityName"
                        value={settings.universityName}
                        onChange={(e) => setSettings({...settings, universityName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={settings.contactEmail}
                      onChange={(e) => setSettings({...settings, contactEmail: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-gray-500">Temporarily disable user access</p>
                    </div>
                    <Switch
                      checked={settings.maintenanceMode}
                      onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Registration</Label>
                      <p className="text-sm text-gray-500">Enable new user registration</p>
                    </div>
                    <Switch
                      checked={settings.allowRegistration}
                      onCheckedChange={(checked) => setSettings({...settings, allowRegistration: checked})}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Security Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Configure security and authentication options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="minPasswordLength">Minimum Password Length</Label>
                    <Input
                      id="minPasswordLength"
                      type="number"
                      value="8"
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value="24"
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      value="5"
                      readOnly
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Email Verification</Label>
                      <p className="text-sm text-gray-500">Force email verification for new accounts</p>
                    </div>
                    <Switch defaultChecked={false} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Two-Factor Authentication</Label>
                      <p className="text-sm text-gray-500">Add an extra layer of security</p>
                    </div>
                    <Switch defaultChecked={false} />
                  </div>
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Configure system notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-gray-500">Send notifications via email</p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => setSettings({...settings, emailNotifications: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-gray-500">Send notifications via SMS</p>
                    </div>
                    <Switch
                      checked={settings.smsNotifications}
                      onCheckedChange={(checked) => setSettings({...settings, smsNotifications: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-gray-500">Send browser push notifications</p>
                    </div>
                    <Switch
                      checked={settings.pushNotifications}
                      onCheckedChange={(checked) => setSettings({...settings, pushNotifications: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Deadline Reminders</Label>
                      <p className="text-sm text-gray-500">Remind users about upcoming deadlines</p>
                    </div>
                    <Switch
                      checked={settings.deadlineReminders}
                      onCheckedChange={(checked) => setSettings({...settings, deadlineReminders: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Approval Notifications</Label>
                      <p className="text-sm text-gray-500">Notify when approvals are required</p>
                    </div>
                    <Switch
                      checked={settings.approvalNotifications}
                      onCheckedChange={(checked) => setSettings({...settings, approvalNotifications: checked})}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Backup Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Backup Settings</CardTitle>
                  <CardDescription>
                    Configure data backup and retention
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Automatic Backup</Label>
                      <p className="text-sm text-gray-500">Enable automatic system backups</p>
                    </div>
                    <Switch
                      checked={settings.automaticBackup}
                      onCheckedChange={(checked) => setSettings({...settings, automaticBackup: checked})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backupFrequency">Backup Frequency</Label>
                    <Select value={settings.backupFrequency} onValueChange={(value) => setSettings({...settings, backupFrequency: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retentionDays">Retention Days</Label>
                    <Input
                      id="retentionDays"
                      type="number"
                      value={settings.retentionDays}
                      onChange={(e) => setSettings({...settings, retentionDays: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="flex space-x-4">
                    <Button variant="outline">
                      <Database className="h-4 w-4 mr-2" />
                      Backup Now
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Restore Backup
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Save Settings */}
              <div className="flex justify-end">
                <Button className="bg-green-600 hover:bg-green-700">
                  Save Settings
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

        {/* Delete User Confirmation Dialog */}
        <AlertDialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete <strong>{pendingDeleteUserName}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteUserDialogOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteUser}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      {/* Edit User dialog removed — approvals handled inline in the users table */}

      {/* Edit Committee Dialog */}
      <Dialog open={isEditCommitteeOpen} onOpenChange={setIsEditCommitteeOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Committee</DialogTitle>
            <DialogDescription>
              Update committee information and members
            </DialogDescription>
          </DialogHeader>
          {selectedCommittee && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-committee-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-committee-name"
                  value={selectedCommittee.name}
                  onChange={(e) => setSelectedCommittee({...selectedCommittee, name: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-committee-head" className="text-right">
                  Head
                </Label>
                <Input
                  id="edit-committee-head"
                  value={selectedCommittee.head}
                  onChange={(e) => setSelectedCommittee({...selectedCommittee, head: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-committee-status" className="text-right">
                  Status
                </Label>
                <Select
                  value={selectedCommittee.status}
                  onValueChange={(value) => setSelectedCommittee({...selectedCommittee, status: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditCommitteeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleUpdateCommittee(selectedCommittee)}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Committee Confirmation Dialog */}
      <AlertDialog open={isDeleteCommitteeDialogOpen} onOpenChange={setIsDeleteCommitteeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Committee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this committee? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCommitteeToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCommittee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}