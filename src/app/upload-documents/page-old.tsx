'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, FileText, Download, Eye, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  fileType: 'Proposal' | 'Report' | 'Documentation' | 'Other';
  badge?: string;
}

export default function UploadDocuments() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState('');
  const [fileType, setFileType] = useState<string>('Proposal');
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recentUploads, setRecentUploads] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRecentUploads();
  }, []);

  const loadRecentUploads = async () => {
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        const data = await response.json();
        setRecentUploads(data.files || []);
      }
    } catch (error) {
      console.error('Error loading files:', error);
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

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('description', fileDescription);
      formData.append('fileType', fileType);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      toast({
        title: "Upload Successful",
        description: `${selectedFile.name} has been uploaded successfully`,
      });

      // Reset form
      setSelectedFile(null);
      setFileDescription('');
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
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Badge variant="secondary">Uploading</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const getFileTypeBadge = (fileType: UploadedFile['fileType']) => {
    const colors = {
      PROPOSAL: 'bg-blue-100 text-blue-800',
      REPORT: 'bg-green-100 text-green-800',
      DOCUMENTATION: 'bg-purple-100 text-purple-800',
      OTHER: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={colors[fileType]}>
        {fileType}
      </Badge>
    );
  };

  const handleViewFile = (file: UploadedFile) => {
    // If we have a real uploaded file, open it directly
    if (file.fileUrl && file.status === 'completed') {
      const fullUrl = file.fileUrl;
      window.open(fullUrl, '_blank');
      
      toast({
        title: "File Opened",
        description: `${file.name} has been opened in a new tab`,
      });
    } else {
      // For demo files or failed uploads, generate content as before
      if (file.type === 'application/pdf') {
        const pdfContent = generatePDFContent(file);
        const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Open PDF in new window
        const newWindow = window.open(pdfUrl, '_blank');
        
        // Clean up the URL object after a short delay
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
        }, 1000);
        
        toast({
          title: "PDF Opened",
          description: `${file.name} has been opened in a new tab`,
        });
      } else {
        // For other files, create text content
        const fileContent = generateFileContent(file);
        const blob = new Blob([fileContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        
        // Clean up the URL object after a short delay
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
        
        toast({
          title: "File Opened",
          description: `${file.name} has been opened in a new tab`,
        });
      }
    }
  };

  const generatePDFContent = (file: UploadedFile): Uint8Array => {
    // Create a simple PDF content for demonstration
    const timestamp = new Date().toLocaleString();
    let content = '';
    
    switch (file.fileType) {
      case 'PROPOSAL':
        content = `PROJECT PROPOSAL

Title: ${file.name.replace('.pdf', '').replace(/_/g, ' ')}
Date: ${file.uploadedAt.toLocaleDateString()}
Description: ${file.description || 'No description provided'}

PROPOSAL CONTENT:
-----------------
This is a demonstration of the PDF viewing functionality for ${file.name}.

In a real application, this would display the actual content of the proposal document.
The content would include:

1. Project Title and Objectives
2. Background and Motivation
3. Methodology and Approach
4. Expected Outcomes
5. Timeline and Milestones
6. Resources Required
7. References

Generated for preview purposes on: ${timestamp}`;
        break;
        
      case 'REPORT':
        content = `PROGRESS REPORT

Title: ${file.name.replace('.pdf', '').replace(/_/g, ' ')}
Date: ${file.uploadedAt.toLocaleDateString()}
Description: ${file.description || 'No description provided'}

REPORT CONTENT:
---------------
This is a demonstration of the PDF viewing functionality for ${file.name}.

In a real application, this would display the actual content of the progress report.
The content would include:

1. Executive Summary
2. Work Completed This Period
3. Achievements and Milestones
4. Challenges and Solutions
5. Next Steps and Plans
6. Budget Status
7. Team Performance

Generated for preview purposes on: ${timestamp}`;
        break;
        
      default:
        content = `DOCUMENT CONTENT

File Name: ${file.name}
File Type: ${file.type}
Size: ${formatFileSize(file.size)}
Uploaded: ${file.uploadedAt.toLocaleDateString()}
Description: ${file.description || 'No description provided'}

This is a demonstration of the PDF viewing functionality for ${file.name}.

In a real application, this would display the actual content of the PDF file.

Generated for preview purposes on: ${timestamp}`;
    }
    
    // Create a minimal valid PDF
    // Using a simpler approach that creates a more reliable PDF structure
    const lines = content.split('\n');
    let yPosition = 750;
    const pdfObjects: string[] = [];
    
    // PDF Header
    pdfObjects.push('%PDF-1.4');
    
    // Create content stream with text positioning
    let contentStream = 'BT\n/F1 12 Tf\n';
    lines.forEach(line => {
      if (yPosition > 50) { // Stop if we're at the bottom of the page
        // Escape special characters in PDF
        const escapedLine = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
        contentStream += `72 ${yPosition} Td\n(${escapedLine}) Tj\n`;
        yPosition -= 18; // Move down for next line
      }
    });
    contentStream += 'ET\n';
    
    // Calculate object offsets
    const obj1Offset = pdfObjects.length;
    pdfObjects.push('1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n');
    
    const obj2Offset = pdfObjects.length;
    pdfObjects.push('2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n');
    
    const obj3Offset = pdfObjects.length;
    pdfObjects.push('3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n/Resources <<\n/Font <<\n/F1 5 0 R\n>>\n>>\n>>\nendobj\n');
    
    const obj4Offset = pdfObjects.length;
    const contentLength = contentStream.length;
    pdfObjects.push(`4 0 obj\n<<\n/Length ${contentLength}\n>>\nstream\n${contentStream}endstream\nendobj\n`);
    
    const obj5Offset = pdfObjects.length;
    pdfObjects.push('5 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n');
    
    // Add cross-reference table
    const xrefOffset = pdfObjects.join('\n').length + 1; // +1 for the newline after xref
    pdfObjects.push('xref\n0 6\n0000000000 65535 f \n');
    
    // Add object offsets (these are approximate for this demo)
    pdfObjects.push(`${String(obj1Offset).padStart(10, '0')} 00000 n \n`);
    pdfObjects.push(`${String(obj2Offset).padStart(10, '0')} 00000 n \n`);
    pdfObjects.push(`${String(obj3Offset).padStart(10, '0')} 00000 n \n`);
    pdfObjects.push(`${String(obj4Offset).padStart(10, '0')} 00000 n \n`);
    pdfObjects.push(`${String(obj5Offset).padStart(10, '0')} 00000 n \n`);
    
    // Add trailer
    pdfObjects.push('trailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n');
    pdfObjects.push(String(xrefOffset));
    pdfObjects.push('\n%%EOF');
    
    // Convert to bytes
    const fullPDFContent = pdfObjects.join('\n');
    return new TextEncoder().encode(fullPDFContent);
  };

  const generateFileContent = (file: UploadedFile): string => {
    const timestamp = new Date().toLocaleString();
    
    switch (file.fileType) {
      case 'PROPOSAL':
        return `
PROJECT PROPOSAL
================

Title: ${file.name.replace('.pdf', '').replace(/_/g, ' ')}
Date: ${file.uploadedAt.toLocaleDateString()}
Description: ${file.description || 'No description provided'}

PROPOSAL CONTENT:
-----------------
This is a demonstration of the file viewing functionality for ${file.name}.

In a real application, this would display the actual content of the proposal document.
The content would include:

1. Project Title and Objectives
2. Background and Motivation
3. Methodology and Approach
4. Expected Outcomes
5. Timeline and Milestones
6. Resources Required
7. References

Generated for preview purposes on: ${timestamp}
        `;
        
      case 'REPORT':
        return `
PROGRESS REPORT
===============

Title: ${file.name.replace('.pdf', '').replace(/_/g, ' ')}
Date: ${file.uploadedAt.toLocaleDateString()}
Description: ${file.description || 'No description provided'}

REPORT CONTENT:
---------------
This is a demonstration of the file viewing functionality for ${file.name}.

In a real application, this would display the actual content of the progress report.
The content would include:

1. Executive Summary
2. Work Completed This Period
3. Achievements and Milestones
4. Challenges and Solutions
5. Next Steps and Plans
6. Budget Status
7. Team Performance

Generated for preview purposes on: ${timestamp}
        `;
        
      case 'DOCUMENTATION':
        return `
DOCUMENTATION
==============

Title: ${file.name.replace('.docx', '').replace(/_/g, ' ')}
Date: ${file.uploadedAt.toLocaleDateString()}
Description: ${file.description || 'No description provided'}

DOCUMENTATION CONTENT:
----------------------
This is a demonstration of the file viewing functionality for ${file.name}.

In a real application, this would display the actual content of the documentation.
The content would include:

1. Introduction and Overview
2. Technical Specifications
3. Architecture and Design
4. Implementation Details
5. User Guide
6. API Documentation
7. Testing Procedures
8. Deployment Instructions

Generated for preview purposes on: ${timestamp}
        `;
        
      default:
        return `
FILE CONTENT
============

File Name: ${file.name}
File Type: ${file.type}
Size: ${formatFileSize(file.size)}
Uploaded: ${file.uploadedAt.toLocaleDateString()}
Description: ${file.description || 'No description provided'}

This is a demonstration of the file viewing functionality for ${file.name}.

In a real application, this would display the actual content of the file based on its type.

Generated for preview purposes on: ${timestamp}
        `;
    }
  };

  const isRecentlyUploaded = (file: UploadedFile): boolean => {
    const now = new Date();
    const fileDate = file.uploadedAt instanceof Date ? file.uploadedAt : new Date(file.uploadedAt);
    const timeDiff = now.getTime() - fileDate.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    return minutesDiff <= 5; // Files uploaded within last 5 minutes
  };

const handleDownloadFile = (file: UploadedFile) => {
    // If we have a real uploaded file, download it directly
    if (file.fileUrl && file.status === 'completed') {
      const link = document.createElement('a');
      link.href = file.fileUrl;
      link.download = file.actualFileName || file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: `Downloading ${file.name}...`,
      });
    } else {
      // For demo files or failed uploads, generate content as before
      if (file.type === 'application/pdf') {
        const pdfContent = generatePDFContent(file);
        const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name; // Keep the original .pdf extension
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        URL.revokeObjectURL(url);
        
        toast({
          title: "PDF Download Started",
          description: `Downloading ${file.name} as PDF...`,
        });
      } else {
        // For other files, create text content
        const fileContent = generateFileContent(file);
        const blob = new Blob([fileContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name.replace(/\.[^/.]+$/, '.txt'); // Convert to .txt for demo
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        URL.revokeObjectURL(url);
        
        toast({
          title: "Download Started",
          description: `Downloading ${file.name}...`,
        });
      }
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
              <h1 className="text-3xl font-bold text-gray-900">Upload Documents</h1>
              <p className="text-gray-600 mt-1">Submit your project proposals, reports, and documentation</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Upload New Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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

                {selectedFile && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedFile(null)}>
                        Remove
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="fileType">Document Type</Label>
                        <select
                          id="fileType"
                          value={fileType}
                          onChange={(e) => setFileType(e.target.value as any)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="PROPOSAL">Proposal</option>
                          <option value="REPORT">Report</option>
                          <option value="DOCUMENTATION">Documentation</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={fileDescription}
                          onChange={(e) => setFileDescription(e.target.value)}
                          placeholder="Describe what this document contains..."
                          rows={3}
                        />
                      </div>

                      <Button onClick={handleUpload} className="w-full">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Document
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Uploads */}
            {files.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Uploads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {files.map((file) => (
                      <div key={file.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(file.status)}
                            <div>
                              <p className="font-medium text-gray-900">{file.name}</p>
                              <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          {getStatusBadge(file.status)}
                        </div>
                        
                        {file.status === 'uploading' && (
                          <Progress value={uploadProgress[file.id] || 0} className="mt-2" />
                        )}
                        
                        {file.description && (
                          <p className="text-sm text-gray-600 mt-2">{file.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upload Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <p>Use descriptive file names</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <p>Keep file sizes under 10MB</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <p>Include version numbers for updates</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <p>Add clear descriptions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Uploads */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Uploads</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {[...existingFiles, ...serverFiles, ...files.filter(f => f.status === 'completed')]
                      .sort((a, b) => {
                        const aTime = a.uploadedAt instanceof Date ? a.uploadedAt.getTime() : new Date(a.uploadedAt).getTime();
                        const bTime = b.uploadedAt instanceof Date ? b.uploadedAt.getTime() : new Date(b.uploadedAt).getTime();
                        return bTime - aTime;
                      })
                      .map((file) => {
                        const isNew = isRecentlyUploaded(file);
                        return (
                      <div key={file.id} className={`p-3 border rounded-lg ${isNew ? 'bg-green-50 border-green-200' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            {isNew && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                New
                              </Badge>
                            )}
                          </div>
                          {getFileTypeBadge(file.fileType)}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatDate(file.uploadedAt)}
                          </span>
                          <div className="flex space-x-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewFile(file)}
                              title="View file"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDownloadFile(file)}
                              title="Download file"
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}