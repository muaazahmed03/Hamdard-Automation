'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft,
  Bell,
  Calendar,
  Clock,
  FileCheck,
  Edit,
  Trash2,
  AlertCircle
} from 'lucide-react'
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
  type: 'PROOF_SUBMISSION' | 'DEFENSE' | 'GENERAL'
  priority: string
  deadlineDate?: string
  expiresAt?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdByName?: string
  _count?: {
    proofSubmissions?: number
    evaluations?: number
  }
}

export default function AnnouncementDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadAnnouncement()
  }, [params.id])

  const loadAnnouncement = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/announcements/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setAnnouncement(data)
      } else {
        throw new Error('Failed to load announcement')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load announcement',
        variant: 'destructive'
      })
      router.push('/super-admin/announcements')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
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

      const response = await fetch(`/api/announcements/${params.id}`, {
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
        router.push('/super-admin/announcements')
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
        return <FileCheck className="h-6 w-6" />
      case 'DEFENSE':
        return <Calendar className="h-6 w-6" />
      case 'GENERAL':
        return <Bell className="h-6 w-6" />
      default:
        return <Bell className="h-6 w-6" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PROOF_SUBMISSION':
        return <Badge className="bg-blue-500">Proof Submission</Badge>
      case 'DEFENSE':
        return <Badge className="bg-purple-500">Defense</Badge>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground">Loading announcement...</div>
        </div>
      </div>
    )
  }

  if (!announcement) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <div className="text-muted-foreground">Announcement not found</div>
          <Button onClick={() => router.push('/super-admin/announcements')} className="mt-4">
            Back to Announcements
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      {/* Header */}
      <div className="bg-green-600 text-white p-6 shadow-lg">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/super-admin/announcements')}
                className="text-white hover:bg-green-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Announcement Details</h1>
                <p className="text-green-100 text-sm">View announcement information</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => router.push(`/super-admin/announcements/${params.id}/edit`)}
                variant="secondary"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                onClick={handleDeleteClick}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-lg text-green-600">
                {getTypeIcon(announcement.type)}
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl mb-3">{announcement.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {getTypeBadge(announcement.type)}
                  {getPriorityBadge(announcement.priority)}
                  {!announcement.isActive && (
                    <Badge variant="outline" className="text-gray-500">
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Content */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{announcement.content}</p>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Created:</span>
                  <span className="text-muted-foreground">
                    {new Date(announcement.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Updated:</span>
                  <span className="text-muted-foreground">
                    {new Date(announcement.updatedAt).toLocaleString()}
                  </span>
                </div>
                {announcement.createdByName && (
                  <div className="flex items-center gap-2 text-sm">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Created By:</span>
                    <span className="text-muted-foreground">{announcement.createdByName}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {announcement.deadlineDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Deadline:</span>
                    <span className="text-muted-foreground">
                      {new Date(announcement.deadlineDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {announcement.expiresAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Expires:</span>
                    <span className="text-muted-foreground">
                      {new Date(announcement.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {announcement._count && (
                  <>
                    {announcement._count.proofSubmissions !== undefined && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Submissions:</span>
                        <span className="text-muted-foreground">
                          {announcement._count.proofSubmissions}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Additional Actions */}
            {announcement.type === 'PROOF_SUBMISSION' && (
              <div className="pt-4 border-t">
                <Button
                  onClick={() => router.push(`/super-admin/announcements/${params.id}/proof-submissions`)}
                  className="w-full"
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  View Proof Submissions
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
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
