import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { createNotification } from '@/lib/notification-service';

// GET all files for Committee Head
export async function GET(request: NextRequest) {
  console.log('[Committee Files API] GET request received');
  try {
    // First, let's check ALL proposals to see what exists
    const allProposalsCheck = await prisma.projectSubmission.findMany({
      where: {
        fileType: 'PROPOSAL'
      },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        status: true,
        supervisorApprovalStatus: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 20
    });
    console.log('[Committee Files API] ALL PROPOSALS IN DATABASE:', JSON.stringify(allProposalsCheck, null, 2));
    
    // Check what proposals have supervisorApprovalStatus = 'APPROVED'
    const testQuery = await prisma.projectSubmission.findMany({
      where: {
        supervisorApprovalStatus: 'APPROVED'
      },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        status: true,
        supervisorApprovalStatus: true
      },
      take: 10
    });
    console.log('[Committee Files API] Test - All files with supervisorApprovalStatus=APPROVED:', JSON.stringify(testQuery, null, 2));
    
    // Also check proposals with status = 'APPROVED'
    const statusApprovedCheck = await prisma.projectSubmission.findMany({
      where: {
        fileType: 'PROPOSAL',
        status: 'APPROVED'
      },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        status: true,
        supervisorApprovalStatus: true
      },
      take: 10
    });
    console.log('[Committee Files API] Proposals with status=APPROVED:', JSON.stringify(statusApprovedCheck, null, 2));

    // Get ALL proposals, reports, and documentation files
    // Reports and documentation are automatically forwarded for tracking
    const allProposalsForCommittee = await prisma.projectSubmission.findMany({
      where: {
        OR: [
          { fileType: 'PROPOSAL' },
          { fileType: 'proposal' },
          { fileType: 'REPORT' },
          { fileType: 'report' },
          { fileType: 'DOCUMENTATION' },
          { fileType: 'documentation' }
        ]
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            rollNumber: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            groupId: true,
            group: {
              select: {
                id: true,
                name: true,
              }
            },
            supervisor: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    console.log(`[Committee Files API] Found ${allProposalsForCommittee.length} total files in database`);

    // Filter files based on type
    const submissions = allProposalsForCommittee.filter((submission: any) => {
      const fileTypeUpper = (submission.fileType || '').toUpperCase();
      console.log('[Committee Files API] Checking file:', {
        id: submission.id,
        fileName: submission.fileName,
        status: submission.status,
        supervisorApprovalStatus: submission.supervisorApprovalStatus,
        fileType: submission.fileType
      });
      
      // REPORT and DOCUMENTATION files are automatically forwarded - show all of them
      if (fileTypeUpper === 'REPORT' || fileTypeUpper === 'DOCUMENTATION') {
        // Only exclude if deleted or fully processed by admin
        const excludedStatuses = ['ADMIN_APPROVED', 'ADMIN_REJECTED'];
        if (excludedStatuses.includes(submission.status)) {
          console.log('[Committee Files API] Rejected: Report/Documentation already processed by admin');
          return false;
        }
        console.log('[Committee Files API] ACCEPTED: Report/Documentation will be shown');
        return true;
      }
      
      // For PROPOSAL files, check supervisor approval
      // Must be approved by supervisor OR already approved by committee head
      // This allows committee head to see proposals they've already approved
      const isSupervisorApproved = submission.status === 'APPROVED' || 
                                   submission.supervisorApprovalStatus === 'APPROVED';
      const isCommitteeApproved = submission.status === 'COMMITTEE_APPROVED';
      const isCommitteeRejected = submission.status === 'COMMITTEE_REJECTED';
      
      console.log('[Committee Files API] Is supervisor approved?', isSupervisorApproved);
      console.log('[Committee Files API] Is committee approved?', isCommitteeApproved);
      console.log('[Committee Files API] Is committee rejected?', isCommitteeRejected);
      
      // Accept if supervisor approved, committee approved, or committee rejected (to see all decisions)
      if (!isSupervisorApproved && !isCommitteeApproved && !isCommitteeRejected) {
        console.log('[Committee Files API] Rejected: Not supervisor/committee approved');
        return false;
      }
      
      // Only exclude proposals fully approved/rejected by admin
      // Keep COMMITTEE_APPROVED and COMMITTEE_REJECTED visible so committee head can see their decisions
      // Proposals will only disappear when deleted or when admin makes final decision
      const excludedStatuses = ['ADMIN_APPROVED', 'ADMIN_REJECTED'];
      const isExcluded = excludedStatuses.includes(submission.status);
      
      if (isExcluded) {
        console.log('[Committee Files API] Rejected: Already processed by admin');
        return false;
      }
      
      console.log('[Committee Files API] ACCEPTED: Proposal will be shown');
      return true;
    });

    console.log(`[Committee Files API] After filtering out processed proposals: ${submissions.length} files for committee head`);
    
    // TEMPORARY: If no submissions found, return ALL proposals with status='APPROVED' for debugging
    if (submissions.length === 0) {
      console.log('[Committee Files API] WARNING: No submissions after filtering. Returning ALL proposals with status=APPROVED for debugging...');
      const allApproved = allProposalsForCommittee.filter((s: any) => s.status === 'APPROVED' || s.supervisorApprovalStatus === 'APPROVED');
      console.log('[Committee Files API] Found', allApproved.length, 'proposals with APPROVED status');
      // Use these for now to see if they show up
      const tempSubmissions = allApproved;
      console.log('[Committee Files API] Using', tempSubmissions.length, 'proposals for display');
      
      // Log each submission for debugging
      tempSubmissions.forEach((sub: any, idx: number) => {
        console.log(`[Committee Files API] Submission ${idx + 1}:`, {
          id: sub.id,
          fileName: sub.fileName,
          fileType: sub.fileType,
          status: sub.status,
          supervisorApprovalStatus: sub.supervisorApprovalStatus
        });
      });
      
      // Format and return these
      const formattedFiles = tempSubmissions.map((submission: any) => {
        try {
          const formatted = {
            id: submission.id,
            originalName: submission.fileName || submission.title || 'Unknown File',
            fileName: submission.fileName || submission.title || 'Unknown File',
            fileUrl: submission.fileUrl || null,
            fileType: submission.fileType || 'PROPOSAL',
            fileSize: submission.fileSize ? `${Math.round(submission.fileSize / 1024)} KB` : 'Unknown',
            fileSizeBytes: submission.fileSize || 0,
            studentName: submission.student?.name || 'Unknown',
            studentEmail: submission.student?.email || '',
            studentId: submission.studentId,
            groupName: submission.project?.group?.name || 'No Group',
            groupId: submission.project?.groupId || submission.projectId || null,
            projectTitle: submission.project?.title || submission.title || 'No Project',
            projectId: submission.projectId || null,
            supervisorName: submission.project?.supervisor?.name || 'Unknown',
            supervisorEmail: submission.project?.supervisor?.email || '',
            uploadDate: submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
            uploadTime: submission.createdAt ? new Date(submission.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString(),
            approvedDate: submission.updatedAt ? new Date(submission.updatedAt).toLocaleDateString() : new Date().toLocaleDateString(),
            status: submission.status || 'PENDING',
            description: submission.description || submission.title || '',
            department: submission.student?.department || 'Unknown',
          };
          return formatted;
        } catch (error) {
          console.error('[Committee Files API] Error formatting submission:', submission.id, error);
          return null;
        }
      }).filter((f: any) => f !== null);
      
      console.log(`[Committee Files API] Returning ${formattedFiles.length} formatted files (DEBUG MODE)`);
      return NextResponse.json(formattedFiles);
    }
    
    // Log each submission for debugging
    submissions.forEach((sub: any, idx: number) => {
      console.log(`[Committee Files API] Submission ${idx + 1}:`, {
        id: sub.id,
        fileName: sub.fileName,
        fileType: sub.fileType,
        status: sub.status,
        supervisorApprovalStatus: sub.supervisorApprovalStatus
      });
    });
    
    // Log debug info using the data we already have
    const debugProposals = allProposalsForCommittee.map((p: any) => ({
      id: p.id,
      fileName: p.fileName,
      status: p.status,
      supervisorApprovalStatus: p.supervisorApprovalStatus,
      fileType: p.fileType
    }));
    console.log('[Committee Files API] Debug - All proposals in DB:', JSON.stringify(debugProposals, null, 2));
    
    // Check specifically for approved proposals
    const approvedProposals = allProposalsForCommittee.filter((p: any) => 
      p.supervisorApprovalStatus === 'APPROVED' || 
      (p.status === 'APPROVED' && p.supervisorApprovalStatus !== 'REJECTED')
    );
    console.log('[Committee Files API] Debug - Approved proposals count:', approvedProposals.length);
    console.log('[Committee Files API] Debug - Approved proposals:', JSON.stringify(approvedProposals.map((p: any) => ({
      id: p.id,
      fileName: p.fileName,
      status: p.status,
      supervisorApprovalStatus: p.supervisorApprovalStatus
    })), null, 2));
    
    // If no submissions found but we have approved proposals, log warning
    if (submissions.length === 0 && approvedProposals.length > 0) {
      console.log('[Committee Files API] WARNING: Query returned 0 results but approved proposals exist!');
      console.log('[Committee Files API] This might be a filtering issue.');
    }
    
    console.log('[Committee Files API] Files breakdown:', {
      total: submissions.length,
      byType: submissions.reduce((acc: any, s: any) => {
        acc[s.fileType] = (acc[s.fileType] || 0) + 1;
        return acc;
      }, {}),
      byStatus: submissions.reduce((acc: any, s: any) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {}),
      bySupervisorApproval: submissions.reduce((acc: any, s: any) => {
        acc[s.supervisorApprovalStatus || 'null'] = (acc[s.supervisorApprovalStatus || 'null'] || 0) + 1;
        return acc;
      }, {})
    });

    const formattedFiles = submissions.map((submission: any) => {
      try {
        const formatted = {
          id: submission.id,
          originalName: submission.fileName || submission.title || 'Unknown File',
          fileName: submission.fileName || submission.title || 'Unknown File',
          fileUrl: submission.fileUrl || null,
          fileType: submission.fileType || 'PROPOSAL',
          fileSize: submission.fileSize ? `${Math.round(submission.fileSize / 1024)} KB` : 'Unknown',
          fileSizeBytes: submission.fileSize || 0,
          studentName: submission.student?.name || 'Unknown',
          studentEmail: submission.student?.email || '',
          studentId: submission.studentId,
          groupName: submission.project?.group?.name || 'No Group',
          groupId: submission.project?.groupId || submission.projectId || null,
          projectTitle: submission.project?.title || submission.title || 'No Project',
          projectId: submission.projectId || null,
          supervisorName: submission.project?.supervisor?.name || 'Unknown',
          supervisorEmail: submission.project?.supervisor?.email || '',
          uploadDate: submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
          uploadTime: submission.createdAt ? new Date(submission.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString(),
          approvedDate: submission.updatedAt ? new Date(submission.updatedAt).toLocaleDateString() : new Date().toLocaleDateString(),
          status: submission.status || 'PENDING',
          description: submission.description || submission.title || '',
          department: submission.student?.department || 'Unknown',
        };
        return formatted;
      } catch (error) {
        console.error('[Committee Files API] Error formatting submission:', submission.id, error);
        return null;
      }
    }).filter((f: any) => f !== null);

    console.log(`[Committee Files API] Returning ${formattedFiles.length} formatted files`);
    console.log('[Committee Files API] First file sample:', formattedFiles[0] || 'No files');
    
    // Include debug info in response if no files found
    if (formattedFiles.length === 0) {
      console.log('[Committee Files API] NO FILES FOUND - Debug info:');
      console.log('  - Total proposals in DB:', allProposalsForCommittee.length);
      console.log('  - Proposals with status=APPROVED:', allProposalsForCommittee.filter((p: any) => p.status === 'APPROVED').length);
      console.log('  - Proposals with supervisorApprovalStatus=APPROVED:', allProposalsForCommittee.filter((p: any) => p.supervisorApprovalStatus === 'APPROVED').length);
      console.log('  - Sample proposal statuses:', allProposalsForCommittee.slice(0, 5).map((p: any) => ({
        fileName: p.fileName,
        status: p.status,
        supervisorApprovalStatus: p.supervisorApprovalStatus,
        fileType: p.fileType
      })));
    }
    
    return NextResponse.json(formattedFiles);
  } catch (error) {
    console.error('[Committee Files API] Error fetching files:', error);
    console.error('[Committee Files API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: 'Failed to fetch files', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PATCH to approve/reject a file
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, status } = body;

    if (!fileId || !status) {
      return NextResponse.json(
        { error: 'File ID and status are required' },
        { status: 400 }
      );
    }

    if (!['PENDING', 'APPROVED', 'REJECTED', 'COMMITTEE_APPROVED', 'COMMITTEE_REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get submission details before updating
    const submission = await prisma.projectSubmission.findUnique({
      where: { id: fileId },
      include: {
        student: true,
        project: {
          include: {
            group: true,
          }
        }
      }
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const updatedSubmission = await prisma.projectSubmission.update({
      where: { id: fileId },
      data: { status } as any,
    });

    // Create notification for student (handle all file types)
    if (status === 'COMMITTEE_APPROVED' || status === 'APPROVED') {
      await createNotification({
        userId: submission.studentId,
        title: `${submission.fileType?.toUpperCase() || 'File'} Approved by Committee`,
        message: `Congratulations! Your ${submission.fileType || 'file'} "${submission.fileName}" has been approved by the committee head.`,
        type: 'success',
        link: '/student'
      });
    } else if (status === 'COMMITTEE_REJECTED' || status === 'REJECTED') {
      await createNotification({
        userId: submission.studentId,
        title: `${submission.fileType?.toUpperCase() || 'File'} Rejected by Committee`,
        message: `Your ${submission.fileType || 'file'} "${submission.fileName}" was rejected by the committee head. Please contact your supervisor for guidance.`,
        type: 'error',
        link: '/student'
      });
    }

    return NextResponse.json({
      success: true,
      message: `File ${status.toLowerCase()} successfully`,
      submission: updatedSubmission,
    });
  } catch (error) {
    console.error('Error updating file status:', error);
    return NextResponse.json(
      { error: 'Failed to update file status' },
      { status: 500 }
    );
  }
}
