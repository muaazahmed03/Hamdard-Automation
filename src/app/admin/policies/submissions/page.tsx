"use client";
import { useEffect, useState } from "react";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  User, 
  Calendar, 
  Eye, 
  Loader2,
  Filter,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const FORM_LABELS = {
  proposal: "Proposal Submission Form",
  "supervisor-change": "Supervisor Change Form",
  consent: "FYP Student Consent Form",
  extension: "Extension Request Form",
  reeval: "Re-Evaluation Appeal Form",
  general: "General Request Form",
  "proof-submission": "Proof Submission",
};

// Component to render form data based on type
function FormDataRenderer({ formType, data }: { formType: string; data: any }) {
  if (!data) return <p className="text-gray-500">No data available</p>;

  const renderField = (label: string, value: any) => {
    if (!value || value === '') return null;
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-500">{label}</label>
        <p className="text-sm text-gray-900">{value}</p>
      </div>
    );
  };

  const renderMembers = (members: any[]) => {
    if (!members || members.length === 0) return null;
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-500">Project Members</label>
        <div className="space-y-2">
          {members.map((member: any, idx: number) => (
            member.name || member.regNo ? (
              <div key={idx} className="bg-gray-50 p-3 rounded border">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500">Name</span>
                    <p className="text-sm font-medium">{member.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Registration Number</span>
                    <p className="text-sm font-medium">{member.regNo || '-'}</p>
                  </div>
                </div>
              </div>
            ) : null
          ))}
        </div>
      </div>
    );
  };

  switch (formType) {
    case 'proposal':
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("Project Title", data.projectTitle)}
            {renderField("Project Track", data.projectTrack)}
            {renderField("Program of Study", data.program)}
            {renderField("Session", data.session)}
            {renderField("Domain/Area", data.domain)}
            {renderField("Date", data.date)}
          </div>
          {renderMembers(data.members)}
          <div className="space-y-4">
            {renderField("Supervisor Recommendation", data.supervisorRecommendation)}
            {renderField("Extra Requirements", data.extraRequirements)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField("Supervisor Name", data.supervisorName)}
              {renderField("Supervisor Designation", data.supervisorDesignation)}
              {renderField("Co-Supervisor Name", data.coSupervisorName)}
              {renderField("Co-Supervisor Designation", data.coSupervisorDesignation)}
            </div>
            {renderField("Comments by FYP Committee", data.comments)}
          </div>
        </div>
      );

    case 'proposal-file':
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("Project Title", data.title || data.projectTitle)}
            {renderField("Domain/Area", data.domain)}
            {renderField("File Name", data.fileName)}
            {renderField("File Size", data.fileSize)}
            {renderField("Group Name", data.groupName)}
            {renderField("Project Title", data.projectTitle)}
          </div>
          {data.description && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="text-sm text-gray-900">{data.description}</p>
            </div>
          )}
          {data.fileUrl && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">Proposal File</label>
              <a 
                href={data.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {data.fileName}
              </a>
            </div>
          )}
        </div>
      );

    case 'supervisor-change':
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("Project Title", data.projectTitle)}
            {renderField("Project Code", data.projectCode)}
            {renderField("Previous Supervisor", data.prevSupervisor)}
            {renderField("New Supervisor", data.newSupervisor)}
            {renderField("Co-Supervisors", data.coSupervisors)}
            {renderField("Date", data.date)}
          </div>
          {renderMembers(data.members)}
          <div className="space-y-4">
            {renderField("Reason for Change", data.reason)}
            {renderField("Previous Supervisor Comments", data.prevSupervisorComments)}
            {renderField("New Supervisor Comments", data.newSupervisorComments)}
            {renderField("Committee Comments", data.committeeComments)}
          </div>
        </div>
      );

    case 'consent':
      return (
        <div className="space-y-6">
          {renderMembers(data.members)}
          <div className="space-y-4">
            {renderField("Consent Statement", data.consentStatement)}
            {renderField("Additional Notes", data.additionalNotes)}
            {renderField("Date", data.date)}
          </div>
        </div>
      );

    case 'extension':
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("Project Title", data.projectTitle)}
            {renderField("Requested Extension", data.requestedExtension)}
            {renderField("Supporting Documents", data.supportingDocs)}
          </div>
          {renderMembers(data.members)}
          {renderField("Reason for Extension", data.reason)}
        </div>
      );

    case 'reeval':
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("Project Title", data.projectTitle)}
            {renderField("Evaluation Type", data.evaluationType)}
            {renderField("Previous Score", data.previousScore)}
            {renderField("Date", data.date)}
          </div>
          {renderMembers(data.members)}
          {renderField("Appeal Reason", data.appealReason)}
          {renderField("Supporting Evidence", data.supportingEvidence)}
          {renderField("Committee Response", data.committeeResponse)}
        </div>
      );

    case 'general':
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("Request Type", data.requestType)}
            {renderField("Subject", data.subject)}
            {renderField("Date", data.date)}
          </div>
          {renderMembers(data.members)}
          {renderField("Description", data.description)}
          {renderField("Committee Response", data.committeeResponse)}
        </div>
      );

    case 'proof-submission':
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("Announcement", data.announcementTitle)}
            {renderField("Group Name", data.groupName)}
            {renderField("CGPA", data.cgpa ? data.cgpa.toString() : null)}
            {renderField("File Name", data.proofFileName)}
            {renderField("File Size", data.proofFileSize ? `${Math.round(data.proofFileSize / 1024)} KB` : null)}
          </div>
          {data.proofFileUrl && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">Proof File</label>
              <a 
                href={data.proofFileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {data.proofFileName}
              </a>
            </div>
          )}
          {data.transcriptUrl && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">Transcript</label>
              <a 
                href={data.transcriptUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                View Transcript
              </a>
            </div>
          )}
          {renderField("Remarks", data.remarks)}
        </div>
      );

    default:
      return (
        <div className="bg-gray-50 border rounded-lg p-4">
          <pre className="text-xs sm:text-sm overflow-x-auto whitespace-pre-wrap font-mono">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
  }
}

