'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Calendar,
  Users,
  FileText,
  Archive,
  ArrowLeft,
  Trophy,
  RefreshCw
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
}

export default function ProjectExecutionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [userGroup, setUserGroup] = useState<any>(null)
  const [defenseSchedules, setDefenseSchedules] = useState<DefenseSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      setUser(storedUser)

      if (!storedUser?.id) {
        router.push('/')
        return
      }

      // Check if user is a student in a group selected for defense
      if (storedUser.role === 'STUDENT') {
        const groupResponse = await fetch('/api/groups/my-group', {
          headers: {
            'x-user-id': storedUser.id
          }
        })
        
        if (!groupResponse.ok) {
          console.error('Failed to fetch group:', groupResponse.statusText)
          setLoading(false)
          return
        }
        if (groupResponse.ok) {
          const groupResponseData = await groupResponse.json()
          const groupData = groupResponseData.group || groupResponseData
          
          if (!groupData || !groupData.id) {
            console.log('No group found for student')
            setLoading(false)
            return
          }
          
          setUserGroup(groupData)
          
          // Check if group has any defense assignments
          const schedulesResponse = await fetch('/api/admin/jury/schedules')
          if (schedulesResponse.ok) {
            const schedules = await schedulesResponse.json()
            const hasDefense = schedules.some((schedule: DefenseSchedule) =>
              schedule.juryAssignments?.some((assignment: JuryAssignment) =>
                assignment.groupId === groupData.id
              )
            )
            setHasAccess(hasDefense)
            if (hasDefense) {
              setDefenseSchedules(schedules.filter((schedule: DefenseSchedule) =>
                schedule.juryAssignments?.some((assignment: JuryAssignment) =>
                  assignment.groupId === groupData.id
                )
              ))
            }
          }
        } else {
          console.error('Failed to fetch group:', groupResponse.statusText)
        }
      } else if (storedUser.role === 'TEACHER') {
        // Check if teacher is assigned as jury member
        const schedulesResponse = await fetch('/api/admin/jury/schedules')
        if (schedulesResponse.ok) {
          const schedules = await schedulesResponse.json()
          const teacherSchedules = schedules.filter((schedule: DefenseSchedule) =>
            schedule.juryAssignments?.some((assignment: JuryAssignment) => {
              try {
                const juryMembers = JSON.parse(assignment.juryMembers || '[]')
                return juryMembers.includes(storedUser.id)
              } catch {
                return false
              }
            })
          )
          setHasAccess(teacherSchedules.length > 0)
          setDefenseSchedules(teacherSchedules)
        }
      } else {
        setHasAccess(false)
      }
    } catch (error) {
      console.error('Error checking access:', error)
      setHasAccess(false)
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

  const getEvaluationStatusBadge = (status: string, attempts: number = 0) => {
    switch (status) {
      case 'ACCEPTED':
      case 'PASSED':
        return <Badge className="bg-green-600 text-white">✅ Approved - Proceed to Next Phase</Badge>
      case 'RE_EVALUATION_REQUIRED':
      case 'CONDITIONALLY_APPROVED':
        return <Badge className="bg-yellow-600 text-white">⚠️ Re-Evaluation Required</Badge>
      case 'FAILED':
        return <Badge className="bg-red-600 text-white">❌ Failed {attempts >= 3 ? '(3 attempts exhausted)' : `(Attempt ${attempts}/3)`}</Badge>
      case 'PENDING':
        return <Badge className="bg-gray-500 text-white">⏳ Pending Evaluation</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getAssignmentForGroup = (schedule: DefenseSchedule) => {
    if (!userGroup) return null
    return schedule.juryAssignments?.find(a => a.groupId === userGroup.id)
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

  if (!hasAccess) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              This page is only accessible to students whose groups are scheduled for defense or teachers assigned as jury members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
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
        <h1 className="text-3xl font-bold mb-2">Project Execution</h1>
        <p className="text-muted-foreground">
          Track your project defense progress and evaluation status
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="proposal">Proposal Defense</TabsTrigger>
          <TabsTrigger value="fyp1">FYP-I Evaluation</TabsTrigger>
          <TabsTrigger 
            value="fyp2"
            disabled={(() => {
              const fyp1Schedule = defenseSchedules.find(s => s.defenseType === 'FYP_I')
              const fyp1Assignment = fyp1Schedule ? getAssignmentForGroup(fyp1Schedule) : null
              const fyp1Accepted = fyp1Assignment?.evaluationStatus === 'ACCEPTED' || fyp1Assignment?.evaluationStatus === 'PASSED'
              const hasFyp2Schedule = defenseSchedules.some(s => s.defenseType === 'FYP_II')
              return !fyp1Accepted && !hasFyp2Schedule
            })()}
          >
            FYP-II Evaluation
            {(() => {
              const fyp1Schedule = defenseSchedules.find(s => s.defenseType === 'FYP_I')
              const fyp1Assignment = fyp1Schedule ? getAssignmentForGroup(fyp1Schedule) : null
              const fyp1Accepted = fyp1Assignment?.evaluationStatus === 'ACCEPTED' || fyp1Assignment?.evaluationStatus === 'PASSED'
              if (!fyp1Accepted && !defenseSchedules.some(s => s.defenseType === 'FYP_II')) {
                return ' (Locked)'
              }
              return ''
            })()}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
              <CardDescription>Your project execution status overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {defenseSchedules.map((schedule) => {
                const assignment = getAssignmentForGroup(schedule)
                return (
                  <div key={schedule.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{getDefenseTypeLabel(schedule.defenseType)}</h3>
                        <p className="text-sm text-muted-foreground">{schedule.title}</p>
                      </div>
                      {assignment && getEvaluationStatusBadge(assignment.evaluationStatus, assignment.defenseAttempts || 0)}
                    </div>
                    {assignment?.evaluationStatus === 'RE_EVALUATION_REQUIRED' && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <RefreshCw className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-blue-900 mb-1">Rescheduled for Re-Evaluation</p>
                            <div className="text-xs text-blue-800 space-y-1">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(schedule.defenseDate).toLocaleDateString()} at {schedule.defenseTime}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                <span>{schedule.venue}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {assignment?.evaluationStatus !== 'RE_EVALUATION_REQUIRED' && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-sm font-medium">Date & Time</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(schedule.defenseDate).toLocaleDateString()} at {schedule.defenseTime}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Venue</p>
                          <p className="text-sm text-muted-foreground">{schedule.venue}</p>
                        </div>
                      </div>
                    )}
                    {assignment?.marks !== null && assignment?.marks !== undefined && (
                      <div className="mt-4">
                        <p className="text-sm font-medium">Marks: <span className="text-lg font-bold text-green-600">{assignment.marks}/100</span></p>
                      </div>
                    )}
                    {assignment?.feedback && (
                      <div className="mt-4 p-3 bg-gray-50 rounded">
                        <p className="text-sm font-medium">Feedback:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assignment.feedback}</p>
                      </div>
                    )}
                    {schedule.defenseType === 'FYP_II' && assignment?.evaluationStatus === 'ACCEPTED' && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-blue-900 mb-1">Final Results</h4>
                            <p className="text-xs text-blue-700">Access your complete project archive and completion certificate</p>
                          </div>
                          <Button
                            onClick={async () => {
                              if (!userGroup || !user) return;
                              try {
                                // Open archive in new tab with user ID as query param
                                const url = `/api/projects/${userGroup.id}/archive?userId=${user.id}`;
                                window.open(url, '_blank');
                                
                                toast({
                                  title: 'Archive Opened',
                                  description: 'Your complete project archive is now open in a new tab. You can print or save it as PDF.',
                                });
                              } catch (error) {
                                console.error('Error opening archive:', error);
                                toast({
                                  title: 'Error',
                                  description: 'Failed to open archive',
                                  variant: 'destructive'
                                });
                              }
                            }}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            See Result
                          </Button>
                        </div>
                        
                        <div className="mt-3 space-y-1.5 text-xs text-blue-800">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3" />
                            <span>Complete digital archive with all documents, reports, and codes</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3" />
                            <span>Chat logs and meeting history</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3" />
                            <span>Evaluation records and committee remarks</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Proposal Defense Tab */}
        <TabsContent value="proposal" className="space-y-6">
          {/* Show actual defense schedule and evaluation if available */}
          {defenseSchedules
            .filter(s => s.defenseType === 'PROPOSAL')
            .map((schedule) => {
              const assignment = getAssignmentForGroup(schedule)
              return (
                <Card key={schedule.id}>
                  <CardHeader>
                    <CardTitle>Proposal Defense</CardTitle>
                    <CardDescription>
                      {new Date(schedule.defenseDate).toLocaleDateString()} at {schedule.defenseTime} - {schedule.venue}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {assignment ? (
                      <>
                        <div className="p-4 border rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">Evaluation Status</h3>
                            {getEvaluationStatusBadge(assignment.evaluationStatus, assignment.defenseAttempts || 0)}
                          </div>
                          {assignment.marks !== null && assignment.marks !== undefined && (
                            <div>
                              <p className="text-sm font-medium text-gray-600">Marks</p>
                              <p className="text-2xl font-bold text-green-600">{assignment.marks}/100</p>
                            </div>
                          )}
                          {assignment.feedback && (
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-2">Remarks/Feedback</p>
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.feedback}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        {assignment.evaluationStatus === 'RE_EVALUATION_REQUIRED' && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-3">
                              <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-blue-900 mb-2">Defense Rescheduled for Re-Evaluation</p>
                                <div className="space-y-2 text-sm text-blue-800">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span><strong>Date:</strong> {new Date(schedule.defenseDate).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span><strong>Time:</strong> {schedule.defenseTime}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    <span><strong>Venue:</strong> {schedule.venue}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {assignment.evaluationStatus === 'PENDING' && (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">⏳ Your proposal defense is scheduled. Evaluation is pending.</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-4 bg-gray-50 border rounded-lg">
                        <p className="text-sm text-gray-600">Proposal defense has not been scheduled yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          {defenseSchedules.filter(s => s.defenseType === 'PROPOSAL').length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Proposal Defense Not Scheduled</h3>
                <p className="text-gray-600">Proposal defense has not been scheduled for your group yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* FYP-I Tab */}
        <TabsContent value="fyp1" className="space-y-6">
          {defenseSchedules
            .filter(s => s.defenseType === 'FYP_I')
            .map((schedule) => {
              const assignment = getAssignmentForGroup(schedule)
              return (
                <Card key={schedule.id}>
                  <CardHeader>
                    <CardTitle>FYP-I Evaluation (Mid-Project Defense)</CardTitle>
                    <CardDescription>
                      {new Date(schedule.defenseDate).toLocaleDateString()} at {schedule.defenseTime} - {schedule.venue}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {assignment ? (
                      <>
                        <div className="p-4 border rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">Evaluation Status</h3>
                            {getEvaluationStatusBadge(assignment.evaluationStatus, assignment.defenseAttempts || 0)}
                          </div>
                          {assignment.marks !== null && assignment.marks !== undefined && (
                            <div>
                              <p className="text-sm font-medium text-gray-600">Marks</p>
                              <p className="text-2xl font-bold text-green-600">{assignment.marks}/100</p>
                            </div>
                          )}
                          {assignment.feedback && (
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-2">Remarks/Feedback</p>
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.feedback}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        {assignment.evaluationStatus === 'RE_EVALUATION_REQUIRED' && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-3">
                              <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-blue-900 mb-2">Defense Rescheduled for Re-Evaluation</p>
                                <div className="space-y-2 text-sm text-blue-800">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span><strong>Date:</strong> {new Date(schedule.defenseDate).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span><strong>Time:</strong> {schedule.defenseTime}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    <span><strong>Venue:</strong> {schedule.venue}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {assignment.evaluationStatus === 'PENDING' && (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">⏳ Your FYP-I defense is scheduled. Evaluation is pending.</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-4 bg-gray-50 border rounded-lg">
                        <p className="text-sm text-gray-600">FYP-I defense has not been scheduled yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          {defenseSchedules.filter(s => s.defenseType === 'FYP_I').length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">FYP-I Not Scheduled</h3>
                <p className="text-gray-600">FYP-I defense has not been scheduled for your group yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* FYP-II Tab */}
        <TabsContent value="fyp2" className="space-y-6">
          {(() => {
            // Check if FYP-I is accepted
            const fyp1Schedule = defenseSchedules.find(s => s.defenseType === 'FYP_I')
            const fyp1Assignment = fyp1Schedule ? getAssignmentForGroup(fyp1Schedule) : null
            const fyp1Accepted = fyp1Assignment?.evaluationStatus === 'ACCEPTED' || fyp1Assignment?.evaluationStatus === 'PASSED'
            
            // Only show FYP-II if FYP-I is accepted or if FYP-II is already scheduled
            const fyp2Schedules = defenseSchedules.filter(s => s.defenseType === 'FYP_II')
            const hasFyp2Schedule = fyp2Schedules.length > 0
            
            if (!fyp1Accepted && !hasFyp2Schedule) {
              return (
                <Card>
                  <CardContent className="p-12 text-center">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">FYP-II Not Available</h3>
                    <p className="text-gray-600">You must complete and pass FYP-I evaluation before FYP-II becomes available.</p>
                  </CardContent>
                </Card>
              )
            }
            
            return fyp2Schedules.map((schedule) => {
              const assignment = getAssignmentForGroup(schedule)
              return (
                <Card key={schedule.id}>
                  <CardHeader>
                    <CardTitle>FYP-II (Final Evaluation and Archival)</CardTitle>
                    <CardDescription>
                      {new Date(schedule.defenseDate).toLocaleDateString()} at {schedule.defenseTime} - {schedule.venue}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {assignment ? (
                      <>
                        <div className="p-4 border rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">Evaluation Status</h3>
                            {getEvaluationStatusBadge(assignment.evaluationStatus, assignment.defenseAttempts || 0)}
                          </div>
                          {assignment.marks !== null && assignment.marks !== undefined && (
                            <div>
                              <p className="text-sm font-medium text-gray-600">Marks</p>
                              <p className="text-2xl font-bold text-green-600">{assignment.marks}/100</p>
                            </div>
                          )}
                          {assignment.feedback && (
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-2">Remarks/Feedback</p>
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.feedback}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        {assignment.evaluationStatus === 'RE_EVALUATION_REQUIRED' && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-3">
                              <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-blue-900 mb-2">Defense Rescheduled for Re-Evaluation</p>
                                <div className="space-y-2 text-sm text-blue-800">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span><strong>Date:</strong> {new Date(schedule.defenseDate).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span><strong>Time:</strong> {schedule.defenseTime}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    <span><strong>Venue:</strong> {schedule.venue}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {assignment.evaluationStatus === 'PENDING' && (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">⏳ Your FYP-II defense is scheduled. Evaluation is pending.</p>
                          </div>
                        )}
                        {assignment.evaluationStatus === 'ACCEPTED' && (
                          <>
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                              <p className="text-sm text-green-800 font-semibold mb-2">✅ Congratulations! Your FYP-II has been accepted. Project completed and evaluated.</p>
                              <p className="text-xs text-green-700">A full digital archive has been generated for your group, ensuring permanent records for audit and accreditation.</p>
                            </div>
                            
                            {/* See Result Section */}
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold text-blue-900 mb-1">Final Results</h4>
                                  <p className="text-xs text-blue-700">Access your complete project archive and completion certificate</p>
                                </div>
                                <Button
                                  onClick={async () => {
                                    if (!userGroup || !user) return;
                                    try {
                                      // Open archive in new tab with user ID as query param
                                      const url = `/api/projects/${userGroup.id}/archive?userId=${user.id}`;
                                      window.open(url, '_blank');
                                      
                                      toast({
                                        title: 'Archive Opened',
                                        description: 'Your complete project archive is now open in a new tab. You can print or save it as PDF.',
                                      });
                                    } catch (error) {
                                      console.error('Error opening archive:', error);
                                      toast({
                                        title: 'Error',
                                        description: 'Failed to open archive',
                                        variant: 'destructive'
                                      });
                                    }
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  See Result
                                </Button>
                              </div>
                              
                              <div className="mt-4 space-y-2 text-sm text-blue-800">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Complete digital archive with all documents, reports, and codes</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Chat logs and meeting history</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Evaluation records and committee remarks</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Re-evaluation details (if any)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Trophy className="h-4 w-4" />
                                  <span>Completion certificate</span>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="p-4 bg-gray-50 border rounded-lg">
                        <p className="text-sm text-gray-600">FYP-II defense has not been scheduled yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          })()}
          {defenseSchedules.filter(s => s.defenseType === 'FYP_II').length === 0 && (() => {
            const fyp1Schedule = defenseSchedules.find(s => s.defenseType === 'FYP_I')
            const fyp1Assignment = fyp1Schedule ? getAssignmentForGroup(fyp1Schedule) : null
            const fyp1Accepted = fyp1Assignment?.evaluationStatus === 'ACCEPTED' || fyp1Assignment?.evaluationStatus === 'PASSED'
            
            if (fyp1Accepted) {
              return (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">FYP-II Not Scheduled</h3>
                    <p className="text-gray-600">FYP-II defense has not been scheduled for your group yet.</p>
                  </CardContent>
                </Card>
              )
            }
            return null
          })()}
        </TabsContent>
      </Tabs>
    </div>
  )
}

