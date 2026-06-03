'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft,
  Plus,
  Bell,
  Calendar,
  Clock,
  FileCheck,
  GraduationCap,
  Search,
  Eye,
  Edit,
  Trash2,
  AlertCircle
} from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'PROOF_SUBMISSION' | 'OTHER'
  priority: string
  deadlineDate?: string
  expiresAt?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    proofSubmissions?: number
    evaluations?: number
  }
}

export default function AnnouncementsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/committee/announcements')
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

  const handleDeleteClick = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!announcementToDelete) return
    
    try {
      setDeleting(true)
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

      const response = await fetch(`/api/committee/announcements/${announcementToDelete.id}`, {
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
      setDeleting(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PROOF_SUBMISSION':
        return <FileCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
      case 'OTHER':
        return <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
      default:
        return <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PROOF_SUBMISSION':
        return <Badge className="bg-blue-500">Proof Submission</Badge>
      case 'OTHER':
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
    // Navigate to specific page based on type
    switch (announcement.type) {
      case 'PROOF_SUBMISSION':
        router.push(`/committee-head/announcements/${announcement.id}/proof-submissions`)
        break
      case 'OTHER':
        router.push(`/committee-head/announcements/${announcement.id}`)
        break
      default:
        router.push(`/committee-head/announcements/${announcement.id}`)
    }
  }

  const filteredAnnouncements = announcements.filter(ann => {
    const matchesSearch = ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ann.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'ALL' || ann.type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white">
        <div className="container mx-auto px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 md:py-4 lg:py-6">
          <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/committee-head')}
                className="text-white hover:bg-green-700 h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9"
              >
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              </Button>
              <div>
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold leading-tight">FYP Announcements</h1>
                <p className="text-green-100 text-[10px] sm:text-xs md:text-sm leading-tight">Manage committee announcements</p>
              </div>
            </div>
            <Button
              onClick={() => router.push('/committee-head/announcements/create')}
              className="bg-white text-green-600 hover:bg-green-50 text-[11px] sm:text-xs md:text-sm px-2.5 py-1.5 sm:px-3 sm:py-2 h-7 sm:h-8 md:h-9"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">New Announcement</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-5 lg:py-6">
        {/* Filters */}
        <Card className="mb-3 sm:mb-4 md:mb-6">
          <CardContent className="pt-3 sm:pt-4 md:pt-6 pb-3 sm:pb-4">
            <div className="flex flex-col md:flex-row gap-2 sm:gap-3 md:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 sm:left-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                  <Input
                    placeholder="Search announcements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 sm:pl-10 h-8 sm:h-9 md:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                <Button
                  variant={typeFilter === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setTypeFilter('ALL')}
                  className="text-[11px] sm:text-xs md:text-sm px-2 py-1.5 h-7 sm:h-8 md:h-9"
                >
                  All
                </Button>
                <Button
                  variant={typeFilter === 'PROOF_SUBMISSION' ? 'default' : 'outline'}
                  onClick={() => setTypeFilter('PROOF_SUBMISSION')}
                  className="text-[11px] sm:text-xs md:text-sm px-2 py-1.5 h-7 sm:h-8 md:h-9"
                >
                  <span className="hidden sm:inline">Proof Submission</span>
                  <span className="sm:hidden">Proof</span>
                </Button>
                <Button
                  variant={typeFilter === 'OTHER' ? 'default' : 'outline'}
                  onClick={() => setTypeFilter('OTHER')}
                  className="text-[11px] sm:text-xs md:text-sm px-2 py-1.5 h-7 sm:h-8 md:h-9"
                >
                  General
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Announcements Grid */}
        {loading ? (
          <div className="text-center py-6 sm:py-8 md:py-12">
            <div className="text-gray-500 text-xs sm:text-sm md:text-base">Loading announcements...</div>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card>
            <CardContent className="py-6 sm:py-8 md:py-12 text-center">
              <Bell className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-2 sm:mb-3 md:mb-4" />
              <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-1 sm:mb-2">No announcements found</h3>
              <p className="text-gray-500 mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm md:text-base">Create your first announcement to get started</p>
              <Button onClick={() => router.push('/committee-head/announcements/create')} className="text-[11px] sm:text-xs md:text-sm px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 h-7 sm:h-8 md:h-9">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Create Announcement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {filteredAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="p-3 sm:p-4 md:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                      <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg text-green-600 flex-shrink-0">
                        {getTypeIcon(announcement.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-base md:text-lg mb-1 sm:mb-2 line-clamp-2 leading-tight">{announcement.title}</CardTitle>
                        <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2 mb-1 sm:mb-2">
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
                <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                  <p className="text-gray-600 text-xs sm:text-sm mb-2.5 sm:mb-3 md:mb-4 line-clamp-2 leading-relaxed">
                    {announcement.content}
                  </p>
                  
                  <div className="space-y-1 sm:space-y-1.5 md:space-y-2 text-[11px] sm:text-xs md:text-sm text-gray-500 mb-2.5 sm:mb-3 md:mb-4">
                    {announcement.deadlineDate && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                        <span className="truncate">Deadline: {new Date(announcement.deadlineDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                      <span className="truncate">Created: {new Date(announcement.createdAt).toLocaleDateString()}</span>
                    </div>
                    {announcement._count && announcement.type === 'PROOF_SUBMISSION' && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                        <span className="truncate">
                          {`${announcement._count.proofSubmissions || 0} submissions`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1.5 sm:gap-2">
                    <Button
                      onClick={() => handleViewDetails(announcement)}
                      className="flex-1 text-[11px] sm:text-xs md:text-sm px-2 sm:px-3 py-1.5 sm:py-2 h-7 sm:h-8 md:h-9"
                      variant="default"
                    >
                      <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">View Details</span>
                      <span className="sm:hidden">View</span>
                    </Button>
                    <Button
                      onClick={() => router.push(`/committee-head/announcements/${announcement.id}/edit`)}
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9"
                    >
                      <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteClick(announcement)}
                      variant="outline"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9"
                    >
                      <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
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
        <AlertDialogContent className="max-w-md mx-2 sm:mx-4">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-1 sm:mb-2">
              <div className="p-2 sm:p-2.5 md:p-3 bg-red-100 rounded-full flex-shrink-0">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
                Delete Announcement
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs sm:text-sm md:text-base text-gray-600 pt-1 sm:pt-2">
              Are you sure you want to delete this announcement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {announcementToDelete && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3 md:p-4 my-2 sm:my-3 md:my-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg text-green-600 flex-shrink-0">
                  {getTypeIcon(announcementToDelete.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 mb-1 text-xs sm:text-sm md:text-base truncate">{announcementToDelete.title}</h4>
                  <p className="text-[11px] sm:text-xs md:text-sm text-gray-600 line-clamp-2">
                    {announcementToDelete.content}
                  </p>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <AlertDialogCancel 
              className="border-2 hover:bg-gray-50 font-medium text-[11px] sm:text-xs md:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-7 sm:h-8 md:h-9 w-full sm:w-auto"
              disabled={deleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 text-[11px] sm:text-xs md:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-7 sm:h-8 md:h-9 w-full sm:w-auto"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 border-b-2 border-white mr-1 sm:mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-2" />
                  Delete Announcement
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
