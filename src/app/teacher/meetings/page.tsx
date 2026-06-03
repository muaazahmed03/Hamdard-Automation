'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Video, Users, ArrowLeft, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { notificationManager } from '@/lib/notification-manager';

export default function TeacherMeetings() {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [meetingType, setMeetingType] = useState<'online' | 'offline'>('online');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [students, setStudents] = useState([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchStudents();
    fetchUpcomingMeetings();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      
      const user = JSON.parse(userStr);
      
      const response = await fetch('/api/students/search', {
        headers: {
          'x-user-id': user.id
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchUpcomingMeetings = async () => {
    try {
      const response = await fetch('/api/meetings/upcoming');
      if (response.ok) {
        const data = await response.json();
        setUpcomingMeetings(data);
      }
    } catch (error) {
      console.error('Error fetching upcoming meetings:', error);
    }
  };

  // Generate time slots for 24 hours
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      const timeString = hour.toString().padStart(2, '0') + ':00';
      slots.push(timeString);
    }
    return slots;
  };

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isDateSelectable = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateObj = new Date(date);
    selectedDateObj.setHours(0, 0, 0, 0);
    
    if (selectedDateObj < today) return false;
    if (selectedDateObj.getDay() === 0 || selectedDateObj.getDay() === 6) return false;
    
    return true;
  };

  const handleDateSelect = (date: Date) => {
    if (isDateSelectable(date)) {
      const dateStr = date.toISOString().split('T')[0];
      setSelectedDate(dateStr);
      setShowCalendar(false);
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return 'Select a date';
    const date = new Date(selectedDate);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleScheduleMeeting = async () => {
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a meeting title",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedStudents.length === 0) {
      toast({
        title: "Validation Error", 
        description: "Please select at least one student",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedDate) {
      toast({
        title: "Validation Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedTime) {
      toast({
        title: "Validation Error",
        description: "Please select a time slot",
        variant: "destructive",
      });
      return;
    }

    if (meetingType === 'online' && !meetingLink.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a meeting link for online meetings",
        variant: "destructive",
      });
      return;
    }

    if (meetingType === 'offline' && !location.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a location for offline meetings",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUserId || ''
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          date: selectedDate,
          time: selectedTime,
          type: meetingType,
          location: location.trim(),
          meetingLink: meetingLink.trim(),
          participantIds: selectedStudents,
          organizerId: currentUserId
        })
      });

      if (response.ok) {
        const newMeeting = await response.json();
        console.log('Meeting scheduled successfully:', newMeeting);
        
        notificationManager.notifyMeetingScheduled(title, selectedDate, selectedTime);
        
        toast({
          title: "Meeting Scheduled Successfully",
          description: `Your meeting "${title}" has been scheduled with ${selectedStudents.length} student(s)`,
        });
        
        // Reset form
        setTitle('');
        setDescription('');
        setSelectedDate('');
        setSelectedTime('');
        setSelectedStudents([]);
        setMeetingType('online');
        setLocation('');
        setMeetingLink('');
        
        fetchUpcomingMeetings();
      } else {
        const errorData = await response.json();
        console.error('Failed to schedule meeting:', errorData);
        toast({
          title: "Scheduling Failed",
          description: errorData.error || "Failed to schedule meeting",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      toast({
        title: "Network Error",
        description: "Unable to connect to server. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/teacher">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Schedule Meeting</h1>
              <p className="text-gray-600 mt-1">Book a meeting with your students</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Meeting Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Meeting Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Meeting Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Project Progress Discussion"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what you want to discuss in this meeting"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Select Students</Label>
                  <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                    {students.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No students available</p>
                    ) : (
                      <div className="space-y-2">
                        {students.map((student: any) => (
                          <div
                            key={student.id}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedStudents.includes(student.id)
                                ? 'bg-blue-50 border-blue-500'
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => toggleStudentSelection(student.id)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {student.name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-sm">{student.name}</p>
                                <p className="text-xs text-gray-500">{student.email}</p>
                              </div>
                            </div>
                            {selectedStudents.includes(student.id) && (
                              <Check className="w-5 h-5 text-blue-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedStudents.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      {selectedStudents.length} student(s) selected
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Meeting Type */}
            <Card>
              <CardHeader>
                <CardTitle>Meeting Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant={meetingType === 'online' ? 'default' : 'outline'}
                    onClick={() => setMeetingType('online')}
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <Video className="w-6 h-6" />
                    <span>Online Meeting</span>
                  </Button>
                  <Button
                    variant={meetingType === 'offline' ? 'default' : 'outline'}
                    onClick={() => setMeetingType('offline')}
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <MapPin className="w-6 h-6" />
                    <span>In-Person Meeting</span>
                  </Button>
                </div>

                {meetingType === 'online' && (
                  <div className="mt-4">
                    <Label htmlFor="meetingLink">Meeting Link</Label>
                    <Input
                      id="meetingLink"
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      placeholder="https://zoom.us/meeting/... or https://meet.google.com/..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Provide Zoom, Google Meet, or Microsoft Teams link
                    </p>
                  </div>
                )}

                {meetingType === 'offline' && (
                  <div className="mt-4">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Room 301, CS Department, Building A"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Specify the exact location for in-person meeting
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Date & Time Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Select Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Date</Label>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      onClick={() => setShowCalendar(!showCalendar)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {formatSelectedDate()}
                    </Button>
                    
                    {showCalendar && (
                      <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80">
                        <div className="flex items-center justify-between mb-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMonthChange('prev')}
                          >
                            ←
                          </Button>
                          <h3 className="font-medium">
                            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </h3>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMonthChange('next')}
                          >
                            →
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                              {day}
                            </div>
                          ))}
                          {getDaysInMonth(currentMonth).map((date, index) => (
                            <div key={index} className="aspect-square">
                              {date && (
                                <button
                                  type="button"
                                  onClick={() => handleDateSelect(date)}
                                  disabled={!isDateSelectable(date)}
                                  className={`w-full h-full flex items-center justify-center text-sm rounded-md transition-colors ${
                                    !isDateSelectable(date)
                                      ? 'text-gray-300 cursor-not-allowed'
                                      : selectedDate === date.toISOString().split('T')[0]
                                      ? 'bg-blue-500 text-white'
                                      : 'hover:bg-gray-100'
                                  }`}
                                >
                                  {date.getDate()}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setShowCalendar(false)}
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="time">Time (24-hour format)</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {generateTimeSlots().map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Button 
              className="w-full h-12 text-lg"
              onClick={handleScheduleMeeting}
              disabled={!title || !selectedDate || !selectedTime || selectedStudents.length === 0}
            >
              <Check className="w-5 h-5 mr-2" />
              Schedule Meeting
            </Button>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Upcoming Meetings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingMeetings.length === 0 ? (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">No upcoming meetings scheduled</p>
                    </div>
                  ) : (
                    upcomingMeetings.slice(0, 5).map((meeting: any) => (
                      <div key={meeting.id} className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm">{meeting.title}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(meeting.date).toLocaleDateString()} at {meeting.time}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scheduling Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p>Schedule meetings at least 24 hours in advance</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p>Prepare agenda items before the meeting</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p>Share meeting links with students in advance</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p>Keep meetings focused and time-bound</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
