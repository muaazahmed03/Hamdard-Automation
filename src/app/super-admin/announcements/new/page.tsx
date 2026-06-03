'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Bell, FileCheck, Calendar, Save } from 'lucide-react'

export default function AdminCreateAnnouncementPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'GENERAL',
    priority: 'NORMAL',
    deadlineDate: '',
    expiresAt: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.content || !formData.type) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          ...formData,
          createdBy: user.id,
          createdByName: user.name,
          deadlineDate: formData.deadlineDate ? new Date(formData.deadlineDate).toISOString() : null,
          expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null
        })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Announcement created successfully'
        })
        router.push('/super-admin/announcements')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create announcement')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create announcement',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getAnnouncementDescription = (type: string) => {
    switch (type) {
      case 'PROOF_SUBMISSION':
        return 'Students will upload proof of prerequisites completion or CGPA improvement. Committee will review and approve/reject submissions.'
      case 'GENERAL':
        return 'General announcement for system-wide communications, policy updates, notifications, or important information.'
      default:
        return ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/super-admin/announcements')}
              className="text-white hover:bg-green-700 h-8 w-8 sm:h-10 sm:w-10"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Create New Announcement</h1>
              <p className="text-green-100 text-xs sm:text-sm">Select announcement type and provide details</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-3xl">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Announcement Details</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Fill in the information below to create a new announcement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              {/* Announcement Type */}
              <div className="space-y-2">
                <Label htmlFor="type" className="text-xs sm:text-sm">Announcement Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type" className="h-9 sm:h-10 text-sm">
                    <SelectValue placeholder="Select announcement type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROOF_SUBMISSION">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="text-sm">Proof Submission</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="GENERAL">
                      <div className="flex items-center gap-2">
                        <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="text-sm">General Announcement</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formData.type && (
                  <p className="text-xs sm:text-sm text-gray-500 bg-blue-50 p-2 sm:p-3 rounded-lg border border-blue-200">
                    {getAnnouncementDescription(formData.type)}
                  </p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., FYP-I Defense Schedule - Fall 2024 or Updated FYP Policy 2024-25"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Provide detailed information about the announcement..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={8}
                  required
                />
                <p className="text-sm text-gray-500">
                  Include important details such as dates, requirements, procedures, and expectations.
                </p>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Deadline Date */}
              <div className="space-y-2">
                <Label htmlFor="deadlineDate">
                  {formData.type === 'PROOF_SUBMISSION' ? 'Submission Deadline *' : 'Event Date (Optional)'}
                </Label>
                <Input
                  id="deadlineDate"
                  type="datetime-local"
                  value={formData.deadlineDate}
                  onChange={(e) => setFormData({ ...formData, deadlineDate: e.target.value })}
                  required={formData.type === 'PROOF_SUBMISSION'}
                />
                <p className="text-sm text-gray-500">
                  {formData.type === 'PROOF_SUBMISSION' 
                    ? 'Last date for students to submit proofs'
                    : 'Optional event or deadline date'}
                </p>
              </div>

              {/* Expiry Date */}
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Announcement Expiry Date (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
                <p className="text-sm text-gray-500">
                  Announcement will be automatically hidden after this date
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/super-admin/announcements')}
                  className="flex-1 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-8 sm:h-9"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-8 sm:h-9"
                  disabled={loading}
                >
                  {loading ? (
                    <>Creating...</>
                  ) : (
                    <>
                      <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      Create Announcement
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
