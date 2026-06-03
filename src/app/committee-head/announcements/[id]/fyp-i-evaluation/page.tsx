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
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Users
} from 'lucide-react'

export default function FYPIEvaluationPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [announcement, setAnnouncement] = useState<any>(null)
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEvaluationDialogOpen, setIsEvaluationDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [evaluationForm, setEvaluationForm] = useState({
    defenseDate: '',
    defenseLocation: '',
    score: '',
    feedback: '',
    isPassed: true,
    needsReEvaluation: false,
    juryMembers: ''
  })

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const announcementRes = await fetch(`/api/committee/announcements/${params.id}`)
      if (announcementRes.ok) {
        setAnnouncement(await announcementRes.json())
      }

      const evaluationsRes = await fetch(`/api/committee/evaluations?announcementId=${params.id}&type=FYP_I`)
      if (evaluationsRes.ok) {
        setEvaluations(await evaluationsRes.json())
      }

      const groupsRes = await fetch('/api/groups')
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

  const handleScheduleDefense = (group: any) => {
    setSelectedGroup(group)
    setEvaluationForm({
      defenseDate: '',
      defenseLocation: '',
      score: '',
      feedback: '',
      isPassed: true,
      needsReEvaluation: false,
      juryMembers: ''
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
          evaluationType: 'FYP_I',
          ...evaluationForm,
          score: parseFloat(evaluationForm.score) || null,
          defenseDate: evaluationForm.defenseDate ? new Date(evaluationForm.defenseDate).toISOString() : null
        })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Evaluation recorded successfully'
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

  const getStatusBadge = (evaluation: any) => {
    if (!evaluation) return <Badge variant="outline">Not Scheduled</Badge>
    
    switch (evaluation.status) {
      case 'COMPLETED':
        return evaluation.isPassed ? 
          <Badge className="bg-green-500">Passed</Badge> :
          <Badge className="bg-red-500">Failed</Badge>
      case 'RE_EVALUATION_REQUIRED':
        return <Badge className="bg-yellow-500">Re-Evaluation</Badge>
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
              <h1 className="text-2xl font-bold">FYP-I Mid-Project Defense</h1>
              <p className="text-green-100">{announcement?.title || 'Loading...'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Group Evaluations</CardTitle>
            <CardDescription>
              Schedule and conduct FYP-I mid-project defenses. Groups can have up to 3 attempts (1 original + 2 re-evaluations).
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
                      <TableHead>Attempts</TableHead>
                      <TableHead>Status</TableHead>
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
                            <Badge variant={attemptCount >= 3 ? 'destructive' : 'outline'}>
                              {attemptCount}/3
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(latestEvaluation)}
                          </TableCell>
                          <TableCell>
                            {attemptCount < 3 && (
                              <Button
                                size="sm"
                                onClick={() => handleScheduleDefense(group)}
                              >
                                {latestEvaluation ? 'Re-Evaluate' : 'Schedule Defense'}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>FYP-I Defense Evaluation</DialogTitle>
            <DialogDescription>
              Record defense evaluation for {selectedGroup?.name}
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
                  placeholder="e.g., Room 301"
                  value={evaluationForm.defenseLocation}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, defenseLocation: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="juryMembers">Jury Members (comma separated)</Label>
              <Input
                id="juryMembers"
                placeholder="Dr. Ahmed, Prof. Khan, Dr. Ali"
                value={evaluationForm.juryMembers}
                onChange={(e) => setEvaluationForm({ ...evaluationForm, juryMembers: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="score">Score (out of 100)</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                value={evaluationForm.score}
                onChange={(e) => setEvaluationForm({ ...evaluationForm, score: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">Evaluation Feedback</Label>
              <Textarea
                id="feedback"
                rows={4}
                placeholder="Provide detailed feedback on progress, implementation, documentation..."
                value={evaluationForm.feedback}
                onChange={(e) => setEvaluationForm({ ...evaluationForm, feedback: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
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
                  <SelectItem value="PASS">✅ Passed - Proceed to FYP-II</SelectItem>
                  <SelectItem value="RE_EVAL">⚠️ Re-Evaluation Required</SelectItem>
                  <SelectItem value="FAIL">❌ Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setIsEvaluationDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmitEvaluation} className="flex-1">
              Save Evaluation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
