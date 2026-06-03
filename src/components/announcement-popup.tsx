'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, FileCheck, AlertCircle, Calendar, Clock, MapPin, Users, Award } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  // Allow additional types such as DEFENSE / DEFENSE_SCHEDULE / GENERAL
  type: string
  priority: string
  deadlineDate?: string
  expiresAt?: string
  createdAt: string
}

interface AnnouncementPopupProps {
  userRole: 'STUDENT' | 'TEACHER'
}

export default function AnnouncementPopup({ userRole }: AnnouncementPopupProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Load announcements on every mount (every login/page load)
    // Add a small delay to ensure user data is loaded
    const timer = setTimeout(() => {
      loadAnnouncements()
    }, 500)

    return () => {
      clearTimeout(timer)
    }
  }, [userRole])

  const loadAnnouncements = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      
      if (!user?.id) {
        console.log('No user ID found, skipping announcement load')
        return
      }

      const response = await fetch('/api/announcements', {
        headers: { 'x-user-id': user.id }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded announcements:', data) // Debug log

        // Filter active announcements that haven't expired
        // Apply role-based filtering on client side as well
        const activeAnnouncements = data.filter((ann: Announcement) => {
          if (!ann) return false
          
          // For TEACHER role: Exclude PROOF_SUBMISSION announcements
          if (userRole === 'TEACHER' && ann.type === 'PROOF_SUBMISSION') {
            return false
          }
          
          // For STUDENT role: Only show PROOF_SUBMISSION to students
          // (This is already handled by API, but adding as safety check)
          
          const now = new Date()
          const expiresAt = ann.expiresAt ? new Date(ann.expiresAt) : null
          
          // Always show defense schedule announcements (if they passed API filtering)
          if (ann.type === 'DEFENSE_SCHEDULE' || ann.type === 'DEFENSE') {
            return (!expiresAt || expiresAt > now)
          }
          
          // For other announcements, check isActive
          return (!expiresAt || expiresAt > now) && ann.isActive !== false
        })

        console.log('Active announcements:', activeAnnouncements) // Debug log

        // Always show active announcements on each page load / refresh
        // Prioritize DEFENSE_SCHEDULE announcements
        const defenseAnnouncements = activeAnnouncements.filter((a: Announcement) => 
          a.type === 'DEFENSE_SCHEDULE' || a.type === 'DEFENSE'
        )
        const otherAnnouncements = activeAnnouncements.filter((a: Announcement) => 
          a.type !== 'DEFENSE_SCHEDULE' && a.type !== 'DEFENSE'
        )
        
        // Show defense announcements first, then others
        const sortedAnnouncements = [...defenseAnnouncements, ...otherAnnouncements]
        
        if (sortedAnnouncements.length > 0) {
          console.log('Setting announcements and opening popup:', sortedAnnouncements.length)
          setAnnouncements(sortedAnnouncements)
          setCurrentIndex(0)
          setIsOpen(true)
        } else {
          console.log('No active announcements to show')
          setAnnouncements([])
          setIsOpen(false)
        }
      } else {
        console.error('Failed to fetch announcements:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading announcements:', error)
    }
  }

  const handleNext = () => {
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setIsOpen(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleSkipAll = () => {
    setIsOpen(false)
  }

  if (!isOpen || announcements.length === 0) {
    return null
  }

  const currentAnnouncement = announcements[currentIndex]
  if (!currentAnnouncement) {
    return null
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <Badge className="ml-2 bg-red-500 hover:bg-red-600 text-white">High Priority</Badge>
      case 'NORMAL':
        return <Badge className="ml-2 bg-green-500 hover:bg-green-600 text-white">Normal</Badge>
      case 'LOW':
        return <Badge className="ml-2 bg-gray-400 hover:bg-gray-500 text-white">Low</Badge>
      default:
        return <Badge className="ml-2 bg-green-500 hover:bg-green-600 text-white">Normal</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PROOF_SUBMISSION':
        return <FileCheck className="h-6 w-6 text-green-600" />
      case 'DEFENSE':
      case 'DEFENSE_SCHEDULE':
        return <Award className="h-6 w-6 text-green-600" />
      case 'OTHER':
      case 'GENERAL':
        return <Bell className="h-6 w-6 text-green-600" />
      default:
        return <Bell className="h-6 w-6 text-green-600" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PROOF_SUBMISSION':
        return <Badge className="bg-green-500 text-white hover:bg-green-600">Proof Submission</Badge>
      case 'DEFENSE':
      case 'DEFENSE_SCHEDULE':
        return <Badge className="bg-green-600 text-white hover:bg-green-700">Defense Schedule</Badge>
      case 'OTHER':
      case 'GENERAL':
        return <Badge className="bg-green-500 text-white hover:bg-green-600">General</Badge>
      default:
        return <Badge className="bg-green-500 text-white">Announcement</Badge>
    }
  }

  // Parse defense schedule content to extract details
  const parseDefenseSchedule = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim())
    const details: any = {}
    
    lines.forEach(line => {
      if (line.includes('Title:')) {
        details.title = line.replace('Title:', '').trim()
      } else if (line.includes('Description:')) {
        details.description = line.replace('Description:', '').trim()
      } else if (line.includes('Date:')) {
        details.date = line.replace('Date:', '').trim()
      } else if (line.includes('Time:')) {
        details.time = line.replace('Time:', '').trim()
      } else if (line.includes('Venue:')) {
        details.venue = line.replace('Venue:', '').trim()
      }
    })
    
    return details
  }

  const isDefenseSchedule = currentAnnouncement.type === 'DEFENSE_SCHEDULE' || currentAnnouncement.type === 'DEFENSE'
  const defenseDetails = isDefenseSchedule ? parseDefenseSchedule(currentAnnouncement.content) : null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose()
    }}>
      <DialogContent className="max-w-lg sm:max-w-xl max-h-[75vh] overflow-y-auto shadow-2xl border-2 border-green-200 bg-white">
        <DialogHeader className="pb-2 border-b-2 border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 -mx-3 -mt-3 px-3 pt-3 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                Important Announcement
              </DialogTitle>
              <div className="flex items-center gap-3 flex-wrap">
                {getTypeBadge(currentAnnouncement.type)}
                {getPriorityBadge(currentAnnouncement.priority)}
                {announcements.length > 1 && (
                  <span className="text-xs sm:text-sm text-green-700 bg-green-100 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-medium">
                    {currentIndex + 1} of {announcements.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {/* Defense Schedule Details */}
          {isDefenseSchedule && defenseDetails && (
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-3 sm:p-4 rounded-xl border-2 border-green-200 shadow-lg">
              <div className="flex items-start gap-2 mb-2">
                <div className="p-1.5 bg-green-100 rounded-lg shadow-sm">
                  <Award className="h-4 w-4 text-green-700" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-bold mb-1 text-gray-900">{currentAnnouncement.title}</h3>
                  <div className="h-0.5 w-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mb-2"></div>
                </div>
              </div>

              {/* Defense Schedule Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                {defenseDetails.title && (
                  <div className="bg-white/90 backdrop-blur-sm p-2 rounded-lg border border-green-200 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Award className="h-3.5 w-3.5 text-green-600" />
                      <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wide">Title</p>
                    </div>
                    <p className="text-xs text-gray-800 font-medium">{defenseDetails.title}</p>
                  </div>
                )}
                
                {defenseDetails.date && (
                  <div className="bg-white/90 backdrop-blur-sm p-2 rounded-lg border border-green-200 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="h-3.5 w-3.5 text-green-600" />
                      <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wide">Date</p>
                    </div>
                    <p className="text-xs text-gray-800 font-medium">{defenseDetails.date}</p>
                  </div>
                )}

                {defenseDetails.time && (
                  <div className="bg-white/90 backdrop-blur-sm p-2 rounded-lg border border-green-200 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="h-3.5 w-3.5 text-green-600" />
                      <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wide">Time</p>
                    </div>
                    <p className="text-xs text-gray-800 font-medium">{defenseDetails.time}</p>
                  </div>
                )}

                {defenseDetails.venue && (
                  <div className="bg-white/90 backdrop-blur-sm p-2 rounded-lg border border-green-200 shadow-sm sm:col-span-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-green-600" />
                      <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wide">Venue</p>
                    </div>
                    <p className="text-xs text-gray-800 font-medium">{defenseDetails.venue}</p>
                  </div>
                )}
              </div>

              {defenseDetails.description && (
                <div className="bg-white/90 backdrop-blur-sm p-2 rounded-lg border border-green-200 shadow-sm mb-2">
                  <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{defenseDetails.description}</p>
                </div>
              )}

              {/* Action Required for Defense */}
              <div className="mt-2 flex items-start gap-2 p-2.5 bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-xl shadow-md">
                <div className="p-1 bg-green-200 rounded-lg">
                  <AlertCircle className="h-3.5 w-3.5 text-green-700" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-green-900 mb-0.5 text-xs">📋 Important</p>
                  <p className="text-[10px] text-green-800">
                    Please prepare your presentation and arrive at the venue 15 minutes before the scheduled time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Regular Announcement Content */}
          {!isDefenseSchedule && (
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-3 sm:p-4 rounded-xl border-2 border-green-200 shadow-lg">
              <div className="flex items-start gap-2 mb-2">
                <div className="p-1.5 bg-white rounded-lg shadow-sm">
                  <Bell className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-bold mb-1.5 text-gray-900">{currentAnnouncement.title}</h3>
                  <div className="h-0.5 w-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mb-2"></div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-green-200">
                <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{currentAnnouncement.content}</p>
              </div>
            </div>
          )}

          {/* Deadline Section */}
          {currentAnnouncement.deadlineDate && (
            <div className="flex items-start gap-2 p-2.5 sm:p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-md">
              <div className="p-1 bg-green-100 rounded-lg">
                <Calendar className="h-4 w-4 text-green-700" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-900 mb-0.5 text-xs sm:text-sm">⏰ Deadline</p>
                <p className="text-[10px] sm:text-xs text-green-800 font-medium">
                  {new Date(currentAnnouncement.deadlineDate).toLocaleString('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Proof Submission Action Required */}
          {currentAnnouncement.type === 'PROOF_SUBMISSION' && userRole === 'STUDENT' && (
            <div className="flex items-start gap-2 p-2.5 sm:p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-md">
              <div className="p-1 bg-green-100 rounded-lg">
                <AlertCircle className="h-4 w-4 text-green-700" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-900 mb-0.5 text-xs sm:text-sm">⚠️ Action Required</p>
                <p className="text-[10px] sm:text-xs text-green-800">
                  You need to submit proof documents for verification. Please visit your dashboard to upload the required documents.
                </p>
              </div>
            </div>
          )}

          {/* Posted Date */}
          <div className="flex items-center justify-between pt-2 border-t-2 border-green-100">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
              <Bell className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="font-medium">
                Posted on {new Date(currentAnnouncement.createdAt).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-2 border-t-2 border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 -mx-3 -mb-3 px-3 py-2 rounded-b-lg">
          {announcements.length > 1 && (
            <Button
              variant="outline"
              onClick={handleSkipAll}
              className="border-2 border-green-300 hover:bg-green-100 hover:text-green-800 font-medium text-green-700 text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3"
            >
              Skip All ({announcements.length - currentIndex})
            </Button>
          )}
          {announcements.length > 1 && currentIndex < announcements.length - 1 && (
            <Button
              variant="outline"
              onClick={handleNext}
              className="border-2 border-green-300 hover:bg-green-100 hover:text-green-800 font-medium text-green-700 text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3"
            >
              Next ({currentIndex + 1}/{announcements.length}) →
            </Button>
          )}
          <Button
            onClick={currentIndex < announcements.length - 1 ? handleNext : handleClose}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all text-xs sm:text-sm py-1.5 sm:py-2"
          >
            {currentIndex < announcements.length - 1 ? 'Next →' : '✓ Got it'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
