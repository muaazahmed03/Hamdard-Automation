import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Generate and retrieve project archive
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    // Get user ID from header or query parameter (for new tab opens)
    const userId = request.headers.get('x-user-id') || request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch group with all related data
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                rollNumber: true,
                department: true,
              },
            },
          },
        },
        projects: {
          include: {
            supervisor: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
              },
            },
            submissions: {
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    rollNumber: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is a member of the group
    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const project = group.projects?.[0];
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if project is completed (FYP II accepted)
    if (project.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Project is not completed yet' },
        { status: 400 }
      );
    }

    // Fetch all defense schedules and evaluations
    const defenseSchedules = await db.defenseSchedule.findMany({
      where: {
        juryAssignments: {
          some: {
            groupId: groupId,
          },
        },
      },
      include: {
        juryAssignments: {
          where: {
            groupId: groupId,
          },
          include: {
            defenseSchedule: {
              select: {
                defenseType: true,
                defenseDate: true,
                defenseTime: true,
                venue: true,
              },
            },
          },
        },
      },
      orderBy: {
        defenseDate: 'asc',
      },
    });

    // Fetch chat logs (conversations involving group members)
    const groupMemberIds = group.members.map((m) => m.userId);
    const conversations = await db.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: {
              in: groupMemberIds,
            },
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            receiver: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    // Fetch meetings involving group members
    const meetings = await db.meeting.findMany({
      where: {
        attendees: {
          some: {
            userId: {
              in: groupMemberIds,
            },
          },
        },
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Fetch supervisor requests and remarks
    const supervisorRequests = await db.supervisorRequest.findMany({
      where: {
        projectId: project.id,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Compile archive data
    const archiveData = {
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        domain: project.domain,
        objectives: project.objectives,
        abstract: project.abstract,
        tools: project.tools,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      group: {
        id: group.id,
        name: group.name,
        members: group.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          rollNumber: m.user.rollNumber,
          department: m.user.department,
          joinedAt: m.joinedAt,
        })),
      },
      supervisor: project.supervisor
        ? {
            id: project.supervisor.id,
            name: project.supervisor.name,
            email: project.supervisor.email,
            department: project.supervisor.department,
          }
        : null,
      submissions: project.submissions.map((sub) => ({
        id: sub.id,
        title: sub.title,
        description: sub.description,
        fileType: sub.fileType,
        fileName: sub.fileName,
        fileUrl: sub.fileUrl,
        status: sub.status,
        supervisorApprovalStatus: sub.supervisorApprovalStatus,
        supervisorRemarks: sub.supervisorRemarks,
        adminRemarks: sub.adminRemarks,
        committeeRemarks: sub.committeeRemarks,
        conditionalApprovalRemarks: sub.conditionalApprovalRemarks,
        defenseAttempts: sub.defenseAttempts,
        defenseStatus: sub.defenseStatus,
        approvedBySupervisorAt: sub.approvedBySupervisorAt,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      })),
      defenses: defenseSchedules.map((schedule) => ({
        id: schedule.id,
        defenseType: schedule.defenseType,
        title: schedule.title,
        description: schedule.description,
        defenseDate: schedule.defenseDate,
        defenseTime: schedule.defenseTime,
        venue: schedule.venue,
        status: schedule.status,
        assignments: schedule.juryAssignments.map((assignment) => ({
          id: assignment.id,
          projectTitle: assignment.projectTitle,
          evaluationStatus: assignment.evaluationStatus,
          marks: assignment.marks,
          feedback: assignment.feedback,
          juryEvaluations: assignment.juryEvaluations
            ? JSON.parse(assignment.juryEvaluations)
            : null,
          createdAt: assignment.createdAt,
          updatedAt: assignment.updatedAt,
        })),
      })),
      chatLogs: conversations.map((conv) => ({
        id: conv.id,
        isGroup: conv.isGroup,
        groupName: conv.groupName,
        participants: conv.participants.map((p) => ({
          id: p.user.id,
          name: p.user.name,
          email: p.user.email,
          role: p.user.role,
        })),
        messages: conv.messages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          sender: {
            id: msg.sender.id,
            name: msg.sender.name,
            email: msg.sender.email,
          },
          receiver: {
            id: msg.receiver.id,
            name: msg.receiver.name,
            email: msg.receiver.email,
          },
          fileUrl: msg.fileUrl,
          fileName: msg.fileName,
          fileType: msg.fileType,
          createdAt: msg.createdAt,
        })),
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })),
      meetings: meetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        location: meeting.location,
        isOnline: meeting.isOnline,
        meetingLink: meeting.meetingLink,
        status: meeting.status,
        organizer: {
          id: meeting.organizer.id,
          name: meeting.organizer.name,
          email: meeting.organizer.email,
        },
        attendees: meeting.attendees.map((a) => ({
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
          status: a.status,
        })),
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
      })),
      supervisorRequests: supervisorRequests.map((req) => ({
        id: req.id,
        message: req.message,
        status: req.status,
        student: {
          id: req.student.id,
          name: req.student.name,
          email: req.student.email,
        },
        teacher: {
          id: req.teacher.id,
          name: req.teacher.name,
          email: req.teacher.email,
        },
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
      })),
      archiveGeneratedAt: new Date().toISOString(),
    };

    // Generate HTML document for viewing/printing as PDF
    const htmlContent = generateArchiveHTML(archiveData);

    // Return as HTML that can be viewed in browser or saved as PDF
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="Project_Archive_${group.name || 'Group'}_${new Date().toISOString().split('T')[0]}.html"`,
      },
    });
  } catch (error) {
    console.error('Error generating archive:', error);
    return NextResponse.json(
      { error: 'Failed to generate archive' },
      { status: 500 }
    );
  }
}

function generateArchiveHTML(data: any): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Complete Project Archive - ${data.group.name}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    body { 
      font-family: Arial, sans-serif; 
      margin: 20px; 
      line-height: 1.6; 
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 4px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 { 
      color: #2563eb; 
      margin: 0;
      font-size: 28px;
    }
    h2 { 
      color: #1e40af; 
      margin-top: 40px; 
      border-bottom: 2px solid #e5e7eb; 
      padding-bottom: 8px;
      font-size: 22px;
    }
    h3 { 
      color: #374151; 
      margin-top: 25px;
      font-size: 18px;
    }
    .section { 
      margin: 25px 0; 
      padding: 20px; 
      background: #f9fafb; 
      border-radius: 8px;
      border-left: 4px solid #2563eb;
    }
    .info-item { 
      margin: 12px 0; 
    }
    .label { 
      font-weight: bold; 
      color: #4b5563;
      display: inline-block;
      min-width: 150px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 20px 0;
      background: white;
    }
    th, td { 
      border: 1px solid #d1d5db; 
      padding: 12px; 
      text-align: left;
    }
    th { 
      background: #2563eb; 
      color: white;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    .badge { 
      display: inline-block; 
      padding: 4px 10px; 
      border-radius: 4px; 
      font-size: 12px;
      font-weight: bold;
    }
    .success { background: #10b981; color: white; }
    .warning { background: #f59e0b; color: white; }
    .danger { background: #ef4444; color: white; }
    .info { background: #3b82f6; color: white; }
    .footer { 
      margin-top: 50px; 
      padding-top: 20px; 
      border-top: 2px solid #e5e7eb; 
      color: #6b7280; 
      font-size: 12px;
      text-align: center;
    }
    .certificate {
      border: 3px solid #2563eb;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    }
    .certificate h2 {
      color: #1e40af;
      border: none;
      margin: 0 0 20px 0;
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2563eb;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .print-btn:hover {
      background: #1e40af;
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  
  <div class="header">
    <h1>🎓 Project Completion Archive</h1>
    <p><strong>Group:</strong> ${data.group.name}</p>
    <p><strong>Project:</strong> ${data.project.title}</p>
    <p><strong>Generated:</strong> ${new Date(data.archiveGeneratedAt).toLocaleString()}</p>
  </div>

  <!-- Completion Certificate -->
  <div class="certificate">
    <h2>🏆 Project Completion Certificate</h2>
    <p style="font-size: 18px; margin: 20px 0;">
      This certifies that the project <strong>"${data.project.title}"</strong><br/>
      has been successfully completed and evaluated.
    </p>
    <p style="font-size: 16px; margin: 15px 0;">
      <strong>Group:</strong> ${data.group.name}<br/>
      <strong>Completion Date:</strong> ${new Date(data.archiveGeneratedAt).toLocaleDateString()}
    </p>
    ${data.supervisor ? `<p style="font-size: 14px; margin-top: 20px;"><strong>Supervisor:</strong> ${data.supervisor.name}</p>` : ''}
  </div>

  <h2>1. Project Information</h2>
  <div class="section">
    <div class="info-item"><span class="label">Title:</span> ${data.project.title}</div>
    <div class="info-item"><span class="label">Description:</span> ${data.project.description || 'N/A'}</div>
    <div class="info-item"><span class="label">Domain:</span> ${data.project.domain || 'N/A'}</div>
    ${data.project.objectives ? `<div class="info-item"><span class="label">Objectives:</span> ${data.project.objectives}</div>` : ''}
    ${data.project.abstract ? `<div class="info-item"><span class="label">Abstract:</span> ${data.project.abstract}</div>` : ''}
    ${data.project.tools ? `<div class="info-item"><span class="label">Tools & Technologies:</span> ${data.project.tools}</div>` : ''}
    <div class="info-item"><span class="label">Status:</span> <span class="badge success">${data.project.status}</span></div>
    <div class="info-item"><span class="label">Created:</span> ${new Date(data.project.createdAt).toLocaleDateString()}</div>
  </div>

  <h2>2. Group Members</h2>
  <div class="section">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Roll Number</th>
          <th>Department</th>
          <th>Joined Date</th>
        </tr>
      </thead>
      <tbody>
        ${data.group.members.map((member: any) => `
          <tr>
            <td>${member.name || 'N/A'}</td>
            <td>${member.email || 'N/A'}</td>
            <td>${member.rollNumber || 'N/A'}</td>
            <td>${member.department || 'N/A'}</td>
            <td>${new Date(member.joinedAt).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  ${data.supervisor ? `
  <h2>3. Supervisor Information</h2>
  <div class="section">
    <div class="info-item"><span class="label">Name:</span> ${data.supervisor.name}</div>
    <div class="info-item"><span class="label">Email:</span> ${data.supervisor.email}</div>
    <div class="info-item"><span class="label">Department:</span> ${data.supervisor.department || 'N/A'}</div>
  </div>
  ` : ''}

  <h2>4. Project Submissions & Documents</h2>
  <div class="section">
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>File Type</th>
          <th>Status</th>
          <th>Supervisor Approval</th>
          <th>File Name</th>
          <th>Submitted Date</th>
        </tr>
      </thead>
      <tbody>
        ${data.submissions.map((sub: any) => `
          <tr>
            <td>${sub.title}</td>
            <td><span class="badge info">${sub.fileType}</span></td>
            <td><span class="badge ${sub.status === 'APPROVED' || sub.status === 'ADMIN_APPROVED' ? 'success' : sub.status === 'REJECTED' ? 'danger' : 'warning'}">${sub.status}</span></td>
            <td><span class="badge ${sub.supervisorApprovalStatus === 'APPROVED' ? 'success' : sub.supervisorApprovalStatus === 'REJECTED' ? 'danger' : 'warning'}">${sub.supervisorApprovalStatus || 'PENDING'}</span></td>
            <td>${sub.fileName || 'N/A'}</td>
            <td>${new Date(sub.createdAt).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <h2>5. Defense Evaluations</h2>
  ${data.defenses.map((defense: any) => `
    <div class="section">
      <h3>${defense.defenseType === 'PROPOSAL' ? 'Proposal Defense' : defense.defenseType === 'FYP_I' ? 'FYP-I Defense' : 'FYP-II Defense'}</h3>
      <div class="info-item"><span class="label">Title:</span> ${defense.title}</div>
      <div class="info-item"><span class="label">Date:</span> ${new Date(defense.defenseDate).toLocaleDateString()} at ${defense.defenseTime}</div>
      <div class="info-item"><span class="label">Venue:</span> ${defense.venue}</div>
      ${defense.description ? `<div class="info-item"><span class="label">Description:</span> ${defense.description}</div>` : ''}
      
      ${defense.assignments.map((assignment: any) => `
        <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 6px;">
          <div class="info-item"><span class="label">Project:</span> ${assignment.projectTitle || 'N/A'}</div>
          <div class="info-item"><span class="label">Status:</span> <span class="badge ${assignment.evaluationStatus === 'ACCEPTED' ? 'success' : assignment.evaluationStatus === 'REJECTED' || assignment.evaluationStatus === 'FAILED' ? 'danger' : 'warning'}">${assignment.evaluationStatus}</span></div>
          ${assignment.marks !== null ? `<div class="info-item"><span class="label">Marks:</span> <strong>${assignment.marks}/100</strong></div>` : ''}
          ${assignment.feedback ? `<div class="info-item"><span class="label">Feedback:</span> ${assignment.feedback}</div>` : ''}
          ${assignment.juryEvaluations ? `
            <div style="margin-top: 10px;">
              <strong>Jury Evaluations:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${Object.entries(assignment.juryEvaluations).map(([userId, evaluation]: [string, any]) => `
                  <li>${evaluation.status} - ${evaluation.feedback || 'No feedback'} (${new Date(evaluation.evaluatedAt).toLocaleDateString()})</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `).join('')}

  <h2>6. Chat Logs & Communications</h2>
  <div class="section">
    ${data.chatLogs.length > 0 ? data.chatLogs.map((conv: any) => `
      <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 6px;">
        <h4>${conv.isGroup ? `Group: ${conv.groupName || 'N/A'}` : 'Direct Conversation'}</h4>
        <p><strong>Participants:</strong> ${conv.participants.map((p: any) => p.name).join(', ')}</p>
        <p><strong>Messages:</strong> ${conv.messages.length}</p>
        <details style="margin-top: 10px;">
          <summary style="cursor: pointer; color: #2563eb;">View Messages</summary>
          <div style="margin-top: 10px; max-height: 300px; overflow-y: auto;">
            ${conv.messages.map((msg: any) => `
              <div style="margin: 10px 0; padding: 10px; background: #f9fafb; border-radius: 4px;">
                <strong>${msg.sender.name}</strong> <span style="color: #6b7280; font-size: 12px;">(${new Date(msg.createdAt).toLocaleString()})</span>
                <p style="margin: 5px 0;">${msg.content}</p>
                ${msg.fileName ? `<p style="font-size: 12px; color: #6b7280;">📎 ${msg.fileName}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </details>
      </div>
    `).join('') : '<p>No chat logs available.</p>'}
  </div>

  <h2>7. Meeting History</h2>
  <div class="section">
    ${data.meetings.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Date & Time</th>
            <th>Location</th>
            <th>Status</th>
            <th>Organizer</th>
          </tr>
        </thead>
        <tbody>
          ${data.meetings.map((meeting: any) => `
            <tr>
              <td>${meeting.title}</td>
              <td>${new Date(meeting.startTime).toLocaleString()}</td>
              <td>${meeting.isOnline ? meeting.meetingLink || 'Online' : meeting.location || 'N/A'}</td>
              <td><span class="badge ${meeting.status === 'COMPLETED' ? 'success' : meeting.status === 'CANCELLED' ? 'danger' : 'warning'}">${meeting.status}</span></td>
              <td>${meeting.organizer.name}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p>No meetings recorded.</p>'}
  </div>

  ${data.supervisorRequests.length > 0 ? `
  <h2>8. Supervisor Requests</h2>
  <div class="section">
    <table>
      <thead>
        <tr>
          <th>Student</th>
          <th>Teacher</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${data.supervisorRequests.map((req: any) => `
          <tr>
            <td>${req.student.name}</td>
            <td>${req.teacher.name}</td>
            <td><span class="badge ${req.status === 'ACCEPTED' ? 'success' : req.status === 'REJECTED' ? 'danger' : 'warning'}">${req.status}</span></td>
            <td>${new Date(req.createdAt).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p><strong>Complete Digital Archive</strong></p>
    <p>This document contains all project records, documents, communications, and evaluation details.</p>
    <p>Generated on ${new Date(data.archiveGeneratedAt).toLocaleString()}</p>
    <p style="margin-top: 10px; font-size: 10px; color: #9ca3af;">
      This archive is generated for audit and accreditation purposes. All records are permanent and verifiable.
    </p>
  </div>
</body>
</html>
  `;
  return html;
}

