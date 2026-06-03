'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft,
  Plus,
  Bell,
  Calendar,
  Clock,
  FileCheck,
  Search,
  Eye,
  Edit,
  Trash2,
  AlertCircle
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Announcement {
  id: string
  title: string
  content: string
  type: 'PROOF_SUBMISSION' | 'DEFENSE' | 'DEFENSE_SCHEDULE' | 'GENERAL'
  priority: string
  deadlineDate?: string
  expiresAt?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy?: string
  createdByName?: string
  _count?: {
    proofSubmissions?: number
    evaluations?: number
  }
}

export default function AdminAnnouncementsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/announcements')
      if (response.ok) {
        const data = await response.json()
        setAnnouncements(data)
      } else {
        throw new Error('Failed to load announcements')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load announcements',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (id: string) => {
    setAnnouncementToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!announcementToDelete) return
    
    try {
      setIsDeleting(true)
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'User not authenticated',
          variant: 'destructive'
        })
        setDeleteDialogOpen(false)
        return
      }

      const response = await fetch(`/api/announcements/${announcementToDelete}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id
        }
      })
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Announcement deleted successfully'
        })
        setDeleteDialogOpen(false)
        setAnnouncementToDelete(null)
        loadAnnouncements()
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete announcement')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete announcement',
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PROOF_SUBMISSION':
        return <FileCheck className="h-4 w-4" />
      case 'DEFENSE':
      case 'DEFENSE_SCHEDULE':
        return <Calendar className="h-4 w-4" />
      case 'GENERAL':
        return <Bell className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PROOF_SUBMISSION':
        return <Badge className="bg-blue-500">Proof Submission</Badge>
      case 'DEFENSE':
      case 'DEFENSE_SCHEDULE':
        return <Badge className="bg-purple-500">Defense Schedule</Badge>
      case 'GENERAL':
        return <Badge className="bg-gray-500">General Announcement</Badge>
      default:
        return <Badge>Announcement</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <Badge variant="destructive">High Priority</Badge>
      case 'NORMAL':
        return <Badge variant="secondary">Normal</Badge>
      case 'LOW':
        return <Badge variant="outline">Low</Badge>
      default:
        return <Badge variant="secondary">Normal</Badge>
    }
  }

  const handleViewDetails = (announcement: Announcement) => {
    router.push(`/super-admin/announcements/${announcement.id}`)
  }

  const filteredAnnouncements = announcements.filter(ann => {
    const matchesSearch = ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ann.content.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Handle DEFENSE_SCHEDULE as DEFENSE for filtering
    const announcementType = ann.type === 'DEFENSE_SCHEDULE' ? 'DEFENSE' : ann.type
    const matchesType = typeFilter === 'ALL' || 
                       announcementType === typeFilter ||
                       (typeFilter === 'DEFENSE' && (ann.type === 'DEFENSE' || ann.type === 'DEFENSE_SCHEDULE'))
    
    return matchesSearch && matchesType
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white p-2.5 sm:p-3 md:p-4 shadow-lg">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/super-admin')}
                className="text-white hover:bg-green-700 h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9"
              >
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <div>
                <h1 className="text-base sm:text-lg md:text-xl font-bold leading-tight">FYP Announcements</h1>
                <p className="text-green-100 text-[10px] sm:text-xs leading-tight">Manage committee announcements</p>
              </div>
            </div>
            <Button
              onClick={() => router.push('/super-admin/announcements/new')}
              className="bg-white text-green-600 hover:bg-green-50 text-[11px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 h-7 sm:h-8"
            >
              <Plus className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">New Announcement</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-2 sm:p-3 md:p-4 lg:p-5">
        {/* Filters */}
        <Card className="mb-3 sm:mb-4">
          <CardContent className="pt-3 sm:pt-4 pb-3 sm:pb-4">
            <div className="flex flex-col md:flex-row gap-2 sm:gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    placeholder="Search announcements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 sm:h-9 text-xs sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                <Button
                  variant={typeFilter === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setTypeFilter('ALL')}
                  className="text-[11px] sm:text-xs px-2 py-1 h-7 sm:h-8"
                >
                  All
                </Button>
                <Button
                  variant={typeFilter === 'PROOF_SUBMISSION' ? 'default' : 'outline'}
                  onClick={() => setTypeFilter('PROOF_SUBMISSION')}
                  className="text-[11px] sm:text-xs px-2 py-1 h-7 sm:h-8"
                >
                  <span className="hidden sm:inline">Proof Submission</span>
                  <span className="sm:hidden">Proof</span>
                </Button>
                <Button
                  variant={typeFilter === 'GENERAL' ? 'default' : 'outline'}
                  onClick={() => setTypeFilter('GENERAL')}
                  className="text-[11px] sm:text-xs px-2 py-1 h-7 sm:h-8"
                >
                  General
                </Button>
                <Button
                  variant={typeFilter === 'DEFENSE' ? 'default' : 'outline'}
                  onClick={() => setTypeFilter('DEFENSE')}
                  className="text-[11px] sm:text-xs px-2 py-1 h-7 sm:h-8"
                >
                  Defense
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Announcements Grid */}
        {loading ? (
          <div className="text-center py-6 sm:py-8">
            <div className="text-gray-500 text-xs sm:text-sm">Loading announcements...</div>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card>
            <CardContent className="py-6 sm:py-8 text-center">
              <Bell className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 mx-auto mb-2 sm:mb-3" />
              <h3 className="text-sm sm:text-base font-semibold mb-1.5">No announcements found</h3>
              <p className="text-gray-500 mb-2.5 sm:mb-3 text-xs sm:text-sm">Create your first announcement to get started</p>
              <Button onClick={() => router.push('/super-admin/announcements/new')} className="text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 h-7 sm:h-8">
                <Plus className="h-3 w-3 mr-1" />
                Create Announcement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filteredAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="p-3 sm:p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2 flex-1 min-w-0">
                      <div className="p-1.5 bg-green-100 rounded-lg text-green-600 flex-shrink-0">
                        {getTypeIcon(announcement.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-base mb-1.5 line-clamp-2">{announcement.title}</CardTitle>
                        <div className="flex flex-wrap gap-1 sm:gap-1.5">
                          {getTypeBadge(announcement.type)}
                          {getPriorityBadge(announcement.priority)}
                          {!announcement.isActive && (
                            <Badge variant="outline" className="text-gray-500 text-[10px] sm:text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <p className="text-gray-600 text-xs sm:text-sm mb-2.5 sm:mb-3 line-clamp-2 leading-relaxed">
                    {announcement.content}
                  </p>
                  
                  <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs text-gray-500 mb-2.5 sm:mb-3">
                    {announcement.deadlineDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">Deadline: {new Date(announcement.deadlineDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">Created: {new Date(announcement.createdAt).toLocaleDateString()}</span>
                    </div>
                    {announcement._count && announcement.type === 'PROOF_SUBMISSION' && (
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {`${announcement._count.proofSubmissions || 0} submissions`}
                        </span>
                      </div>
                    )}
                    {announcement.createdByName && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">By: {announcement.createdByName}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1.5 sm:gap-2">
                    <Button
                      onClick={() => handleViewDetails(announcement)}
                      className="flex-1 text-[11px] sm:text-xs px-2 py-1.5 h-7 sm:h-8"
                      variant="default"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">View Details</span>
                      <span className="sm:hidden">View</span>
                    </Button>
                    <Button
                      onClick={() => router.push(`/super-admin/announcements/${announcement.id}/edit`)}
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteClick(announcement.id)}
                      variant="outline"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 sm:h-8 sm:w-8"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Professional Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <span>Delete Announcement</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2 text-base">
              Are you sure you want to delete this announcement? This action cannot be undone and will permanently remove the announcement from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-end gap-2">
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
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
  )
}
