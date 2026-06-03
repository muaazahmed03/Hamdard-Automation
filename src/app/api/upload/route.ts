import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { createNotification, NotificationTemplates, notifyUsersByRole } from '@/lib/notification-service';
import { db as prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string;
    const fileType = formData.get('fileType') as string;
    const type = formData.get('type') as string; // 'policy' or other types
    const userId = formData.get('userId') as string;
    const userName = formData.get('userName') as string;
    const projectTitle = formData.get('projectTitle') as string;
    const projectId = formData.get('projectId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Determine upload directory based on type
    let uploadSubDir = 'uploads';
    if (type === 'policy') {
      uploadSubDir = 'uploads/policies';
    } else if (type?.toLowerCase() === 'proposal') {
      uploadSubDir = 'uploads/proposals';
    } else if (type?.toLowerCase() === 'transcript') {
      uploadSubDir = 'uploads/transcripts';
    } else if (type?.toLowerCase() === 'proof') {
      uploadSubDir = 'uploads/proofs';
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', uploadSubDir);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Create a unique filename to avoid conflicts
    const timestamp = Date.now();
    // Include fileType in filename for better categorization
    const fileTypePrefix = fileType ? `${fileType}_` : '';
    const fileName = `${timestamp}_${fileTypePrefix}${file.name}`;
    const filePath = join(uploadsDir, fileName);

    // Convert file to bytes and save to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the file URL and metadata
    const fileUrl = `/${uploadSubDir}/${fileName}`;
    
    // Save to database if user info is provided (not for policy uploads)
    if (userId && type !== 'policy') {
      // For proposals, try to find or create a project if possible, otherwise allow null
      let finalProjectId = projectId || undefined;
      let supervisorId = null;
      
      if (!finalProjectId && fileType?.toLowerCase() === 'proposal') {
        // First, try to find existing project by title in student's group
        if (projectTitle) {
          const existingProject = await prisma.project.findFirst({
            where: {
              title: projectTitle,
              group: {
                members: {
                  some: { userId: userId }
                }
              }
            },
            include: {
              supervisor: true
            }
          });
          if (existingProject) {
            finalProjectId = existingProject.id;
            supervisorId = existingProject.supervisor?.id || null;
          }
        }
        
        // If no project found, try to find supervisor from student's group projects
        if (!supervisorId) {
          const studentGroup = await prisma.groupMember.findFirst({
            where: { userId: userId },
            include: {
              group: {
                include: {
                  projects: {
                    where: { supervisorId: { not: null } },
                    include: { supervisor: true },
                    take: 1
                  },
                  members: {
                    select: { userId: true }
                  }
                }
              }
            }
          });
          
          if (studentGroup?.group?.projects?.[0]?.supervisor) {
            supervisorId = studentGroup.group.projects[0].supervisor.id;
            // Optionally link to this project if no projectId was provided
            if (!finalProjectId && studentGroup.group.projects[0].id) {
              finalProjectId = studentGroup.group.projects[0].id;
            }
          }
          
          // If still no supervisor found, check for accepted supervisor requests for any group member
          if (!supervisorId && studentGroup?.group) {
            const groupMemberIds = studentGroup.group.members.map(m => m.userId);
            const acceptedSupervisorRequest = await prisma.supervisorRequest.findFirst({
              where: {
                studentId: { in: groupMemberIds },
                status: 'ACCEPTED'
              },
              include: {
                teacher: {
                  select: { id: true }
                }
              },
              orderBy: {
                updatedAt: 'desc' // Get the most recent accepted request
              }
            });
            
            if (acceptedSupervisorRequest?.teacher) {
              supervisorId = acceptedSupervisorRequest.teacher.id;
              console.log(`Found supervisor from accepted request: ${supervisorId}`);
            }
          }
        }
      } else if (finalProjectId) {
        // If we have a projectId, get supervisor from project
        const project = await prisma.project.findUnique({
          where: { id: finalProjectId },
          include: { supervisor: true }
        });
        supervisorId = project?.supervisor?.id || null;
      } else if (fileType?.toLowerCase() === 'proposal') {
        // Even if no projectId, try to find supervisor from accepted supervisor requests
        const studentGroup = await prisma.groupMember.findFirst({
          where: { userId: userId },
          include: {
            group: {
              include: {
                members: {
                  select: { userId: true }
                }
              }
            }
          }
        });
        
        if (studentGroup?.group) {
          const groupMemberIds = studentGroup.group.members.map(m => m.userId);
          const acceptedSupervisorRequest = await prisma.supervisorRequest.findFirst({
            where: {
              studentId: { in: groupMemberIds },
              status: 'ACCEPTED'
            },
            include: {
              teacher: {
                select: { id: true }
              }
            },
            orderBy: {
              updatedAt: 'desc'
            }
          });
          
          if (acceptedSupervisorRequest?.teacher) {
            supervisorId = acceptedSupervisorRequest.teacher.id;
            console.log(`Found supervisor from accepted request (no project): ${supervisorId}`);
          }
        }
      }
      // Determine initial status based on file type
      // Normalize fileType to uppercase for consistency
      const fileTypeUpper = (fileType || 'OTHER').toUpperCase();
      let initialStatus = 'PENDING';
      let supervisorApprovalStatus = null;
      
      // For REPORT and DOCUMENTATION, automatically approve and forward to committee/admin
      // These don't need supervisor approval - they're for tracking purposes
      if (fileTypeUpper === 'REPORT' || fileTypeUpper === 'DOCUMENTATION') {
        initialStatus = 'APPROVED'; // Automatically approved, forwarded to committee/admin
        supervisorApprovalStatus = 'APPROVED';
      } else if (fileTypeUpper === 'PROPOSAL') {
        // Proposals need supervisor approval first
        supervisorApprovalStatus = 'PENDING';
      }
      
      // Build data object, only include projectId if present
      const submissionData: any = {
        studentId: userId,
        title: projectTitle || file.name,
        description: description || '',
        fileUrl,
        fileName: file.name,
        fileType: fileTypeUpper, // Store as uppercase for consistency
        fileSize: file.size,
        status: initialStatus,
        isSubmitted: true,
      };
      
      // Set supervisorApprovalStatus based on file type
      if (supervisorApprovalStatus !== null) {
        submissionData.supervisorApprovalStatus = supervisorApprovalStatus;
        if (supervisorApprovalStatus === 'APPROVED') {
          submissionData.approvedBySupervisorAt = new Date();
        }
      }
      
      if (finalProjectId) {
        submissionData.projectId = finalProjectId;
      }
      const createdSubmission = await prisma.projectSubmission.create({
        data: submissionData,
      });
      const submissionId = createdSubmission.id;
      console.log(`File saved to database: ${file.name} for student ${userId} with ID: ${submissionId}`);
      
      // Notify supervisor if this is a proposal (needs approval)
      if (fileTypeUpper === 'PROPOSAL') {
        if (supervisorId) {
          try {
            console.log(`Sending notification to supervisor ${supervisorId} for proposal from student ${userId}`);
            await createNotification({
              userId: supervisorId,
              title: 'New Proposal Submitted',
              message: `${userName || 'A student'} has submitted a proposal "${projectTitle || file.name}". Please review it in Uploaded Files.`,
              type: 'info',
              link: '/teacher'
            });
            console.log(`Notification sent successfully to supervisor ${supervisorId}`);
          } catch (notifError) {
            console.error('Error notifying supervisor:', notifError);
          }
        } else {
          console.warn(`No supervisor found for student ${userId} when uploading proposal. Student may not have an assigned supervisor yet.`);
        }
      } else if (fileTypeUpper === 'REPORT' || fileTypeUpper === 'DOCUMENTATION') {
        // For REPORT and DOCUMENTATION, notify committee head and admin for tracking
        try {
          await notifyUsersByRole(['COMMITTEE_HEAD', 'ADMIN'], {
            title: `New ${fileTypeUpper === 'REPORT' ? 'Report' : 'Documentation'} Submitted`,
            message: `${userName || 'A student'} has submitted a ${fileTypeUpper.toLowerCase()} "${projectTitle || file.name}" for tracking.`,
            type: 'info',
            category: 'file',
            relatedId: submissionId
          });
          console.log(`Notification sent to committee head and admin for ${fileTypeUpper} from student ${userId}`);
        } catch (notifError) {
          console.error('Error notifying committee head/admin:', notifError);
        }
      }
    } else if (type !== 'policy') {
      console.warn('userId not provided for file upload, file will not be tracked');
    }
    
    // Only notify supervisor about new file uploads
    // Do NOT notify admin/committee head until supervisor approves
    // Skip notifications for policy uploads
    // Supervisor notification is already handled above for proposals
    
    return NextResponse.json({ 
      url: fileUrl,
      fileUrl: fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      description: description,
      documentType: fileType,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}