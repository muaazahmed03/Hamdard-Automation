'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Video, Users, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { notificationManager } from '@/lib/notification-manager';

export default function ScheduleMeeting() {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [meetingType, setMeetingType] = useState<'online' | 'offline'>('online');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { toast } = useToast();

  const supervisors = [
    { id: '1', name: 'Dr. John Smith', department: 'Computer Science', specialization: 'Machine Learning' },
    { id: '2', name: 'Dr. Sarah Johnson', department: 'Software Engineering', specialization: 'Web Development' },
    { id: '3', name: 'Dr. Michael Brown', department: 'Data Science', specialization: 'Big Data Analytics' },
  ];

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
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const isDateSelectable = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    // Can't select past dates
    if (selectedDate < today) return false;
    
    // Don't allow weekends (optional - remove if you want to allow weekends)
    if (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) return false;
    
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

  useEffect(() => {
    fetchUpcomingMeetings();
  }, []);

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

  const handleScheduleMeeting = async () => {
    // Validation
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a meeting title",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedSupervisor) {
      toast({
        title: "Validation Error", 
        description: "Please select a supervisor",
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          date: selectedDate,
          time: selectedTime,
          type: meetingType,
          location: location.trim(),
          meetingLink: meetingLink.trim(),
          supervisorId: selectedSupervisor
        })
      });

      if (response.ok) {
        const newMeeting = await response.json();
        console.log('Meeting scheduled successfully:', newMeeting);
        
        // Add notification
        const supervisor = supervisors.find(s => s.id === selectedSupervisor);
        notificationManager.notifyMeetingScheduled(title, selectedDate, selectedTime);
        
        // Show success message
        toast({
          title: "Meeting Scheduled Successfully",
          description: `Your meeting "${title}" has been scheduled with ${supervisor?.name}`,
        });
        
        // Reset form
        setTitle('');
        setDescription('');
        setSelectedDate('');
        setSelectedTime('');
        setSelectedSupervisor('');
        setMeetingType('online');
        setLocation('');
        setMeetingLink('');
        
        // Refresh upcoming meetings
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
            <Link href="/student">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Schedule Meeting</h1>
              <p className="text-gray-600 mt-1">Book a meeting with your supervisor</p>
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
                  <Label htmlFor="supervisor">Select Supervisor</Label>
                  <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a supervisor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisors.map((supervisor) => (
                        <SelectItem key={supervisor.id} value={supervisor.id}>
                          {supervisor.name} - {supervisor.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      placeholder="https://zoom.us/meeting/..."
                    />
                  </div>
                )}

                {meetingType === 'offline' && (
                  <div className="mt-4">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Room 301, CS Department"
                    />
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
                {/* Date Selection */}
                <div>
                  <Label htmlFor="date">Date</Label>
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
                        {/* Calendar Header */}
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
                        
                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1 text-center text-xs">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="font-medium text-gray-500 p-2">
                              {day}
                            </div>
                          ))}
                          {getDaysInMonth(currentMonth).map((day, index) => (
                            <div key={index} className="p-1">
                              {day ? (
                                <Button
                                  type="button"
                                  variant={selectedDate === day.toISOString().split('T')[0] ? 'default' : 'ghost'}
                                  size="sm"
                                  className={`w-full h-8 text-xs ${
                                    !isDateSelectable(day) 
                                      ? 'text-gray-300 cursor-not-allowed' 
                                      : 'hover:bg-gray-100'
                                  }`}
                                  onClick={() => handleDateSelect(day)}
                                  disabled={!isDateSelectable(day)}
                                >
                                  {day.getDate()}
                                </Button>
                              ) : (
                                <div className="h-8"></div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Time Selection */}
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

            {/* Schedule Button */}
            <Button 
              onClick={handleScheduleMeeting}
              className="w-full h-12 text-lg"
              disabled={!title || !selectedDate || !selectedTime || !selectedSupervisor}
            >
              <Check className="w-5 h-5 mr-2" />
              Schedule Meeting
            </Button>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Meetings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Upcoming Meetings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting: any) => (
                    <div key={meeting.id} className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">
                          {new Date(meeting.startTime).toLocaleDateString()}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="font-medium text-sm">{meeting.title}</h4>
                      <p className="text-xs text-gray-600">
                        {meeting.isOnline ? 'Online Meeting' : `Location: ${meeting.location}`}
                      </p>
                      {meeting.attendees && meeting.attendees.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          with {meeting.attendees[0].name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Scheduling Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <p>Schedule meetings at least 24 hours in advance</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <p>Prepare agenda items before the meeting</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <p>Send meeting reminders to participants</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <p>Test online meeting links beforehand</p>
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