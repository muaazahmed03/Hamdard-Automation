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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { 
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  UserCheck,
  AlertCircle,
  ArrowLeft
} from 'lucide-react'

interface DefenseSchedule {
  id: string
  defenseType: 'PROPOSAL' | 'FYP_I' | 'FYP_II'
  title: string
  description?: string
  defenseDate: string
  defenseTime: string
  venue: string
  status: string
  isPublished: boolean
  createdAt: string
  juryAssignments: JuryAssignment[]
}

interface JuryAssignment {
  id: string
  defenseScheduleId: string
  groupId: string
  groupName?: string
  projectTitle?: string
  juryMembers: string
  chairpersonId?: string
  evaluationStatus: string
  marks?: number
  feedback?: string
  juryEvaluations?: string // JSON string of individual evaluations
}

interface ApprovedDefense {
  id: string
  defenseType: 'PROPOSAL' | 'FYP_I' | 'FYP_II'
  title: string
  marks?: number
  feedback?: string
  project: {
    id: string
    title: string
    group?: {
      id: string
      name: string
      members: any[]
    }
    supervisor?: {
      id: string
      name: string
      email: string
      department?: string
    }
  }
  student?: {
    id: string
    name: string
    email: string
    rollNumber?: string
  }
  approvedAt: string
  defenseDate?: string
}

interface Teacher {
  id: string
  name: string
  email: string
  department: string
}

