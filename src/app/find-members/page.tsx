'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Search, Users, UserPlus, Mail, Phone, Star, Clock, Check, X } from 'lucide-react';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  gpa: number;
  department: string;
  semester: number;
  skills: string[];
  interests: string[];
  profileImage?: string;
  isAvailable: boolean;
  currentGroup?: string;
}

interface GroupRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
  fromUser: Student;
  toUser: Student;
}

export default function FindMembers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'rollNumber'>('name');
  const [suggestedStudents, setSuggestedStudents] = useState<Student[]>([]);
  const [sentRequests, setSentRequests] = useState<GroupRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<GroupRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'find' | 'sent' | 'received'>('find');
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get current user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setCurrentUser({ id: parsed.id, name: parsed.name });
      } catch (err) {
        console.error('Failed to parse user', err);
      }
    }
  }, []);

  // Load students from API
  useEffect(() => {
    if (!currentUser) return;
    fetchStudents();
  }, [currentUser]);

  const fetchStudents = async (query = '', type = 'name') => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      params.append('type', type);
      
      const response = await fetch(`/api/students/search?${params.toString()}`, {
        headers: {
          'x-user-id': currentUser.id
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestedStudents(data);
      } else {
        console.error('Failed to fetch students');
        setSuggestedStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setSuggestedStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    fetchStudents(searchQuery.trim(), searchType);
  };

  const sendGroupRequest = (student: Student) => {
    const newRequest: GroupRequest = {
      id: Date.now().toString(),
      fromUserId: 'current-user',
      toUserId: student.id,
      message: `Hi ${student.name}! I'd like to invite you to join my FYP group.`,
      status: 'PENDING',
      createdAt: new Date(),
      fromUser: { id: 'current-user', name: 'You', rollNumber: '', email: '', gpa: 0, department: '', semester: 0, skills: [], interests: [], isAvailable: false },
      toUser: student
    };

    setSentRequests([...sentRequests, newRequest]);
    setSuggestedStudents(suggestedStudents.map(s => 
      s.id === student.id ? { ...s, isAvailable: false } : s
    ));
  };

  const handleRequestResponse = (requestId: string, response: 'ACCEPTED' | 'REJECTED') => {
    setReceivedRequests(receivedRequests.map(req => 
      req.id === requestId ? { ...req, status: response } : req
    ));
  };

  const getStatusBadge = (status: GroupRequest['status']) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>;
      case 'ACCEPTED':
        return <Badge variant="default" className="bg-green-500">Accepted</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>;
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
              <h1 className="text-3xl font-bold text-gray-900">Find Group Members</h1>
              <p className="text-gray-600 mt-1">Connect with classmates for your FYP project</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <Button
            variant={activeTab === 'find' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('find')}
            className="flex items-center space-x-2"
          >
            <Search className="w-4 h-4" />
            <span>Find Members</span>
          </Button>
          <Button
            variant={activeTab === 'sent' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('sent')}
            className="flex items-center space-x-2"
          >
            <Mail className="w-4 h-4" />
            <span>Sent Requests</span>
            {sentRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {sentRequests.filter(r => r.status === 'PENDING').length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'received' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('received')}
            className="flex items-center space-x-2"
          >
            <Users className="w-4 h-4" />
            <span>Received Requests</span>
            {receivedRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {receivedRequests.filter(r => r.status === 'PENDING').length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'find' && (
          <div className="space-y-6">
            {/* Search Section */}
            <Card>
              <CardHeader>
                <CardTitle>Search Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <div className="flex space-x-2">
                      <select
                        value={searchType}
                        onChange={(e) => setSearchType(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="name">Search by Name</option>
                        <option value="rollNumber">Search by Roll Number</option>
                      </select>
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder={searchType === 'name' ? 'Enter student name...' : 'Enter roll number...'}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                          className="pl-10"
                          disabled={isLoading}
                        />
                      </div>
                      <Button onClick={handleSearch} disabled={isLoading}>
                        <Search className="w-4 h-4 mr-2" />
                        {isLoading ? 'Searching...' : 'Search'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Suggested Students */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {searchQuery ? `Search Results (${suggestedStudents.length})` : `Available Students (${suggestedStudents.length})`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading students...</p>
                    </div>
                  </div>
                ) : suggestedStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                    <p className="text-gray-600">
                      {searchQuery 
                        ? 'Try adjusting your search criteria' 
                        : 'No students are available at the moment'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{suggestedStudents.map((student) => (
                    <div key={student.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                      <div className="flex items-center space-x-3 mb-3">
                        <Avatar>
                          <AvatarImage src={student.profileImage} />
                          <AvatarFallback>
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{student.name}</h3>
                          <p className="text-sm text-gray-500">{student.rollNumber}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          student.isAvailable ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">GPA:</span>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="font-medium">{student.gpa}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Department:</span>
                          <span>{student.department}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Semester:</span>
                          <span>{student.semester}</span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {student.skills.slice(0, 3).map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {student.skills.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{student.skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Interests:</p>
                        <div className="flex flex-wrap gap-1">
                          {student.interests.slice(0, 2).map((interest, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                          {student.interests.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{student.interests.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {!student.currentGroup && student.isAvailable && (
                        <Button 
                          onClick={() => sendGroupRequest(student)}
                          className="w-full"
                          size="sm"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Send Request
                        </Button>
                      )}

                      {student.currentGroup && (
                        <div className="text-center text-sm text-gray-500">
                          Already in {student.currentGroup}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'sent' && (
          <Card>
            <CardHeader>
              <CardTitle>Sent Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sentRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={request.toUser.profileImage} />
                          <AvatarFallback>
                            {request.toUser.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-gray-900">{request.toUser.name}</h4>
                          <p className="text-sm text-gray-500">{request.toUser.rollNumber}</p>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{request.message}</p>
                    <p className="text-xs text-gray-500">
                      Sent {request.createdAt.toLocaleDateString()} at {request.createdAt.toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'received' && (
          <Card>
            <CardHeader>
              <CardTitle>Received Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {receivedRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={request.fromUser.profileImage} />
                          <AvatarFallback>
                            {request.fromUser.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-gray-900">{request.fromUser.name}</h4>
                          <p className="text-sm text-gray-500">{request.fromUser.rollNumber}</p>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{request.message}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        Received {request.createdAt.toLocaleDateString()} at {request.createdAt.toLocaleTimeString()}
                      </p>
                      {request.status === 'PENDING' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleRequestResponse(request.id, 'ACCEPTED')}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRequestResponse(request.id, 'REJECTED')}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}