export default function AdminFormSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [proofSubmissions, setProofSubmissions] = useState([]);
  const [proposalSubmissions, setProposalSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formTypeFilter, setFormTypeFilter] = useState('ALL');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [submissionToApprove, setSubmissionToApprove] = useState<any>(null);
  const [approveAction, setApproveAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Load form submissions
  const loadSubmissions = async () => {
    setLoading(true);
    try {
      // Load form submissions
      const formsResponse = await fetch("/api/forms/all");
      const formsData = await formsResponse.json();
      
      if (formsResponse.ok) {
        setSubmissions(formsData);
      } else {
        console.error('API Error:', formsData);
        throw new Error(formsData.error || formsData.details || 'Failed to load form submissions');
      }

      // Load proof submissions
      const proofResponse = await fetch("/api/admin/proof-submissions");
      const proofData = await proofResponse.json();
      
      if (proofResponse.ok) {
        setProofSubmissions(proofData);
      } else {
        console.error('Error loading proof submissions:', proofData);
        setProofSubmissions([]);
      }

      // Load proposal file uploads that have been approved by supervisor
      const proposalsResponse = await fetch("/api/admin/files");
      const proposalsData = await proposalsResponse.json();
      
      if (proposalsResponse.ok && Array.isArray(proposalsData)) {
        console.log('[Admin Submissions] Received proposals from API:', proposalsData.length);
        console.log('[Admin Submissions] Sample proposal:', proposalsData[0]);
        
        // Show proposals that are approved by supervisor OR approved by committee head
        // Exclude only those fully processed by admin
        // When supervisor approves, status becomes 'APPROVED' and supervisorApprovalStatus becomes 'APPROVED'
        const approvedProposals = proposalsData.filter((p: any) => {
          const isProposal = (p.fileType?.toUpperCase() === 'PROPOSAL' || p.fileType === 'proposal');
          if (!isProposal) return false;
          
          // Check if supervisor approved (status='APPROVED' OR supervisorApprovalStatus='APPROVED')
          const isSupervisorApproved = p.status === 'APPROVED' || 
                                      p.supervisorApprovalStatus === 'APPROVED';
          // Check if committee approved
          const isCommitteeApproved = p.status === 'COMMITTEE_APPROVED';
          
          // Must be approved by supervisor OR committee
          if (!isSupervisorApproved && !isCommitteeApproved) {
            console.log('[Admin Submissions] Filtered out - not approved:', {
              id: p.id,
              status: p.status,
              supervisorApprovalStatus: p.supervisorApprovalStatus
            });
            return false;
          }
          
          // Exclude if already processed by admin
          if (p.status === 'ADMIN_APPROVED' || p.status === 'ADMIN_REJECTED') {
            console.log('[Admin Submissions] Filtered out - already processed by admin:', {
              id: p.id,
              status: p.status
            });
            return false;
          }
          
          console.log('[Admin Submissions] Accepted proposal:', {
            id: p.id,
            fileName: p.fileName,
            status: p.status,
            supervisorApprovalStatus: p.supervisorApprovalStatus
          });
          return true;
        });
        
        console.log('[Admin Submissions] Final approved proposals count:', approvedProposals.length);
        setProposalSubmissions(approvedProposals);
      } else {
        console.error('Error loading proposal submissions:', proposalsData);
        setProposalSubmissions([]);
      }
    } catch (error: any) {
      console.error('Error loading submissions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load submissions",
        variant: "destructive"
      });
      setSubmissions([]);
      setProofSubmissions([]);
      setProposalSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  // Handle approve/reject
  const handleApproveReject = (submission: any, action: 'APPROVE' | 'REJECT') => {
    setSubmissionToApprove(submission);
    setApproveAction(action);
    setReviewComments('');
    setApproveDialogOpen(true);
  };

  const handleApproveRejectConfirm = async () => {
    if (!submissionToApprove || !approveAction) return;

    setIsProcessing(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Handle proof submissions differently
      if (submissionToApprove.type === 'proof-submission') {
        const response = await fetch(`/api/committee/proof-submissions/${submissionToApprove.id}/review`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id || ''
          },
          body: JSON.stringify({
            status: approveAction === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            reviewComments: reviewComments
          }),
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: `Proof submission ${approveAction === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
          });
          await loadSubmissions();
          setApproveDialogOpen(false);
          setSubmissionToApprove(null);
          setApproveAction(null);
          setReviewComments('');
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update proof submission');
        }
      } else if (submissionToApprove.type === 'proposal-file') {
        // Handle proposal file uploads
        const response = await fetch(`/api/admin/files/${submissionToApprove.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id || ''
          },
          body: JSON.stringify({
            status: approveAction === 'APPROVE' ? 'ADMIN_APPROVED' : 'ADMIN_REJECTED',
            adminRemarks: reviewComments
          }),
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: `Proposal ${approveAction === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
          });
          await loadSubmissions();
          setApproveDialogOpen(false);
          setSubmissionToApprove(null);
          setApproveAction(null);
          setReviewComments('');
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update proposal');
        }
      } else {
        // Handle form submissions
        const response = await fetch(`/api/forms/${submissionToApprove.id}/approve`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id || ''
          },
          body: JSON.stringify({
            action: approveAction,
            comments: reviewComments
          }),
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: `Form submission ${approveAction === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
          });
          await loadSubmissions();
          setApproveDialogOpen(false);
          setSubmissionToApprove(null);
          setApproveAction(null);
          setReviewComments('');
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update submission');
        }
      }
    } catch (error: any) {
      console.error('Error updating submission:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update submission",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle delete
  const handleDeleteClick = (submission: any) => {
    setSubmissionToDelete(submission);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!submissionToDelete) return;

    setIsDeleting(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Handle proof submissions
      if (submissionToDelete.type === 'proof-submission') {
        const response = await fetch(`/api/committee/proof-submissions/${submissionToDelete.id}`, {
          method: 'DELETE',
          headers: {
            'x-user-id': user.id || ''
          }
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: "Proof submission deleted successfully",
          });
          await loadSubmissions();
          setDeleteDialogOpen(false);
          setSubmissionToDelete(null);
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete proof submission');
        }
      } else if (submissionToDelete.type === 'proposal-file') {
        // Handle proposal file uploads - use admin files endpoint
        const response = await fetch(`/api/admin/files/${submissionToDelete.id}`, {
          method: 'DELETE',
          headers: {
            'x-user-id': user.id || ''
          }
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: "Proposal file deleted successfully",
          });
          await loadSubmissions();
          setDeleteDialogOpen(false);
          setSubmissionToDelete(null);
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete proposal file');
        }
      } else {
        // Handle form submissions
        const response = await fetch(`/api/forms/${submissionToDelete.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: "Form submission deleted successfully",
          });
          await loadSubmissions();
          setDeleteDialogOpen(false);
          setSubmissionToDelete(null);
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete submission');
        }
      }
    } catch (error: any) {
      console.error('Error deleting submission:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete submission",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter submissions by type
  const getFilteredSubmissions = () => {
    // Format proposal submissions
    const formattedProposalSubmissions = proposalSubmissions.map((ps: any) => ({
      id: ps.id,
      type: 'proposal-file',
      submittedBy: ps.studentId,
      submittedByName: ps.studentName || ps.student?.name || 'Unknown',
      submittedByEmail: ps.studentEmail || ps.student?.email || '',
      submittedByRollNumber: ps.studentRollNumber || ps.student?.rollNumber || '',
      submittedByDepartment: ps.studentDepartment || ps.student?.department || '',
      status: ps.status,
      supervisorApprovalStatus: ps.supervisorApprovalStatus,
      reviewedBy: ps.reviewedBy,
      reviewComments: ps.reviewComments || ps.supervisorRemarks,
      reviewedAt: ps.reviewedAt || ps.approvedBySupervisorAt,
      createdAt: ps.createdAt,
      data: {
        fileName: ps.fileName,
        fileUrl: ps.fileUrl,
        fileSize: ps.fileSize,
        title: ps.title,
        description: ps.description,
        domain: ps.domain,
        projectTitle: ps.projectTitle || ps.project?.title,
        groupName: ps.groupName || ps.project?.group?.name
      }
    }));

    if (formTypeFilter === 'ALL') {
      // Combine form submissions, proof submissions, and proposal file uploads
      const formattedProofSubmissions = proofSubmissions.map((ps: any) => ({
        id: ps.id,
        type: 'proof-submission',
        submittedBy: ps.studentId,
        submittedByName: ps.studentName,
        submittedByEmail: ps.studentEmail,
        submittedByRollNumber: ps.studentRollNumber,
        submittedByDepartment: ps.studentDepartment,
        status: ps.status,
        reviewedBy: ps.reviewedBy,
        reviewComments: ps.reviewComments,
        reviewedAt: ps.reviewedAt,
        createdAt: ps.createdAt,
        data: {
          announcementTitle: ps.announcementTitle,
          proofFileName: ps.proofFileName,
          proofFileUrl: ps.proofFileUrl,
          proofFileSize: ps.proofFileSize,
          transcriptUrl: ps.transcriptUrl,
          cgpa: ps.cgpa,
          remarks: ps.remarks,
          groupName: ps.groupName
        }
      }));
      return [...submissions, ...formattedProofSubmissions, ...formattedProposalSubmissions];
    } else if (formTypeFilter === 'proof-submission') {
      // Return only proof submissions formatted
      return proofSubmissions.map((ps: any) => ({
        id: ps.id,
        type: 'proof-submission',
        submittedBy: ps.studentId,
        submittedByName: ps.studentName,
        submittedByEmail: ps.studentEmail,
        submittedByRollNumber: ps.studentRollNumber,
        submittedByDepartment: ps.studentDepartment,
        status: ps.status,
        reviewedBy: ps.reviewedBy,
        reviewComments: ps.reviewComments,
        reviewedAt: ps.reviewedAt,
        createdAt: ps.createdAt,
        data: {
          announcementTitle: ps.announcementTitle,
          proofFileName: ps.proofFileName,
          proofFileUrl: ps.proofFileUrl,
          proofFileSize: ps.proofFileSize,
          transcriptUrl: ps.transcriptUrl,
          cgpa: ps.cgpa,
          remarks: ps.remarks,
          groupName: ps.groupName
        }
      }));
    } else if (formTypeFilter === 'proposal') {
      // Return both proposal form submissions and proposal file uploads
      const proposalForms = submissions.filter((s: any) => s.type === 'proposal');
      return [...proposalForms, ...formattedProposalSubmissions];
    } else {
      return submissions.filter((s: any) => s.type === formTypeFilter);
    }
  };

  const filteredSubmissions = getFilteredSubmissions();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Admin Submissions & Approvals</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage and review student form submissions</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Form Submissions
                </CardTitle>
                <CardDescription className="mt-1">
                  Review and manage all student form submissions
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <Select value={formTypeFilter} onValueChange={setFormTypeFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by form type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Forms</SelectItem>
                    <SelectItem value="proposal">Proposal Submission Form</SelectItem>
                    <SelectItem value="supervisor-change">Supervisor Change Form</SelectItem>
                    <SelectItem value="consent">FYP Student Consent Form</SelectItem>
                    <SelectItem value="extension">Extension Request Form</SelectItem>
                    <SelectItem value="reeval">Re-Evaluation Appeal Form</SelectItem>
                    <SelectItem value="general">General Request Form</SelectItem>
                    <SelectItem value="proof-submission">Proof Submission</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-4" />
                <p className="text-sm text-gray-500">Loading form submissions...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {formTypeFilter === 'ALL' ? 'No Form Submissions' : `No ${FORM_LABELS[formTypeFilter as keyof typeof FORM_LABELS]} Submissions`}
                </h3>
                <p className="text-sm text-gray-500 max-w-md">
                  {formTypeFilter === 'ALL' 
                    ? 'No form submissions have been submitted yet. Forms will appear here once students submit them.'
                    : `No ${FORM_LABELS[formTypeFilter as keyof typeof FORM_LABELS]} submissions found.`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                        <TableHead className="w-[200px]">Type</TableHead>
                        <TableHead>Submitted By</TableHead>
                        <TableHead className="hidden md:table-cell">Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((s: any) => (
                      <TableRow key={s.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{FORM_LABELS[s.type as keyof typeof FORM_LABELS] || s.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {s.submittedByName ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="font-medium text-sm">{s.submittedByName}</span>
                              </div>
                              {s.submittedByRollNumber && (
                                <div className="text-xs text-gray-500 ml-6">
                                  Roll: {s.submittedByRollNumber}
                                </div>
                              )}
                              {s.submittedByEmail && (
                                <div className="text-xs text-gray-500 ml-6 truncate max-w-[200px]">
                                  {s.submittedByEmail}
                                </div>
                              )}
                              {s.submittedByDepartment && (
                                <div className="text-xs text-gray-500 ml-6">
                                  {s.submittedByDepartment}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge 
                              variant={
                                s.status === 'APPROVED' 
                                  ? 'default' 
                                  : s.status === 'REJECTED' 
                                    ? 'destructive' 
                                    : 'secondary'
                              }
                              className="flex items-center gap-1 w-fit"
                            >
                              {s.status === 'APPROVED' ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : s.status === 'REJECTED' ? (
                                <XCircle className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              {s.status || 'PENDING'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {new Date(s.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(s.createdAt).toLocaleTimeString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelected(s)}
                                className="gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                <span className="hidden sm:inline">View</span>
                              </Button>
                              {s.status === 'PENDING' && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleApproveReject(s, 'APPROVE')}
                                    className="gap-2 bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="hidden sm:inline">Approve</span>
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleApproveReject(s, 'REJECT')}
                                    className="gap-2"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    <span className="hidden sm:inline">Reject</span>
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteClick(s)}
                                className="gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Details Dialog */}
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {selected && (FORM_LABELS[selected.type as keyof typeof FORM_LABELS] || selected.type)}
              </DialogTitle>
              <DialogDescription>
                View form submission details
              </DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="space-y-6 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <User className="w-4 h-4" />
                      Submitted By
                    </div>
                    {selected.submittedByName ? (
                      <>
                        <p className="text-sm font-semibold">{selected.submittedByName}</p>
                        {selected.submittedByEmail && (
                          <p className="text-xs text-gray-500">{selected.submittedByEmail}</p>
                        )}
                        {selected.submittedByRollNumber && (
                          <p className="text-xs text-gray-500">Roll Number: {selected.submittedByRollNumber}</p>
                        )}
                        {selected.submittedByDepartment && (
                          <p className="text-xs text-gray-500">Department: {selected.submittedByDepartment}</p>
                        )}
                      </>
                    ) : selected.submittedBy ? (
                      <p className="text-sm text-gray-600">User ID: {selected.submittedBy}</p>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Not available</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <Calendar className="w-4 h-4" />
                      Submitted Date
                    </div>
                    <p className="text-sm">{new Date(selected.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-500">{new Date(selected.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FileText className="w-4 h-4" />
                    Form Details
                  </div>
                  <div className="bg-white border rounded-lg p-6">
                    <FormDataRenderer formType={selected.type} data={selected.data} />
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approve/Reject Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {approveAction === 'APPROVE' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
                {approveAction === 'APPROVE' ? 'Approve' : 'Reject'} Form Submission
              </DialogTitle>
              <DialogDescription>
                {submissionToApprove && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">
                      {FORM_LABELS[submissionToApprove.type as keyof typeof FORM_LABELS] || submissionToApprove.type}
                    </p>
                    {submissionToApprove.submittedByName && (
                      <p className="text-xs text-gray-600 mt-1">
                        Submitted by: {submissionToApprove.submittedByName}
                      </p>
                    )}
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="comments">Review Comments (Optional)</Label>
                <Textarea
                  id="comments"
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder={approveAction === 'APPROVE' ? 'Add any comments or notes...' : 'Provide reason for rejection...'}
                  className="mt-2"
                  rows={4}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setApproveDialogOpen(false);
                  setSubmissionToApprove(null);
                  setApproveAction(null);
                  setReviewComments('');
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApproveRejectConfirm}
                disabled={isProcessing}
                className={approveAction === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  approveAction === 'APPROVE' ? 'Approve' : 'Reject'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Delete Form Submission
              </AlertDialogTitle>
              <AlertDialogDescription className="pt-2">
                Are you sure you want to delete this form submission? This action cannot be undone.
                {submissionToDelete && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-900">
                      {FORM_LABELS[submissionToDelete.type as keyof typeof FORM_LABELS] || submissionToDelete.type}
                    </p>
                    {submissionToDelete.submittedByName && (
                      <p className="text-xs text-gray-600 mt-1">
                        Submitted by: {submissionToDelete.submittedByName}
                      </p>
                    )}
                    <p className="text-xs text-gray-600">
                      Date: {new Date(submissionToDelete.createdAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
