'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  Calendar,
  Users,
  FileText,
  ArrowLeft,
  Edit,
  Save
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
  juryAssignments: JuryAssignment[]
}

interface JuryAssignment {
  id: string
  defenseScheduleId: string
  groupId: string
  groupName?: string
  projectTitle?: string
  juryMembers: string
  evaluationStatus: string
  marks?: number
  feedback?: string
  defenseAttempts?: number
  groupMembers?: Array<{
    id: string
    name: string
    email: string
  }>
}

export default function TeacherProjectExecutionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [defenseSchedules, setDefenseSchedules] = useState<DefenseSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAssignment, setSelectedAssignment] = useState<JuryAssignment | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<DefenseSchedule | null>(null)
  const [isEvaluationDialogOpen, setIsEvaluationDialogOpen] = useState(false)
  const [evaluationData, setEvaluationData] = useState({
    marks: '',
    feedback: '',
    status: 'PENDING'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
    setUser(storedUser)

    if (!storedUser?.id) {
      router.push('/')
      return
    }

    if (storedUser.role !== 'TEACHER') {
      router.push('/')
      return
    }

    loadScheduledDefenses(storedUser.id)
  }, [])

  const loadScheduledDefenses = async (teacherId: string) => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/jury/schedules')
      if (response.ok) {
        const schedules = await response.json()
        // Filter schedules where this teacher is a jury member
        const teacherSchedules = schedules.filter((schedule: DefenseSchedule) =>
          schedule.juryAssignments?.some((assignment: JuryAssignment) => {
            try {
              const juryMembers = JSON.parse(assignment.juryMembers || '[]')
              return juryMembers.includes(teacherId)
            } catch {
              return false
            }
          })
        )
        // Only include schedules that are published (scheduled by admin/committee head)
        const publishedSchedules = teacherSchedules.filter((schedule: DefenseSchedule) => schedule.isPublished)
        setDefenseSchedules(publishedSchedules)
      }
    } catch (error) {
      console.error('Error loading scheduled defenses:', error)
      toast({
        title: 'Error',
        description: 'Failed to load scheduled defenses',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getDefenseTypeLabel = (type: string) => {
    switch (type) {
      case 'PROPOSAL': return 'Proposal Defense'
      case 'FYP_I': return 'FYP-I (Mid-Project Defense)'
      case 'FYP_II': return 'FYP-II (Final Evaluation)'
      default: return type
    }
  }

  const getEvaluationStatusBadge = (status: string, defenseType?: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'PASSED':
        if (defenseType === 'PROPOSAL') {
          return <Badge className="bg-green-600 text-white">✅ Approved - Active Project Execution</Badge>
        }
        return <Badge className="bg-green-600 text-white">✅ Accepted</Badge>
      case 'CONDITIONALLY_APPROVED':
        return <Badge className="bg-yellow-600 text-white">⚠️ Conditionally Approved - Minor Revisions</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-600 text-white">❌ Rejected - Re-Defense Required</Badge>
      case 'RE_EVALUATION_REQUIRED':
        return <Badge className="bg-yellow-600 text-white">⚠️ Re-Evaluation Required</Badge>
      case 'FAILED':
        return <Badge className="bg-red-600 text-white">❌ Permanently Failed</Badge>
      case 'PENDING':
        return <Badge className="bg-gray-500 text-white">⏳ Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleEvaluate = (assignment: JuryAssignment, schedule: DefenseSchedule) => {
    setSelectedAssignment(assignment)
    setSelectedSchedule(schedule)
    // For proposal defense, don't show marks - only status and feedback
    setEvaluationData({
      marks: schedule.defenseType !== 'PROPOSAL' ? (assignment.marks?.toString() || '') : '',
      feedback: assignment.feedback || '',
      status: assignment.evaluationStatus || 'PENDING'
    })
    setIsEvaluationDialogOpen(true)
  }

  const handleSaveEvaluation = async () => {
    if (!selectedAssignment || !user || !selectedSchedule) return

    const isProposalDefense = selectedSchedule.defenseType === 'PROPOSAL'

    // For FYP-I and FYP-II, marks are required
    if (!isProposalDefense) {
      if (!evaluationData.marks || parseFloat(evaluationData.marks) < 0 || parseFloat(evaluationData.marks) > 100) {
        toast({
          title: 'Invalid Marks',
          description: 'Please enter marks between 0 and 100',
          variant: 'destructive'
        })
        return
      }
    }

    if (!evaluationData.feedback.trim()) {
      toast({
        title: 'Feedback Required',
        description: 'Please provide feedback for the evaluation',
        variant: 'destructive'
      })
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/admin/jury/assignments/${selectedAssignment.id}/evaluate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          marks: selectedSchedule?.defenseType !== 'PROPOSAL' ? parseFloat(evaluationData.marks) : null,
          feedback: evaluationData.feedback,
          evaluationStatus: evaluationData.status,
          scheduleId: selectedSchedule?.id || null
        })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Evaluation saved successfully'
        })
        setIsEvaluationDialogOpen(false)
        loadScheduledDefenses(user.id)
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to save evaluation',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error saving evaluation:', error)
      toast({
        title: 'Error',
        description: 'Failed to save evaluation',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold mb-2">Project Execution - Evaluation</h1>
        <p className="text-muted-foreground">
          Enter marks and remarks for scheduled defenses
        </p>
      </div>

      <Tabs defaultValue="proposal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="proposal">Proposal Defense</TabsTrigger>
          <TabsTrigger value="fyp1">FYP-I Evaluation</TabsTrigger>
          <TabsTrigger value="fyp2">FYP-II Evaluation</TabsTrigger>
        </TabsList>

        {/* Proposal Defense Tab */}
        <TabsContent value="proposal" className="space-y-6">
          {defenseSchedules
            .filter(s => s.defenseType === 'PROPOSAL')
            .map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader>
                  <CardTitle>{schedule.title}</CardTitle>
                  <CardDescription>
                    {new Date(schedule.defenseDate).toLocaleDateString()} at {schedule.defenseTime} - {schedule.venue}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.juryAssignments
                        .filter(assignment => {
                          try {
                            const juryMembers = JSON.parse(assignment.juryMembers || '[]')
                            return juryMembers.includes(user?.id)
                          } catch {
                            return false
                          }
                        })
                        .map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="font-medium">{assignment.groupName || 'N/A'}</TableCell>
                            <TableCell>{assignment.projectTitle || 'N/A'}</TableCell>
                            <TableCell>
                              {assignment.groupMembers?.length ? (
                                <div className="text-sm">
                                  {assignment.groupMembers.map(m => m.name).join(', ')}
                                </div>
                              ) : (
                                'N/A'
                              )}
                            </TableCell>
                            <TableCell>{getEvaluationStatusBadge(assignment.evaluationStatus, schedule.defenseType)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          {defenseSchedules.filter(s => s.defenseType === 'PROPOSAL').length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No Proposal Defense schedules found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* FYP-I Tab */}
        <TabsContent value="fyp1" className="space-y-6">
          {defenseSchedules
            .filter(s => s.defenseType === 'FYP_I')
            .map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader>
                  <CardTitle>{schedule.title}</CardTitle>
                  <CardDescription>
                    {new Date(schedule.defenseDate).toLocaleDateString()} at {schedule.defenseTime} - {schedule.venue}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.juryAssignments
                        .filter(assignment => {
                          try {
                            const juryMembers = JSON.parse(assignment.juryMembers || '[]')
                            return juryMembers.includes(user?.id)
                          } catch {
                            return false
                          }
                        })
                        .map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="font-medium">{assignment.groupName || 'N/A'}</TableCell>
                            <TableCell>{assignment.projectTitle || 'N/A'}</TableCell>
                            <TableCell>
                              {assignment.groupMembers?.length ? (
                                <div className="text-sm">
                                  {assignment.groupMembers.map(m => m.name).join(', ')}
                                </div>
                              ) : (
                                'N/A'
                              )}
                            </TableCell>
                            <TableCell>{getEvaluationStatusBadge(assignment.evaluationStatus)}</TableCell>
                            <TableCell>{assignment.marks ? `${assignment.marks}/100` : '-'}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => handleEvaluate(assignment, schedule)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                {assignment.marks ? 'Update' : 'Evaluate'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          {defenseSchedules.filter(s => s.defenseType === 'FYP_I').length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No FYP-I schedules found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* FYP-II Tab */}
        <TabsContent value="fyp2" className="space-y-6">
          {defenseSchedules
            .filter(s => s.defenseType === 'FYP_II')
            .map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader>
                  <CardTitle>{schedule.title}</CardTitle>
                  <CardDescription>
                    {new Date(schedule.defenseDate).toLocaleDateString()} at {schedule.defenseTime} - {schedule.venue}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.juryAssignments
                        .filter(assignment => {
                          try {
                            const juryMembers = JSON.parse(assignment.juryMembers || '[]')
                            return juryMembers.includes(user?.id)
                          } catch {
                            return false
                          }
                        })
                        .map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="font-medium">{assignment.groupName || 'N/A'}</TableCell>
                            <TableCell>{assignment.projectTitle || 'N/A'}</TableCell>
                            <TableCell>
                              {assignment.groupMembers?.length ? (
                                <div className="text-sm">
                                  {assignment.groupMembers.map(m => m.name).join(', ')}
                                </div>
                              ) : (
                                'N/A'
                              )}
                            </TableCell>
                            <TableCell>{getEvaluationStatusBadge(assignment.evaluationStatus)}</TableCell>
                            <TableCell>{assignment.marks ? `${assignment.marks}/100` : '-'}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => handleEvaluate(assignment, schedule)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                {assignment.marks ? 'Update' : 'Evaluate'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          {defenseSchedules.filter(s => s.defenseType === 'FYP_II').length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No FYP-II schedules found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Evaluation Dialog */}
      <Dialog open={isEvaluationDialogOpen} onOpenChange={setIsEvaluationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enter Evaluation</DialogTitle>
            <DialogDescription>
              {selectedAssignment && (
                <>
                  Evaluate {selectedAssignment.groupName} - {selectedAssignment.projectTitle}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Only show marks for FYP-I and FYP-II, not for PROPOSAL */}
            {selectedSchedule?.defenseType !== 'PROPOSAL' && (
              <div>
                <Label htmlFor="marks">Marks (0-100)</Label>
                <Input
                  id="marks"
                  type="number"
                  min="0"
                  max="100"
                  value={evaluationData.marks}
                  onChange={(e) => setEvaluationData({ ...evaluationData, marks: e.target.value })}
                  placeholder="Enter marks"
                />
              </div>
            )}
            <div>
              <Label htmlFor="status">Evaluation Status</Label>
              <Select
                value={evaluationData.status}
                onValueChange={(value) => setEvaluationData({ ...evaluationData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedSchedule?.defenseType === 'PROPOSAL' ? (
                    <>
                      <SelectItem value="ACCEPTED">✅ Approved - Active Project Execution</SelectItem>
                      <SelectItem value="CONDITIONALLY_APPROVED">⚠️ Conditionally Approved - Minor Revisions</SelectItem>
                      <SelectItem value="REJECTED">❌ Rejected - Re-Defense Required</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="ACCEPTED">✅ Accepted - Proceed to Next Phase</SelectItem>
                      <SelectItem value="RE_EVALUATION_REQUIRED">⚠️ Re-Evaluation Required</SelectItem>
                      <SelectItem value="FAILED">❌ Failed</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="feedback">Remarks/Feedback</Label>
              <Textarea
                id="feedback"
                value={evaluationData.feedback}
                onChange={(e) => setEvaluationData({ ...evaluationData, feedback: e.target.value })}
                placeholder="Enter detailed feedback and remarks..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEvaluationDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEvaluation} disabled={saving}>
              {saving ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Evaluation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