export default function JuryManagementPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState('schedules')
  const [schedules, setSchedules] = useState<DefenseSchedule[]>([])
  const [approvedDefenses, setApprovedDefenses] = useState<ApprovedDefense[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [availableGroups, setAvailableGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false)
  const [isAssignJuryOpen, setIsAssignJuryOpen] = useState(false)
  const [isViewScheduleOpen, setIsViewScheduleOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<DefenseSchedule | null>(null)
  const [selectedDefense, setSelectedDefense] = useState<ApprovedDefense | null>(null)
  const [isViewProposalOpen, setIsViewProposalOpen] = useState(false)
  const [scheduleDetails, setScheduleDetails] = useState<any>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [scheduleToDelete, setScheduleToDelete] = useState<DefenseSchedule | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [defenseToDelete, setDefenseToDelete] = useState<ApprovedDefense | null>(null)
  const [isDeletingProposal, setIsDeletingProposal] = useState(false)
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)
  const [assignmentToReschedule, setAssignmentToReschedule] = useState<{ assignment: JuryAssignment; schedule: DefenseSchedule } | null>(null)
  const [assignmentToDelete, setAssignmentToDelete] = useState<JuryAssignment | null>(null)
  const [isDeleteAssignmentDialogOpen, setIsDeleteAssignmentDialogOpen] = useState(false)
  const [isDeletingAssignment, setIsDeletingAssignment] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'group' | 'supervisor'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('')
  const [groupSearchQuery, setGroupSearchQuery] = useState('')
  
  const [scheduleForm, setScheduleForm] = useState({
    defenseType: 'PROPOSAL',
    title: '',
    description: '',
    defenseDate: '',
    defenseTime: '',
    venue: '',
    isPublished: false,
    selectedTeachers: [] as string[],
    selectedGroups: [] as string[]
  })
  
  const [juryForm, setJuryForm] = useState({
    groupId: '',
    groupName: '',
    projectTitle: '',
    juryMembers: [] as string[],
    chairpersonId: ''
  })
  
  const [rescheduleForm, setRescheduleForm] = useState({
    defenseDate: '',
    defenseTime: '',
    venue: '',
    juryMembers: [] as string[]
  })

  useEffect(() => {
    // Set initial role from localStorage for immediate navigation decisions
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      if (storedUser?.role) {
        setUserRole(storedUser.role)
      }
    } catch {
      // ignore parse errors; fetchUserRole will handle
    }

    loadSchedules()
    loadApprovedDefenses()
    loadTeachers()
    loadApprovedGroups()
    fetchUserRole()
  }, [])

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/auth/session')
      const data = await response.json()
      setUserRole(data.user?.role || 'ADMIN')
    } catch (error) {
      console.error('Error fetching user role:', error)
    }
  }

  const handleBackToDashboard = () => {
    if (userRole === 'COMMITTEE_HEAD') {
      router.push('/committee-head')
    } else {
      router.push('/super-admin')
    }
  }

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/jury/schedules')
      const data = await response.json()
      setSchedules(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load defense schedules',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadApprovedDefenses = async () => {
    try {
      console.log('[Jury Management] Fetching approved defenses...')
      const response = await fetch('/api/admin/jury/approved-proposals')
      
      console.log('[Jury Management] Response status:', response.status, response.statusText)
      
      // Check if response is OK
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Jury Management] Error response:', errorText)
        throw new Error(`Failed to load approved defenses: ${response.status} ${response.statusText}`)
      }
      
      // Check content type
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('[Jury Management] Non-JSON response:', text.substring(0, 200))
        throw new Error('Server returned non-JSON response. Check console for details.')
      }
      
      const data = await response.json()
      console.log('[Jury Management] Received defenses:', Array.isArray(data) ? data.length : 'Not an array', data)
      
      if (Array.isArray(data)) {
        setApprovedDefenses(data)
      } else {
        console.error('[Jury Management] Response is not an array:', data)
        setApprovedDefenses([])
        if (data.error) {
          throw new Error(data.error)
        }
      }
    } catch (error: any) {
      console.error('[Jury Management] Error loading approved defenses:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load approved defenses',
        variant: 'destructive'
      })
      setApprovedDefenses([])
    }
  }

  // Sort approved proposals
  const getSortedDefenses = () => {
    const sorted = [...approvedDefenses].sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.approvedAt).getTime() - new Date(b.approvedAt).getTime()
          break
        case 'title':
          comparison = a.project.title.localeCompare(b.project.title)
          break
        case 'group':
          const groupA = a.project.group?.name || 'Individual'
          const groupB = b.project.group?.name || 'Individual'
          comparison = groupA.localeCompare(groupB)
          break
        case 'supervisor':
          const supervisorA = a.project.supervisor?.name || 'Not Assigned'
          const supervisorB = b.project.supervisor?.name || 'Not Assigned'
          comparison = supervisorA.localeCompare(supervisorB)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return sorted
  }

  const handleDeleteDefense = (defense: ApprovedDefense) => {
    setScheduleToDelete(null) // Clear schedule if any
    setDefenseToDelete(defense)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteDefenseConfirm = async () => {
    if (!defenseToDelete) return

    setIsDeletingProposal(true)
    try {
      // Delete the defense assignment
      const response = await fetch(`/api/admin/jury/assignments/${defenseToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Approved defense deleted successfully',
        })
        await loadApprovedDefenses()
        setIsDeleteDialogOpen(false)
        setDefenseToDelete(null)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete approved defense')
      }
    } catch (error: any) {
      console.error('Error deleting approved defense:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete approved defense',
        variant: 'destructive'
      })
    } finally {
      setIsDeletingProposal(false)
    }
  }

  const loadTeachers = async () => {
    try {
      const response = await fetch('/api/admin/users?role=TEACHER')
      const data = await response.json()
      // Only show teachers, exclude committee heads
      setTeachers(data.filter((u: any) => u.role === 'TEACHER'))
    } catch (error) {
      console.error('Failed to load teachers:', error)
    }
  }

  const loadApprovedGroups = async () => {
    try {
      setLoadingGroups(true)
      // Load all active groups, not just approved ones
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const userId = user.id || ''
      
      if (!userId) {
        throw new Error('User ID not found. Please login again.')
      }
      
      const response = await fetch('/api/admin/groups?status=all', {
        headers: {
          'x-user-id': userId
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch groups: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Loaded groups:', data) // Debug log
      
      // Ensure data is an array before setting state
      const groups = Array.isArray(data) ? data : []
      setAvailableGroups(groups)
      
      if (groups.length === 0) {
        console.warn('No groups found. Make sure groups exist and are active.')
      }
    } catch (error: any) {
      console.error('Failed to load groups:', error)
      toast({
        title: 'Warning',
        description: error.message || 'Failed to load groups. Please refresh the page.',
        variant: 'destructive'
      })
      setAvailableGroups([]) // Set to empty array on error
    } finally {
      setLoadingGroups(false)
    }
  }

  const handleCreateSchedule = async () => {
    if (!scheduleForm.selectedGroups.length || !scheduleForm.selectedTeachers.length) {
      toast({
        title: 'Error',
        description: 'Please select at least one group and one teacher',
        variant: 'destructive'
      })
      return
    }

    try {
      // Get current user ID
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const userId = user.id || ''

      const response = await fetch('/api/admin/jury/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scheduleForm,
          createdBy: userId
        })
      })

      if (response.ok) {
        const scheduleData = await response.json()
        
        // Create jury assignments for each selected group
        if (scheduleData.id && scheduleForm.selectedGroups.length > 0) {
          const assignmentPromises = scheduleForm.selectedGroups.map(async (groupId) => {
            const group = availableGroups.find(g => g.id === groupId)
            if (!group) {
              console.error(`Group ${groupId} not found in available groups`)
              // Try to fetch group details from API as fallback
              try {
                const groupResponse = await fetch(`/api/admin/groups?status=all`, {
                  headers: {
                    'x-user-id': userId
                  }
                })
                if (groupResponse.ok) {
                  const allGroups = await groupResponse.json()
                  const foundGroup = allGroups.find((g: any) => g.id === groupId)
                  if (foundGroup) {
                    return fetch(`/api/admin/jury/schedules/${scheduleData.id}/assignments`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        groupId: foundGroup.id,
                        groupName: foundGroup.name || 'Unnamed Group',
                        projectTitle: foundGroup.projects?.[0]?.title || '',
                        juryMembers: scheduleForm.selectedTeachers,
                        chairpersonId: scheduleForm.selectedTeachers[0] || ''
                      })
                    })
                  }
                }
              } catch (err) {
                console.error(`Failed to fetch group ${groupId}:`, err)
              }
              return null
            }
            
            return fetch(`/api/admin/jury/schedules/${scheduleData.id}/assignments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                groupId: group.id,
                groupName: group.name || 'Unnamed Group',
                projectTitle: group.projects?.[0]?.title || '',
                juryMembers: scheduleForm.selectedTeachers,
                chairpersonId: scheduleForm.selectedTeachers[0] || ''
              })
            })
          })
          
          const results = await Promise.all(assignmentPromises)
          const failed = results.filter(r => r && !r.ok)
          if (failed.length > 0) {
            console.warn(`Failed to create ${failed.length} jury assignments`)
          }
        }

        toast({
          title: 'Success',
          description: 'Defense schedule created and announcement published'
        })
        setIsCreateScheduleOpen(false)
        loadSchedules()
        resetScheduleForm()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create schedule')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create defense schedule',
        variant: 'destructive'
      })
    }
  }

  const handleAssignJury = async () => {
    if (!selectedSchedule || juryForm.juryMembers.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one jury member',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/jury/schedules/${selectedSchedule.id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(juryForm)
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Jury assigned successfully'
        })
        setIsAssignJuryOpen(false)
        loadSchedules()
        resetJuryForm()
      } else {
        throw new Error('Failed to assign jury')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign jury',
        variant: 'destructive'
      })
    }
  }

  const openAssignJury = (schedule: DefenseSchedule, proposal: ApprovedProposal) => {
    setSelectedSchedule(schedule)
    setSelectedProposal(proposal)
    setJuryForm({
      groupId: proposal.project.group?.id || '',
      groupName: proposal.project.group?.name || '',
      projectTitle: proposal.project.title || '',
      juryMembers: [],
      chairpersonId: ''
    })
    setIsAssignJuryOpen(true)
  }

  const resetScheduleForm = () => {
    setScheduleForm({
      defenseType: 'PROPOSAL',
      title: '',
      description: '',
      defenseDate: '',
      defenseTime: '',
      venue: '',
      isPublished: false,
      selectedTeachers: [],
      selectedGroups: []
    })
    setTeacherSearchQuery('')
    setGroupSearchQuery('')
  }

  const resetJuryForm = () => {
    setJuryForm({
      groupId: '',
      groupName: '',
      projectTitle: '',
      juryMembers: [],
      chairpersonId: ''
    })
  }

  const handleViewSchedule = async (schedule: DefenseSchedule) => {
    try {
      // Fetch full schedule details with assignments
      const response = await fetch(`/api/admin/jury/schedules/${schedule.id}`)
      if (response.ok) {
        const data = await response.json()
        setScheduleDetails(data)
        setSelectedSchedule(schedule)
        setIsViewScheduleOpen(true)
      } else {
        // Fallback to using schedule data we already have
        setScheduleDetails(schedule)
        setSelectedSchedule(schedule)
        setIsViewScheduleOpen(true)
      }
    } catch (error) {
      console.error('Error fetching schedule details:', error)
      // Fallback to using schedule data we already have
      setScheduleDetails(schedule)
      setSelectedSchedule(schedule)
      setIsViewScheduleOpen(true)
    }
  }

  const handleDeleteClick = (schedule: DefenseSchedule) => {
    setProposalToDelete(null) // Clear proposal if any
    setScheduleToDelete(schedule)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!scheduleToDelete) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/jury/schedules/${scheduleToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Defense schedule deleted successfully'
        })
        loadSchedules()
        setIsDeleteDialogOpen(false)
        setScheduleToDelete(null)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete schedule')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete defense schedule',
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEvaluateAssignment = async (assignmentId: string, status: string, scheduleId: string) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const userId = user.id || ''
      
      if (!userId) {
        toast({
          title: 'Error',
          description: 'User not authenticated',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch(`/api/admin/jury/assignments/${assignmentId}/evaluate`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          evaluationStatus: status,
          scheduleId
        })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Assignment ${status === 'ACCEPTED' ? 'accepted' : status === 'RE_EVALUATION_REQUIRED' ? 'marked for re-evaluation' : 'marked as failed'}`
        })
        loadSchedules()
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update assignment')
      }
    } catch (error: any) {
      console.error('Error evaluating assignment:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update assignment status',
        variant: 'destructive'
      })
    }
  }

  const handleOpenReschedule = (assignment: JuryAssignment, schedule: DefenseSchedule) => {
    // Parse current jury members
    let currentJuryMembers: string[] = []
    try {
      currentJuryMembers = JSON.parse(assignment.juryMembers || '[]')
    } catch (e) {
      console.error('Error parsing jury members:', e)
    }

    // Format date for input (YYYY-MM-DD)
    const defenseDate = new Date(schedule.defenseDate)
    const formattedDate = defenseDate.toISOString().split('T')[0]

    setRescheduleForm({
      defenseDate: formattedDate,
      defenseTime: schedule.defenseTime,
      venue: schedule.venue,
      juryMembers: currentJuryMembers
    })
    setAssignmentToReschedule({ assignment, schedule })
    setIsRescheduleOpen(true)
  }

  const handleReschedule = async () => {
    if (!assignmentToReschedule) return

    try {
      if (!rescheduleForm.defenseDate || !rescheduleForm.defenseTime || !rescheduleForm.venue || rescheduleForm.juryMembers.length === 0) {
        toast({
          title: 'Error',
          description: 'Please fill in all fields including at least one jury member',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch(`/api/admin/jury/schedules/${assignmentToReschedule.schedule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          defenseDate: rescheduleForm.defenseDate,
          defenseTime: rescheduleForm.defenseTime,
          venue: rescheduleForm.venue,
          assignmentId: assignmentToReschedule.assignment.id,
          juryMembers: rescheduleForm.juryMembers
        })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Defense rescheduled successfully'
        })
        setIsRescheduleOpen(false)
        setAssignmentToReschedule(null)
        setRescheduleForm({
          defenseDate: '',
          defenseTime: '',
          venue: '',
          juryMembers: []
        })
        loadSchedules()
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to reschedule defense')
      }
    } catch (error: any) {
      console.error('Error rescheduling defense:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to reschedule defense',
        variant: 'destructive'
      })
    }
  }

  const toggleRescheduleJuryMember = (teacherId: string) => {
    setRescheduleForm(prev => ({
      ...prev,
      juryMembers: prev.juryMembers.includes(teacherId)
        ? prev.juryMembers.filter(id => id !== teacherId)
        : [...prev.juryMembers, teacherId]
    }))
  }

  const handleDeleteAssignment = (assignment: JuryAssignment) => {
    setAssignmentToDelete(assignment)
    setIsDeleteAssignmentDialogOpen(true)
  }

  const handleDeleteAssignmentConfirm = async () => {
    if (!assignmentToDelete) return

    setIsDeletingAssignment(true)
    try {
      const response = await fetch(`/api/admin/jury/assignments/${assignmentToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Jury assignment deleted successfully'
        })
        setIsDeleteAssignmentDialogOpen(false)
        setAssignmentToDelete(null)
        loadSchedules()
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete assignment')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete jury assignment',
        variant: 'destructive'
      })
    } finally {
      setIsDeletingAssignment(false)
    }
  }

  const toggleJuryMember = (teacherId: string) => {
    setJuryForm(prev => ({
      ...prev,
      juryMembers: prev.juryMembers.includes(teacherId)
        ? prev.juryMembers.filter(id => id !== teacherId)
        : [...prev.juryMembers, teacherId]
    }))
  }

  const toggleTeacher = (teacherId: string) => {
    setScheduleForm(prev => ({
      ...prev,
      selectedTeachers: prev.selectedTeachers.includes(teacherId)
        ? prev.selectedTeachers.filter(id => id !== teacherId)
        : [...prev.selectedTeachers, teacherId]
    }))
  }

  const toggleGroup = (groupId: string) => {
    setScheduleForm(prev => ({
      ...prev,
      selectedGroups: prev.selectedGroups.includes(groupId)
        ? prev.selectedGroups.filter(id => id !== groupId)
        : [...prev.selectedGroups, groupId]
    }))
  }

  const getDefenseTypeBadge = (type: string) => {
    const colors = {
      PROPOSAL: 'bg-blue-100 text-blue-800',
      FYP_I: 'bg-purple-100 text-purple-800',
      FYP_II: 'bg-green-100 text-green-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const filteredTeachers = (teachers || []).filter(t => {
    const searchQuery = (teacherSearchQuery || '').trim().toLowerCase()
    if (!searchQuery) return true
    // Search by name (primary) and email
    return t.name.toLowerCase().includes(searchQuery) ||
           t.email.toLowerCase().includes(searchQuery)
  })

  const filteredGroups = (availableGroups || []).filter(g => {
    // If no search query, show all groups
    if (!groupSearchQuery || groupSearchQuery.trim() === '') {
      return true
    }
    
    const searchLower = groupSearchQuery.toLowerCase()
    
    // Search by group name
    if (g.name?.toLowerCase().includes(searchLower)) return true
    
    // Search by member names
    if (g.members?.some((m: any) => 
      m.user?.name?.toLowerCase().includes(searchLower) ||
      m.user?.email?.toLowerCase().includes(searchLower) ||
      m.user?.rollNumber?.toLowerCase().includes(searchLower)
    )) return true
    
    // Search by project title
    if (g.projects?.some((p: any) => 
      p.title?.toLowerCase().includes(searchLower)
    )) return true
    
    return false
  })

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBackToDashboard}
              className="hidden md:flex"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold">Jury Management</h1>
          </div>
          <p className="text-muted-foreground">Schedule defenses and assign jury panels</p>
        </div>
        <Button onClick={() => setIsCreateScheduleOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Defense Schedule
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedules">Defense Schedules</TabsTrigger>
          <TabsTrigger value="assignments">Jury Assignments</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>

        {/* Defense Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Defense Schedules</CardTitle>
              <CardDescription>Manage defense schedules for FYP-I and FYP-II</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignments</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <Badge className={getDefenseTypeBadge(schedule.defenseType)}>
                          {schedule.defenseType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{schedule.title}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(schedule.defenseDate).toLocaleDateString()}
                          </span>
                          <span className="flex items-center text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {schedule.defenseTime}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center text-sm">
                          <MapPin className="h-3 w-3 mr-1" />
                          {schedule.venue}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={schedule.isPublished ? 'default' : 'secondary'}>
                          {schedule.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {schedule.juryAssignments?.length || 0} Groups
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewSchedule(schedule)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteClick(schedule)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {schedules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No defense schedules created yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approved Tab */}
        <TabsContent value="approved" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Approved</CardTitle>
                  <CardDescription>All approved defenses (Proposal, FYP I, FYP II) through jury evaluation</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sort-by" className="text-sm">Sort by:</Label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger id="sort-by" className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="group">Group</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Defense Type</TableHead>
                    <TableHead>Project Title</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Approved Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedDefenses().map((defense) => (
                    <TableRow key={defense.id}>
                      <TableCell>
                        <Badge variant="outline" className={
                          defense.defenseType === 'PROPOSAL' ? 'bg-blue-100 text-blue-800' :
                          defense.defenseType === 'FYP_I' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }>
                          {defense.defenseType === 'PROPOSAL' ? 'Proposal' :
                           defense.defenseType === 'FYP_I' ? 'FYP I' : 'FYP II'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{defense.project.title}</TableCell>
                      <TableCell>
                        {defense.project.group?.name || 'Individual'}
                      </TableCell>
                      <TableCell>
                        {defense.project.supervisor?.name || 'Not Assigned'}
                      </TableCell>
                      <TableCell>
                        {defense.defenseType === 'PROPOSAL' ? '-' : 
                         (defense.marks !== null && defense.marks !== undefined ? `${defense.marks}/100` : '-')}
                      </TableCell>
                      <TableCell>
                        {new Date(defense.approvedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDefense(defense)
                              setIsViewProposalOpen(true)
                            }}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteDefense(defense)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {approvedDefenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No approved defenses yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jury Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Jury Assignments</CardTitle>
              <CardDescription>View and evaluate jury panel assignments across defenses</CardDescription>
            </CardHeader>
            <CardContent>
              {schedules.map(schedule => (
                schedule.juryAssignments && schedule.juryAssignments.length > 0 && (
                  <div key={schedule.id} className="mb-6">
                    <h3 className="font-semibold mb-3">
                      {schedule.title} - {schedule.defenseType.replace('_', ' ')}
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Group</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Jury Members</TableHead>
                          <TableHead>Status</TableHead>
                          {schedule.defenseType !== 'PROPOSAL' && <TableHead>Marks</TableHead>}
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedule.juryAssignments.map((assignment) => {
                          const juryMemberIds = JSON.parse(assignment.juryMembers || '[]')
                          const juryMembers = teachers.filter(t => juryMemberIds.includes(t.id))
                          return (
                            <TableRow key={assignment.id}>
                              <TableCell>{assignment.groupName}</TableCell>
                              <TableCell>{assignment.projectTitle}</TableCell>
                              <TableCell>
                                <div className="space-y-2">
                                  <Badge variant="outline" className="mb-2">
                                    {juryMemberIds.length} Members
                                  </Badge>
                                  <div className="flex flex-wrap gap-1">
                                    {juryMembers.map((teacher) => {
                                      // Parse individual evaluations
                                      let evaluation: any = null;
                                      try {
                                        const evaluations = assignment.juryEvaluations 
                                          ? JSON.parse(assignment.juryEvaluations) 
                                          : {};
                                        evaluation = evaluations[teacher.id];
                                      } catch (e) {
                                        console.error('Error parsing jury evaluations:', e);
                                      }
                                      
                                      const status = evaluation?.status || 'PENDING';
                                      const isAutoAccepted = evaluation?.autoAccepted || false;
                                      
                                      return (
                                        <div key={teacher.id} className="flex items-center gap-1">
                                          <Badge
                                            variant="outline"
                                            className={
                                              status === 'ACCEPTED' 
                                                ? 'bg-green-100 text-green-800 border-green-300' 
                                                : status === 'REJECTED' || status === 'FAILED'
                                                ? 'bg-red-100 text-red-800 border-red-300'
                                                : status === 'RE_EVALUATION_REQUIRED' || status === 'CONDITIONALLY_APPROVED'
                                                ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                                : 'bg-gray-100 text-gray-600 border-gray-300'
                                            }
                                            title={
                                              status === 'PENDING' 
                                                ? `${teacher.name}: Not evaluated yet`
                                                : `${teacher.name}: ${status}${isAutoAccepted ? ' (Auto-accepted)' : ''}`
                                            }
                                          >
                                            {teacher.name.split(' ')[0]}: {status === 'ACCEPTED' ? '✓' : 
                                                                          status === 'REJECTED' || status === 'FAILED' ? '✗' :
                                                                          status === 'RE_EVALUATION_REQUIRED' ? '⚠' : '○'}
                                          </Badge>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={
                                    assignment.evaluationStatus === 'ACCEPTED' ? 'default' :
                                    assignment.evaluationStatus === 'RE_EVALUATION_REQUIRED' ? 'secondary' :
                                    assignment.evaluationStatus === 'FAILED' ? 'destructive' :
                                    'outline'
                                  }
                                  className={
                                    assignment.evaluationStatus === 'ACCEPTED' ? 'bg-black text-white' : ''
                                  }
                                >
                                  {assignment.evaluationStatus === 'ACCEPTED' ? 
                                    (schedule.defenseType === 'PROPOSAL' ? 'Accepted → Proceed to FYP I' :
                                     schedule.defenseType === 'FYP_I' ? 'Accepted → Proceed to FYP II' :
                                     'Accepted') :
                                   assignment.evaluationStatus === 'RE_EVALUATION_REQUIRED' ? 'Re-Evaluation Required' :
                                   assignment.evaluationStatus === 'FAILED' ? 'Failed (3 attempts)' :
                                   'Pending'}
                                </Badge>
                              </TableCell>
                              {schedule.defenseType !== 'PROPOSAL' && (
                                <TableCell>
                                  {assignment.marks ? `${assignment.marks}/100` : '-'}
                                </TableCell>
                              )}
                              <TableCell>
                                <div className="flex gap-2 flex-wrap">
                                  {assignment.evaluationStatus === 'RE_EVALUATION_REQUIRED' && (
                                    <Button 
                                      variant="default" 
                                      size="sm"
                                      onClick={() => handleOpenReschedule(assignment, schedule)}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      <Calendar className="h-4 w-4 mr-1" />
                                      Reschedule
                                    </Button>
                                  )}
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleEvaluateAssignment(assignment.id, 'ACCEPTED', schedule.id)}
                                    disabled={assignment.evaluationStatus === 'ACCEPTED' || assignment.evaluationStatus === 'FAILED'}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Accept
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleEvaluateAssignment(assignment.id, 'RE_EVALUATION_REQUIRED', schedule.id)}
                                    disabled={assignment.evaluationStatus === 'ACCEPTED' || assignment.evaluationStatus === 'FAILED'}
                                  >
                                    <AlertCircle className="h-4 w-4 mr-1" />
                                    Re-Evaluate
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => handleEvaluateAssignment(assignment.id, 'FAILED', schedule.id)}
                                    disabled={assignment.evaluationStatus === 'ACCEPTED' || assignment.evaluationStatus === 'FAILED'}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Fail
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleDeleteAssignment(assignment)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                                    title="Delete Assignment"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )
              ))}
              {schedules.every(s => !s.juryAssignments || s.juryAssignments.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No jury assignments found. Create a defense schedule and assign groups to see assignments here.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Schedule Dialog */}
      <Dialog open={isCreateScheduleOpen} onOpenChange={(open) => {
        setIsCreateScheduleOpen(open)
        if (open) {
          // Reload groups when dialog opens to ensure we have latest data
          loadApprovedGroups()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Defense Schedule</DialogTitle>
            <DialogDescription>
              Schedule a new defense session for Proposal, FYP-I, or FYP-II
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="defenseType">Defense Type</Label>
              <Select 
                value={scheduleForm.defenseType} 
                onValueChange={(value) => setScheduleForm({...scheduleForm, defenseType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROPOSAL">Proposal Defense</SelectItem>
                  <SelectItem value="FYP_I">FYP-I Defense</SelectItem>
                  <SelectItem value="FYP_II">FYP-II Defense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={scheduleForm.title}
                onChange={(e) => setScheduleForm({...scheduleForm, title: e.target.value})}
                placeholder="e.g., Proposal Defense - Spring 2025"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={scheduleForm.description}
                onChange={(e) => setScheduleForm({...scheduleForm, description: e.target.value})}
                placeholder="Additional details about the defense..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="defenseDate">Date</Label>
                <Input
                  id="defenseDate"
                  type="date"
                  value={scheduleForm.defenseDate}
                  onChange={(e) => setScheduleForm({...scheduleForm, defenseDate: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="defenseTime">Time</Label>
                <Input
                  id="defenseTime"
                  type="time"
                  value={scheduleForm.defenseTime}
                  onChange={(e) => setScheduleForm({...scheduleForm, defenseTime: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={scheduleForm.venue}
                onChange={(e) => setScheduleForm({...scheduleForm, venue: e.target.value})}
                placeholder="e.g., Main Auditorium, Room 301"
              />
            </div>

            {/* Teacher Selection */}
            <div>
              <Label>Select Teachers</Label>
              <div className="mt-2 space-y-2">
                <Input
                  placeholder="Search teachers..."
                  value={teacherSearchQuery}
                  onChange={(e) => setTeacherSearchQuery(e.target.value)}
                  className="mb-2"
                />
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                  {filteredTeachers.map(teacher => (
                    <div key={teacher.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`teacher-${teacher.id}`}
                        checked={scheduleForm.selectedTeachers.includes(teacher.id)}
                        onChange={() => toggleTeacher(teacher.id)}
                        className="rounded"
                      />
                      <label 
                        htmlFor={`teacher-${teacher.id}`}
                        className="flex-1 text-sm cursor-pointer"
                      >
                        {teacher.name} ({teacher.email})
                      </label>
                    </div>
                  ))}
                  {filteredTeachers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No teachers found
                    </p>
                  )}
                </div>
                {scheduleForm.selectedTeachers.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {scheduleForm.selectedTeachers.length} teacher(s) selected
                  </p>
                )}
              </div>
            </div>

            {/* Group Selection */}
            <div>
              <Label>Select Groups</Label>
              <div className="mt-2 space-y-2">
                <Input
                  placeholder="Search groups..."
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                  className="mb-2"
                />
                {loadingGroups && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Loading groups...
                  </p>
                )}
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                  {!loadingGroups && filteredGroups.map(group => (
                    <div key={group.id} className="flex items-start space-x-2 p-2 hover:bg-muted/50 rounded">
                      <input
                        type="checkbox"
                        id={`group-${group.id}`}
                        checked={scheduleForm.selectedGroups.includes(group.id)}
                        onChange={() => toggleGroup(group.id)}
                        className="rounded mt-1"
                      />
                      <label 
                        htmlFor={`group-${group.id}`}
                        className="flex-1 text-sm cursor-pointer"
                      >
                        <div className="font-medium">{group.name || 'Unnamed Group'}</div>
                        {group.members && group.members.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Members: {group.members.map((m: any) => m.user?.name).filter(Boolean).join(', ')}
                          </div>
                        )}
                        {group.projects && group.projects.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Project: {group.projects[0].title}
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                  {!loadingGroups && filteredGroups.length === 0 && availableGroups.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No groups found. Please create groups first.
                    </p>
                  )}
                  {!loadingGroups && filteredGroups.length === 0 && availableGroups.length > 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No groups match your search. Try a different search term.
                    </p>
                  )}
                  {!loadingGroups && filteredGroups.length > 0 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      Showing {filteredGroups.length} of {availableGroups.length} groups
                    </p>
                  )}
                </div>
                {scheduleForm.selectedGroups.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {scheduleForm.selectedGroups.length} group(s) selected
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublished"
                checked={scheduleForm.isPublished}
                onChange={(e) => setScheduleForm({...scheduleForm, isPublished: e.target.checked})}
                className="h-4 w-4"
              />
              <Label htmlFor="isPublished">Publish immediately</Label>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsCreateScheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSchedule}>
              Create Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Jury Dialog */}
      <Dialog open={isAssignJuryOpen} onOpenChange={setIsAssignJuryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Assign Jury Panel</DialogTitle>
            <DialogDescription>
              Select jury members for {juryForm.groupName} - {juryForm.projectTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Jury Members (Teachers)</Label>
              <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
                {teachers.map(teacher => (
                  <div key={teacher.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={juryForm.juryMembers.includes(teacher.id)}
                      onChange={() => toggleJuryMember(teacher.id)}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{teacher.name}</p>
                      <p className="text-sm text-muted-foreground">{teacher.email} - {teacher.department}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {juryForm.juryMembers.length} members
              </p>
            </div>
            <div>
              <Label htmlFor="chairperson">Chairperson (Optional)</Label>
              <Select 
                value={juryForm.chairpersonId} 
                onValueChange={(value) => setJuryForm({...juryForm, chairpersonId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select chairperson" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.filter(t => juryForm.juryMembers.includes(t.id)).map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsAssignJuryOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignJury}>
              Assign Jury
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Schedule Details Dialog */}
      <Dialog open={isViewScheduleOpen} onOpenChange={setIsViewScheduleOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Defense Schedule Details</DialogTitle>
            <DialogDescription>
              View selected groups and teachers for this defense schedule
            </DialogDescription>
          </DialogHeader>
          {scheduleDetails && (
            <div className="space-y-6">
              {/* Schedule Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Defense Type</Label>
                  <p>
                    <Badge className={getDefenseTypeBadge(scheduleDetails.defenseType)}>
                      {scheduleDetails.defenseType.replace('_', ' ')}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Title</Label>
                  <p className="text-sm">{scheduleDetails.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Date & Time</Label>
                  <p className="text-sm">
                    {new Date(scheduleDetails.defenseDate).toLocaleDateString()} at {scheduleDetails.defenseTime}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Venue</Label>
                  <p className="text-sm">{scheduleDetails.venue}</p>
                </div>
                {scheduleDetails.description && (
                  <div className="col-span-2">
                    <Label className="text-sm font-semibold">Description</Label>
                    <p className="text-sm text-muted-foreground">{scheduleDetails.description}</p>
                  </div>
                )}
              </div>

              {/* Selected Groups */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">
                  Selected Groups ({scheduleDetails.juryAssignments?.length || 0})
                </Label>
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
                  {scheduleDetails.juryAssignments && scheduleDetails.juryAssignments.length > 0 ? (
                    scheduleDetails.juryAssignments.map((assignment: any) => (
                      <div key={assignment.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium">{assignment.groupName || 'Unnamed Group'}</div>
                        {assignment.projectTitle && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Project: {assignment.projectTitle}
                          </div>
                        )}
                        {assignment.evaluationStatus && (
                          <div className="mt-2">
                            <Badge variant={
                              assignment.evaluationStatus === 'ACCEPTED' ? 'default' :
                              assignment.evaluationStatus === 'RE_EVALUATION_REQUIRED' ? 'secondary' :
                              assignment.evaluationStatus === 'FAILED' ? 'destructive' :
                              'outline'
                            }>
                              Status: {assignment.evaluationStatus}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No groups assigned yet
                    </p>
                  )}
                </div>
              </div>

              {/* Selected Teachers */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">
                  Selected Teachers (Jury Members)
                </Label>
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
                  {scheduleDetails.juryAssignments && scheduleDetails.juryAssignments.length > 0 ? (
                    (() => {
                      // Get unique teachers from all assignments
                      const allTeacherIds = new Set<string>()
                      scheduleDetails.juryAssignments.forEach((assignment: any) => {
                        try {
                          const juryMembers = JSON.parse(assignment.juryMembers || '[]')
                          juryMembers.forEach((id: string) => allTeacherIds.add(id))
                        } catch (e) {
                          console.error('Error parsing jury members:', e)
                        }
                      })
                      
                      const teacherList = Array.from(allTeacherIds)
                        .map(id => teachers.find(t => t.id === id))
                        .filter(Boolean)
                      
                      return teacherList.length > 0 ? (
                        teacherList.map((teacher) => (
                          <div key={teacher!.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium">{teacher!.name}</div>
                            <div className="text-sm text-muted-foreground">{teacher!.email}</div>
                            {teacher!.department && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Department: {teacher!.department}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No teachers found
                        </p>
                      )
                    })()
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No teachers assigned yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end mt-6">
            <Button onClick={() => setIsViewScheduleOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Approved Defense Details Dialog */}
      <Dialog open={isViewProposalOpen} onOpenChange={setIsViewProposalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Approved Defense Details
            </DialogTitle>
            <DialogDescription>
              View approved defense information
            </DialogDescription>
          </DialogHeader>
          {selectedDefense && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <FileText className="w-4 h-4" />
                    Defense Type
                  </div>
                  <Badge variant="outline" className={
                    selectedDefense.defenseType === 'PROPOSAL' ? 'bg-blue-100 text-blue-800' :
                    selectedDefense.defenseType === 'FYP_I' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'
                  }>
                    {selectedDefense.defenseType === 'PROPOSAL' ? 'Proposal Defense' :
                     selectedDefense.defenseType === 'FYP_I' ? 'FYP I Defense' : 'FYP II Defense'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <Calendar className="w-4 h-4" />
                    Approved Date
                  </div>
                  <p className="text-sm">{new Date(selectedDefense.approvedAt).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-500">{new Date(selectedDefense.approvedAt).toLocaleTimeString()}</p>
                </div>
              </div>
              {selectedDefense.marks !== null && selectedDefense.marks !== undefined && (
                <div className="pb-4 border-b">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    Marks
                  </div>
                  <p className="text-lg font-semibold">{selectedDefense.marks}/100</p>
                </div>
              )}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FileText className="w-4 h-4" />
                  Project Information
                </div>
                <div className="bg-white border rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Project Title</label>
                      <p className="text-sm text-gray-900">{selectedDefense.project.title}</p>
                    </div>
                    {selectedDefense.project.group && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Group Name</label>
                        <p className="text-sm text-gray-900">{selectedDefense.project.group.name}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Supervisor</label>
                      {selectedDefense.project.supervisor ? (
                        <>
                          <p className="text-sm text-gray-900">{selectedDefense.project.supervisor.name}</p>
                          {selectedDefense.project.supervisor.email && (
                            <p className="text-xs text-gray-500">{selectedDefense.project.supervisor.email}</p>
                          )}
                          {selectedDefense.project.supervisor.department && (
                            <p className="text-xs text-gray-500">Department: {selectedDefense.project.supervisor.department}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Not Assigned</p>
                      )}
                    </div>
                    {selectedDefense.project.group && selectedDefense.project.group.members && selectedDefense.project.group.members.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Group Members</label>
                        <div className="space-y-1">
                          {selectedDefense.project.group.members.map((member: any, idx: number) => (
                            <p key={idx} className="text-sm text-gray-900">
                              {member.user?.name || 'Unknown'} {member.user?.rollNumber && `(${member.user.rollNumber})`}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {selectedDefense.feedback && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FileText className="w-4 h-4" />
                    Feedback
                  </div>
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <p className="text-sm text-gray-900">{selectedDefense.feedback}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Professional Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-2xl font-bold text-gray-900">
                {defenseToDelete ? 'Delete Approved Defense' : 'Delete Defense Schedule'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base text-gray-600 pt-2">
              {defenseToDelete 
                ? 'Are you sure you want to delete this approved defense record? This action cannot be undone and will permanently remove the defense record from the system.'
                : 'Are you sure you want to delete this defense schedule? This action cannot be undone and will also delete all associated jury assignments.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {scheduleToDelete && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 my-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{scheduleToDelete.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {scheduleToDelete.defenseType === 'PROPOSAL' ? 'Proposal Defense' : 
                     scheduleToDelete.defenseType === 'FYP_I' ? 'FYP-I Defense' : 'FYP-II Defense'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(scheduleToDelete.defenseDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{scheduleToDelete.defenseTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{scheduleToDelete.venue}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {defenseToDelete && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 my-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{defenseToDelete.project.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Defense Type: {defenseToDelete.defenseType === 'PROPOSAL' ? 'Proposal' : defenseToDelete.defenseType === 'FYP_I' ? 'FYP I' : 'FYP II'} | Group: {defenseToDelete.project.group?.name || 'Individual'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {defenseToDelete.project.supervisor && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>Supervisor: {defenseToDelete.project.supervisor.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Approved: {new Date(defenseToDelete.approvedAt).toLocaleDateString()}</span>
                    </div>
                    {defenseToDelete.marks !== null && defenseToDelete.marks !== undefined && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        <span>Marks: {defenseToDelete.marks}/100</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter className="flex gap-3 sm:gap-3">
            <AlertDialogCancel 
              className="border-2 hover:bg-gray-50 font-medium"
              disabled={isDeleting || isDeletingProposal}
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setScheduleToDelete(null)
                setDefenseToDelete(null)
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={defenseToDelete ? handleDeleteDefenseConfirm : handleDeleteConfirm}
              disabled={isDeleting || isDeletingProposal}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {(isDeleting || isDeletingProposal) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {defenseToDelete ? 'Deleting Defense...' : 'Deleting Schedule...'}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {defenseToDelete ? 'Delete Defense' : 'Delete Schedule'}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Reschedule Defense
            </DialogTitle>
            <DialogDescription>
              Update the defense time, venue, and jury members for re-evaluation
            </DialogDescription>
          </DialogHeader>

          {assignmentToReschedule && (
            <div className="space-y-6">
              {/* Current Assignment Info */}
              <div className="bg-gray-50 border rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-2">Current Assignment</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Group:</span> {assignmentToReschedule.assignment.groupName || 'N/A'}
                  </div>
                  <div>
                    <span className="text-gray-500">Project:</span> {assignmentToReschedule.assignment.projectTitle || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Reschedule Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reschedule-date">Defense Date *</Label>
                    <Input
                      id="reschedule-date"
                      type="date"
                      value={rescheduleForm.defenseDate}
                      onChange={(e) => setRescheduleForm(prev => ({ ...prev, defenseDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reschedule-time">Defense Time *</Label>
                    <Input
                      id="reschedule-time"
                      type="time"
                      value={rescheduleForm.defenseTime}
                      onChange={(e) => setRescheduleForm(prev => ({ ...prev, defenseTime: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reschedule-venue">Venue *</Label>
                  <Input
                    id="reschedule-venue"
                    value={rescheduleForm.venue}
                    onChange={(e) => setRescheduleForm(prev => ({ ...prev, venue: e.target.value }))}
                    placeholder="e.g., Room 101, Building A"
                    required
                  />
                </div>

                {/* Jury Members Selection */}
                <div className="space-y-2">
                  <Label>Select Jury Members *</Label>
                  <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                    {teachers.length === 0 ? (
                      <p className="text-sm text-gray-500">Loading teachers...</p>
                    ) : (
                      <div className="space-y-2">
                        {teachers.map((teacher) => (
                          <div
                            key={teacher.id}
                            className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            onClick={() => toggleRescheduleJuryMember(teacher.id)}
                          >
                            <input
                              type="checkbox"
                              checked={rescheduleForm.juryMembers.includes(teacher.id)}
                              onChange={() => toggleRescheduleJuryMember(teacher.id)}
                              className="rounded"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{teacher.name}</p>
                              <p className="text-xs text-gray-500">{teacher.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {rescheduleForm.juryMembers.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {rescheduleForm.juryMembers.length} jury member(s) selected
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRescheduleOpen(false)
                    setAssignmentToReschedule(null)
                    setRescheduleForm({
                      defenseDate: '',
                      defenseTime: '',
                      venue: '',
                      juryMembers: []
                    })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReschedule}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Reschedule Defense
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Assignment Confirmation Dialog */}
      <AlertDialog open={isDeleteAssignmentDialogOpen} onOpenChange={setIsDeleteAssignmentDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-2xl font-bold text-gray-900">
                Delete Jury Assignment
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete this jury assignment? This action cannot be undone and will remove the assignment from the defense schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {assignmentToDelete && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 my-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{assignmentToDelete.groupName || 'N/A'}</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Project: {assignmentToDelete.projectTitle || 'N/A'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={
                        assignmentToDelete.evaluationStatus === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                        assignmentToDelete.evaluationStatus === 'REJECTED' || assignmentToDelete.evaluationStatus === 'FAILED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {assignmentToDelete.evaluationStatus}
                      </Badge>
                    </div>
                    {assignmentToDelete.marks !== null && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        <span>Marks: {assignmentToDelete.marks}/100</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter className="flex gap-3 sm:gap-3">
            <AlertDialogCancel 
              className="border-2 hover:bg-gray-50 font-medium"
              disabled={isDeletingAssignment}
              onClick={() => {
                setIsDeleteAssignmentDialogOpen(false)
                setAssignmentToDelete(null)
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAssignmentConfirm}
              disabled={isDeletingAssignment}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {isDeletingAssignment ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting Assignment...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Assignment
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

