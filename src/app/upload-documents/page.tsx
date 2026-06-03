'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Upload, FileText, Download, Eye, CheckCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  fileType: string;
  badge: string;
  fileUrl?: string;
  fileName: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function UploadDocuments() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>('Proposal');
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProject, setUserProject] = useState<any>(null);
  
  // Proposal form fields
  const [proposalData, setProposalData] = useState({
    title: '',
    domain: '',
    objectives: '',
    abstract: '',
    description: '',
    tools: ''
  });
  
  const [recentUploads, setRecentUploads] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Try to load user's project if they're a student
      if (parsedUser.role === 'STUDENT') {
        loadUserProject(parsedUser.id);
      }
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadRecentUploads();
    }
  }, [user]);

  const loadUserProject = async (userId: string) => {
    try {
      const response = await fetch(`/api/projects?studentId=${userId}`);
      if (response.ok) {
        const projects = await response.json();
        if (projects && projects.length > 0) {
          setUserProject(projects[0]); // Use the first project
        }
      }
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };

  const loadRecentUploads = async () => {
    try {
      if (!user?.id) return;
      const response = await fetch('/api/files', {
        headers: {
          'x-user-id': user.id,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const mappedFiles = (data.files || []).map((file: any) => {
          // Convert file type to display format
          let displayType = 'Documentation';
          if (file.fileType === 'PROPOSAL') {
            displayType = 'Proposal';
          } else if (file.fileType === 'REPORT') {
            displayType = 'Report';
          } else if (file.fileType === 'DOCUMENTATION') {
            displayType = 'Documentation';
          } else if (file.fileType === 'OTHER') {
            displayType = 'Other';
          }
          
          return {
            id: file.id,
            name: file.name,
            size: file.size,
            uploadedAt: new Date(file.uploadedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            fileType: file.fileType,
            badge: displayType,
            fileUrl: file.fileUrl,
            fileName: file.name
          };
        });
        setRecentUploads(mappedFiles);
      }
    } catch (error) {
      console.error('Error loading uploads:', error);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    // Validate proposal fields if fileType is Proposal
    if (fileType === 'Proposal') {
      if (!proposalData.title || !proposalData.description) {
        toast({
          title: "Missing required fields",
          description: "Please fill in at least Project Title and Description",
          variant: "destructive"
        });
        return;
      }
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('fileType', fileType);
      
      // Add user and project context
      if (user) {
        formData.append('userId', user.id);
        formData.append('userName', user.name);
      }
      
      if (userProject) {
        formData.append('projectId', userProject.id);
        formData.append('projectTitle', userProject.title);
      } else if (fileType === 'Proposal' && proposalData.title) {
        formData.append('projectTitle', proposalData.title);
      }
      
      // Add proposal fields if fileType is Proposal
      if (fileType === 'Proposal') {
        formData.append('title', proposalData.title);
        formData.append('domain', proposalData.domain);
        formData.append('objectives', proposalData.objectives);
        formData.append('abstract', proposalData.abstract);
        formData.append('description', proposalData.description);
        formData.append('tools', proposalData.tools);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      toast({
        title: "Upload Successful",
        description: `${selectedFile.name} has been uploaded successfully`,
      });

      // Reset form
      setSelectedFile(null);
      setProposalData({
        title: '',
        domain: '',
        objectives: '',
        abstract: '',
        description: '',
        tools: ''
      });
      setFileType('Proposal');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Reload uploads
      await loadRecentUploads();

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      const response = await fetch(`/api/files/${fileToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      toast({
        title: "File Deleted",
        description: "File has been deleted successfully",
      });

      // Remove from local state
      setRecentUploads(prev => prev.filter(file => file.id !== fileToDelete));

    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const handleViewFile = async (file: UploadedFile) => {
    try {
      if (file.fileUrl) {
        // Open file in new tab
        window.open(file.fileUrl, '_blank');
      } else {
        toast({
          title: "File not available",
          description: "File URL not found",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('View error:', error);
      toast({
        title: "View Failed",
        description: "Failed to view file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadFile = async (file: UploadedFile) => {
    try {
      if (file.fileUrl) {
        // Create temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = file.fileUrl;
        link.download = file.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Download Started",
          description: `Downloading ${file.fileName}`,
        });
      } else {
        toast({
          title: "Download Failed",
          description: "File URL not found",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download file. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/student">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Upload Documents</h1>
          <p className="text-gray-600 mt-1">Submit your project proposals, reports, and documentation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Upload New Document
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drag and Drop Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Supported formats: PDF, DOC, DOCX, TXT, ZIP (Max 10MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileInputChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.zip"
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Choose File
                  </Button>
                </div>

                {/* Selected File Display */}
                {selectedFile && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-3 mb-4">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedFile(null)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="fileType" className="text-sm font-medium">
                          Document Type
                        </Label>
                        <Select value={fileType} onValueChange={setFileType}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Proposal">Proposal</SelectItem>
                            <SelectItem value="Report">Report</SelectItem>
                            <SelectItem value="Documentation">Documentation</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Proposal-specific fields */}
                      {fileType === 'Proposal' && (
                        <>
                          <div>
                            <Label htmlFor="title" className="text-sm font-medium">
                              Project Title <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="title"
                              value={proposalData.title}
                              onChange={(e) => setProposalData(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="Enter project title"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="domain" className="text-sm font-medium">
                              Domain/Area
                            </Label>
                            <Input
                              id="domain"
                              value={proposalData.domain}
                              onChange={(e) => setProposalData(prev => ({ ...prev, domain: e.target.value }))}
                              placeholder="e.g., Web Development, AI, Mobile Apps"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="objectives" className="text-sm font-medium">
                              Objectives
                            </Label>
                            <Textarea
                              id="objectives"
                              value={proposalData.objectives}
                              onChange={(e) => setProposalData(prev => ({ ...prev, objectives: e.target.value }))}
                              placeholder="List the main objectives of your project"
                              rows={3}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="abstract" className="text-sm font-medium">
                              Abstract
                            </Label>
                            <Textarea
                              id="abstract"
                              value={proposalData.abstract}
                              onChange={(e) => setProposalData(prev => ({ ...prev, abstract: e.target.value }))}
                              placeholder="Brief summary of your project"
                              rows={3}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="description" className="text-sm font-medium">
                              Description <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                              id="description"
                              value={proposalData.description}
                              onChange={(e) => setProposalData(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Detailed description of your project"
                              rows={4}
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="tools" className="text-sm font-medium">
                              Tools & Technologies
                            </Label>
                            <Input
                              id="tools"
                              value={proposalData.tools}
                              onChange={(e) => setProposalData(prev => ({ ...prev, tools: e.target.value }))}
                              placeholder="e.g., React, Node.js, MongoDB"
                              className="mt-1"
                            />
                          </div>
                        </>
                      )}

                      <Button 
                        onClick={handleUpload} 
                        className="w-full bg-black hover:bg-gray-800"
                        disabled={isUploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isUploading ? 'Uploading...' : 'Upload Document'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upload Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upload Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">Use descriptive file names</p>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">Keep file sizes under 10MB</p>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">Include version numbers for updates</p>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">Add clear descriptions</p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Uploads */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Uploads</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentUploads.map((file) => (
                  <div key={file.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <FileText className="w-5 h-5 text-gray-600 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {file.badge}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">{file.uploadedAt}</p>
                      <div className="flex items-center space-x-1 mt-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-xs"
                          onClick={() => handleViewFile(file)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-xs"
                          onClick={() => handleDownloadFile(file)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setFileToDelete(file.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFileToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
