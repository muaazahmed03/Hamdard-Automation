'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft,
  GraduationCap,
  Download,
  Archive,
  FileCheck,
  Users,
  CheckCircle
} from 'lucide-react'

export default function FYPIIEvaluationPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [announcement, setAnnouncement] = useState<any>(null)
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isEvaluationDialogOpen, setIsEvaluationDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [evaluationForm, setEvaluationForm] = useState({
    defenseDate: '',
    defenseLocation: '',
    finalMarks: '',
    feedback: '',
    isPassed: true,
    needsReEvaluation: false,
    juryMembers: '',
    reportUrl: '',
    codeUrl: '',
    presentationUrl: ''
  })

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [announcementRes, evaluationsRes, groupsRes] = await Promise.all([
        fetch(`/api/committee/announcements/${params.id}`),
        fetch(`/api/committee/evaluations?announcementId=${params.id}&type=FYP_II`),
        fetch('/api/groups')
      ])

      if (announcementRes.ok) setAnnouncement(await announcementRes.json())
      if (evaluationsRes.ok) setEvaluations(await evaluationsRes.json())
      if (groupsRes.ok) {
        const allGroups = await groupsRes.json()
        setGroups(allGroups.filter((g: any) => g.isApproved && g.isActive))
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFinalEvaluation = (group: any) => {
    setSelectedGroup(group)
    setEvaluationForm({
      defenseDate: '',
      defenseLocation: '',
      finalMarks: '',
      feedback: '',
      isPassed: true,
      needsReEvaluation: false,
      juryMembers: '',
      reportUrl: '',
      codeUrl: '',
      presentationUrl: ''
    })
    setIsEvaluationDialogOpen(true)
  }

  const handleSubmitEvaluation = async () => {
    if (!selectedGroup) return

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const response = await fetch('/api/committee/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          announcementId: params.id,
          groupId: selectedGroup.id,
          evaluationType: 'FYP_II',
          ...evaluationForm,
          finalMarks: parseFloat(evaluationForm.finalMarks) || null,
          defenseDate: evaluationForm.defenseDate ? new Date(evaluationForm.defenseDate).toISOString() : null
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // If passed, trigger archival
        if (evaluationForm.isPassed && !evaluationForm.needsReEvaluation) {
          await handleArchiveProject(result.id)
        }

        toast({
          title: 'Success',
          description: 'Final evaluation recorded successfully'
        })
        setIsEvaluationDialogOpen(false)
        loadData()
      } else {
        throw new Error('Failed to save evaluation')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save evaluation',
        variant: 'destructive'
      })
    }
  }

  const handleArchiveProject = async (evaluationId: string) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const response = await fetch(`/api/committee/evaluations/${evaluationId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: 'Project Archived',
          description: `Archive created at: ${result.archivePath}`
        })
      }
    } catch (error) {
      console.error('Failed to archive project:', error)
    }
  }

  const getStatusBadge = (evaluation: any) => {
    if (!evaluation) return <Badge variant="outline">Not Scheduled</Badge>
    
    switch (evaluation.status) {
      case 'COMPLETED':
        return evaluation.isPassed ? 
          <Badge className="bg-green-500">Passed ✅</Badge> :
          <Badge className="bg-red-500">Failed ❌</Badge>
      case 'RE_EVALUATION_REQUIRED':
        return <Badge className="bg-yellow-500">Re-Evaluation ⚠️</Badge>
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-500">In Progress</Badge>
      case 'SCHEDULED':
        return <Badge className="bg-purple-500">Scheduled</Badge>
      default:
        return <Badge variant="outline">{evaluation.status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
              <h1 className="text-2xl font-bold">FYP-II Final Defense & Archival</h1>
              <p className="text-green-100">{announcement?.title || 'Loading...'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Archive className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Automatic Project Archival</h3>
                <p className="text-sm text-blue-700">
                  Upon successful completion, the system will automatically create a complete digital archive containing:
                  all documents, reports, code, evaluation records, chat logs, meeting history, and final results.
                  Archives are stored at: <code className="bg-blue-100 px-1 py-0.5 rounded">/FYPAS/Archive/{'<Faculty>/<Session>/<GroupID>/'}</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Final Evaluations</CardTitle>
            <CardDescription>
              Conduct final defenses and publish results. Up to 3 attempts allowed (1 original + 2 re-evaluations).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : groups.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No approved groups found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Defense Date</TableHead>
                      <TableHead>Final Marks</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Archive</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group) => {
                      const groupEvaluations = evaluations.filter(e => e.groupId === group.id)
                      const latestEvaluation = groupEvaluations[0]
                      const attemptCount = groupEvaluations.length

                      return (
                        <TableRow key={group.id}>
                          <TableCell>
                            <div className="font-medium">{group.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {group.members?.map((m: any) => m.user?.name).join(', ')}
                            </div>
                          </TableCell>
                          <TableCell>
                            {latestEvaluation?.defenseDate ? (
                              <div className="text-sm">
                                {new Date(latestEvaluation.defenseDate).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-gray-400">Not scheduled</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {latestEvaluation?.finalMarks ? (
                              <span className="font-medium">{latestEvaluation.finalMarks}/100</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={attemptCount >= 3 ? 'destructive' : 'outline'}>
                              {attemptCount}/3
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(latestEvaluation)}
                          </TableCell>
                          <TableCell>
                            {latestEvaluation?.archivePath ? (
                              <Button size="sm" variant="outline">
                                <Download className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-sm">Not archived</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {attemptCount < 3 && (
                              <Button
                                size="sm"
                                onClick={() => handleFinalEvaluation(group)}
                              >
                                {latestEvaluation ? 'Re-Evaluate' : 'Evaluate'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEvaluationDialogOpen} onOpenChange={setIsEvaluationDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>FYP-II Final Defense Evaluation</DialogTitle>
            <DialogDescription>
              Record final evaluation for {selectedGroup?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defenseDate">Defense Date & Time *</Label>
                <Input
                  id="defenseDate"
                  type="datetime-local"
                  value={evaluationForm.defenseDate}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, defenseDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defenseLocation">Location</Label>
                <Input
                  id="defenseLocation"
                  placeholder="e.g., Auditorium"
                  value={evaluationForm.defenseLocation}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, defenseLocation: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="juryMembers">Jury Members (comma separated) *</Label>
              <Input
                id="juryMembers"
                placeholder="Dr. Ahmed, Prof. Khan, Dr. Ali"
                value={evaluationForm.juryMembers}
                onChange={(e) => setEvaluationForm({ ...evaluationForm, juryMembers: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="finalMarks">Final Marks (out of 100) *</Label>
              <Input
                id="finalMarks"
                type="number"
                min="0"
                max="100"
                value={evaluationForm.finalMarks}
                onChange={(e) => setEvaluationForm({ ...evaluationForm, finalMarks: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reportUrl">Final Report URL</Label>
                <Input
                  id="reportUrl"
                  placeholder="https://..."
                  value={evaluationForm.reportUrl}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, reportUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codeUrl">Source Code URL</Label>
                <Input
                  id="codeUrl"
                  placeholder="https://github.com/..."
                  value={evaluationForm.codeUrl}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, codeUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="presentationUrl">Presentation URL</Label>
                <Input
                  id="presentationUrl"
                  placeholder="https://..."
                  value={evaluationForm.presentationUrl}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, presentationUrl: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">Final Evaluation Feedback *</Label>
              <Textarea
                id="feedback"
                rows={5}
                placeholder="Provide comprehensive feedback on project quality, innovation, implementation, documentation, and presentation..."
                value={evaluationForm.feedback}
                onChange={(e) => setEvaluationForm({ ...evaluationForm, feedback: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outcome">Final Outcome *</Label>
              <Select
                value={evaluationForm.isPassed ? (evaluationForm.needsReEvaluation ? 'RE_EVAL' : 'PASS') : 'FAIL'}
                onValueChange={(value) => {
                  setEvaluationForm({
                    ...evaluationForm,
                    isPassed: value === 'PASS' || value === 'RE_EVAL',
                    needsReEvaluation: value === 'RE_EVAL'
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PASS">✅ Passed - Project Completed & Archived</SelectItem>
                  <SelectItem value="RE_EVAL">⚠️ Re-Evaluation Required</SelectItem>
                  <SelectItem value="FAIL">❌ Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {evaluationForm.isPassed && !evaluationForm.needsReEvaluation && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                  <CheckCircle className="h-5 w-5" />
                  Project will be automatically archived
                </div>
                <p className="text-sm text-green-600">
                  Upon submission, the system will create a complete digital archive including all documents, 
                  code, evaluations, chat history, and meeting records for permanent storage.
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setIsEvaluationDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmitEvaluation} className="flex-1 bg-green-600 hover:bg-green-700">
              Submit Final Evaluation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
