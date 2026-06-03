import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'

export async function GET() {
  try {
    // First, let's check what proposals exist with supervisorApprovalStatus = 'APPROVED'
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
    console.log('[Admin Files API] Test - All files with supervisorApprovalStatus=APPROVED:', JSON.stringify(testQuery, null, 2));

    // Get ALL proposals, reports, and documentation files
    // Reports and documentation are automatically forwarded for tracking
    const allProposals = await prisma.projectSubmission.findMany({
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

    console.log(`[Admin Files API] Found ${allProposals.length} total files in database`);

    // Filter files based on type
    const submissions = allProposals.filter((submission: any) => {
      const fileTypeUpper = (submission.fileType || '').toUpperCase();
      
      // REPORT and DOCUMENTATION files are automatically forwarded - show all of them
      if (fileTypeUpper === 'REPORT' || fileTypeUpper === 'DOCUMENTATION') {
        // Only exclude if deleted or fully processed by admin
        const excludedStatuses = ['ADMIN_APPROVED', 'ADMIN_REJECTED'];
        if (excludedStatuses.includes(submission.status)) {
          console.log('[Admin Files API] Rejected: Report/Documentation already processed');
          return false;
        }
        console.log('[Admin Files API] ACCEPTED: Report/Documentation will be shown');
        return true;
      }
      
      // For PROPOSAL files, check supervisor/committee approval
      // Must be approved by supervisor OR approved by committee head
      const isSupervisorApproved = submission.status === 'APPROVED' || 
                                   submission.supervisorApprovalStatus === 'APPROVED';
      const isCommitteeApproved = submission.status === 'COMMITTEE_APPROVED';
      
      if (!isSupervisorApproved && !isCommitteeApproved) {
        console.log('[Admin Files API] Rejected: Not supervisor/committee approved');
        return false;
      }
      
      // Only exclude proposals already fully processed by admin (final decision made)
      const excludedStatuses = ['ADMIN_APPROVED', 'ADMIN_REJECTED'];
      const isExcluded = excludedStatuses.includes(submission.status);
      
      if (isExcluded) {
        console.log('[Admin Files API] Rejected: Already processed by admin');
        return false;
      }
      
      console.log('[Admin Files API] ACCEPTED: Proposal will be shown');
      return true;
    });
    
    console.log(`[Admin Files API] After filtering: ${submissions.length} supervisor-approved proposals for admin`);
    
    // Log each submission for debugging
    submissions.forEach((sub: any, idx: number) => {
      console.log(`[Admin Files API] Submission ${idx + 1}:`, {
        id: sub.id,
        fileName: sub.fileName,
        fileType: sub.fileType,
        status: sub.status,
        supervisorApprovalStatus: sub.supervisorApprovalStatus
      });
    });


    const formattedFiles = submissions.map((submission: any) => ({
      id: submission.id,
      fileName: submission.fileName || 'Unknown File',
      originalName: submission.fileName || 'Unknown File',
      fileType: submission.fileType,
      fileSize: submission.fileSize ? `${Math.round(submission.fileSize / 1024)} KB` : 'Unknown',
      fileSizeBytes: submission.fileSize,
      studentName: submission.student?.name || 'Unknown',
      studentEmail: submission.student?.email || '',
      studentId: submission.studentId,
      studentRollNumber: submission.student?.rollNumber || '',
      studentDepartment: submission.student?.department || 'Unknown',
      groupName: submission.project?.group?.name || 'No Group',
      groupId: submission.project?.groupId || null,
      department: submission.student?.department || 'Unknown',
      projectTitle: submission.project?.title || submission.title || 'No Project',
      projectId: submission.projectId,
      supervisorName: submission.project?.supervisor?.name || 'Unknown',
      supervisorEmail: submission.project?.supervisor?.email || '',
      uploadDate: new Date(submission.createdAt).toLocaleDateString(),
      uploadTime: new Date(submission.createdAt).toLocaleTimeString(),
      approvedDate: new Date(submission.updatedAt).toLocaleDateString(),
      status: submission.status || 'PENDING',
      supervisorApprovalStatus: submission.supervisorApprovalStatus || 'PENDING',
      supervisorRemarks: submission.supervisorRemarks,
      approvedBySupervisorAt: submission.approvedBySupervisorAt,
      description: submission.description,
      title: submission.title,
      domain: submission.domain,
      fileUrl: submission.fileUrl,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    }));

    return NextResponse.json(formattedFiles);
  } catch (error) {
    console.error('Error fetching admin files:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}
