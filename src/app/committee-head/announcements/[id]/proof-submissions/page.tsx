'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft,
  FileCheck,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  AlertTriangle
} from 'lucide-react'

interface ProofSubmission {
  id: string
  studentId: string
  groupId?: string
  proofFileUrl: string
  proofFileName: string
  transcriptUrl?: string
  cgpa?: number
  remarks?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedBy?: string
  reviewedAt?: string
  reviewComments?: string
  createdAt: string
  student?: {
    name: string
    email: string
    department?: string
  }
  group?: {
    name: string
    members: any[]
  }
}

export default function ProofSubmissionsPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [announcement, setAnnouncement] = useState<any>(null)
  const [submissions, setSubmissions] = useState<ProofSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<ProofSubmission | null>(null)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewComments, setReviewComments] = useState('')
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED')

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load announcement
      const announcementRes = await fetch(`/api/committee/announcements/${params.id}`)
      if (announcementRes.ok) {
        const announcementData = await announcementRes.json()
        setAnnouncement(announcementData)
      }

      // Load submissions
      const submissionsRes = await fetch(`/api/committee/proof-submissions?announcementId=${params.id}`)
      if (submissionsRes.ok) {
        const submissionsData = await submissionsRes.json()
        setSubmissions(submissionsData)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load submissions',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async () => {
    if (!selectedSubmission) return

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const response = await fetch(`/api/committee/proof-submissions/${selectedSubmission.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          status: reviewAction,
          reviewComments
        })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Submission ${reviewAction.toLowerCase()} successfully`
        })
        setIsReviewDialogOpen(false)
        setSelectedSubmission(null)
        setReviewComments('')
        loadData()
      } else {
        throw new Error('Failed to review submission')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to review submission',
        variant: 'destructive'
      })
    }
  }

  const openReviewDialog = (submission: ProofSubmission, action: 'APPROVED' | 'REJECTED') => {
    setSelectedSubmission(submission)
    setReviewAction(action)
    setReviewComments('')
    setIsReviewDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-500">Approved</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-500">Rejected</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-500">Pending Review</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const pendingCount = submissions.filter(s => s.status === 'PENDING').length
  const approvedCount = submissions.filter(s => s.status === 'APPROVED').length
  const rejectedCount = submissions.filter(s => s.status === 'REJECTED').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/committee-head/announcements')}
              className="text-white hover:bg-green-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Proof Submission Reviews</h1>
              <p className="text-green-100">
                {announcement?.title || 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{submissions.length}</div>
                <div className="text-sm text-gray-500">Total Submissions</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
                <div className="text-sm text-gray-500">Pending Review</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{approvedCount}</div>
                <div className="text-sm text-gray-500">Approved</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{rejectedCount}</div>
                <div className="text-sm text-gray-500">Rejected</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Student Proof Submissions</CardTitle>
            <CardDescription>
              Review and approve or reject student prerequisite proofs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading submissions...</div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12">
                <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
                <p className="text-gray-500">Students haven't submitted any proofs yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>CGPA</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{submission.student?.name}</div>
                            <div className="text-sm text-gray-500">{submission.student?.email}</div>
                            {submission.student?.department && (
                              <div className="text-xs text-gray-400">{submission.student.department}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {submission.group ? (
                            <div>
                              <div className="font-medium">{submission.group.name}</div>
                              <div className="text-xs text-gray-500">
                                {submission.group.members?.length || 0} members
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">No group</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {submission.cgpa ? (
                            <span className="font-medium">{submission.cgpa.toFixed(2)}</span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(submission.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(submission.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(submission.proofFileUrl, '_blank')}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {submission.status === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600"
                                  onClick={() => openReviewDialog(submission, 'APPROVED')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => openReviewDialog(submission, 'REJECTED')}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
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
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'APPROVED' ? 'Approve Submission' : 'Reject Submission'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'APPROVED'
                ? 'Confirm that the student has met all prerequisites and requirements.'
                : 'Provide a reason for rejecting this submission. The student will be notified.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedSubmission && (
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Student:</span>
                  <span className="text-sm">{selectedSubmission.student?.name}</span>
                </div>
                {selectedSubmission.cgpa && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">CGPA:</span>
                    <span className="text-sm">{selectedSubmission.cgpa.toFixed(2)}</span>
                  </div>
                )}
                {selectedSubmission.remarks && (
                  <div>
                    <span className="text-sm font-medium">Student Remarks:</span>
                    <p className="text-sm text-gray-600 mt-1">{selectedSubmission.remarks}</p>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="comments">Review Comments {reviewAction === 'REJECTED' && '*'}</Label>
              <Textarea
                id="comments"
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder={
                  reviewAction === 'APPROVED'
                    ? 'Add any additional comments (optional)'
                    : 'Provide reason for rejection (required)'
                }
                rows={4}
                required={reviewAction === 'REJECTED'}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setIsReviewDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              className={`flex-1 ${reviewAction === 'APPROVED' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
              disabled={reviewAction === 'REJECTED' && !reviewComments.trim()}
            >
              {reviewAction === 'APPROVED' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
