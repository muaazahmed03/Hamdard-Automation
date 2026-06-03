import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;

    // Check if it's a defense schedule report
    if (reportId.startsWith('report-')) {
      // Extract the actual ID
      const actualId = reportId.replace('report-', '');
      
      // Fetch all data for the group
      const groupId = request.nextUrl.searchParams.get('groupId');
      
      if (!groupId) {
        return NextResponse.json(
          { error: 'Group ID is required' },
          { status: 400 }
        );
      }

      // Fetch comprehensive project data
      const projectData = await fetchCompleteProjectData(groupId);

      // Generate PDF content (simplified - in production, use a library like pdfkit or puppeteer)
      const pdfContent = generatePDFContent(projectData);

      // Return as downloadable HTML file (can be saved as PDF by browser)
      return new NextResponse(pdfContent, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="project-report-${groupId}-${Date.now()}.html"`,
        },
      });
    }

    // For defense schedule reports
    const defenseSchedule = await db.defenseSchedule.findUnique({
      where: { id: reportId },
      include: {
        juryAssignments: {
          include: {
            defenseSchedule: true
          }
        }
      }
    });

    if (!defenseSchedule) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Get group ID from first assignment
    const firstAssignment = defenseSchedule.juryAssignments[0];
    if (!firstAssignment) {
      return NextResponse.json(
        { error: 'No assignments found for this report' },
        { status: 404 }
      );
    }

    const projectData = await fetchCompleteProjectData(firstAssignment.groupId);
    const pdfContent = generatePDFContent(projectData);

    return new NextResponse(pdfContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="defense-report-${reportId}-${Date.now()}.html"`,
      },
    });
  } catch (error) {
    console.error('Error downloading report:', error);
    return NextResponse.json(
      { error: 'Failed to download report' },
      { status: 500 }
    );
  }
}

async function fetchCompleteProjectData(groupId: string) {
  // Fetch group with members
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: true
        }
      },
      projects: {
        include: {
          supervisor: true,
          submissions: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      }
    }
  });

  if (!group) {
    throw new Error('Group not found');
  }

  // Fetch all project submissions
  const submissions = await db.projectSubmission.findMany({
    where: {
      project: {
        groupId: groupId
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Fetch evaluations
  const evaluations = await db.evaluation.findMany({
    where: { groupId },
    include: {
      announcement: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Fetch defense schedules for this group
  const juryAssignments = await db.juryAssignment.findMany({
    where: { groupId },
    include: {
      defenseSchedule: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Fetch notifications related to this group (as chat logs/meeting history)
  const notifications = await db.notification.findMany({
    where: {
      OR: [
        { relatedId: { in: group.projects.map(p => p.id) } },
        { message: { contains: group.name } }
      ]
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 100
  });

  return {
    group,
    submissions,
    evaluations,
    juryAssignments,
    notifications,
    generatedAt: new Date().toISOString()
  };
}

function generatePDFContent(data: any): string {
  // Generate comprehensive HTML report that can be saved as PDF
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Complete Project Report - ${data.group.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
    h3 { color: #374151; margin-top: 20px; }
    .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; }
    .info-item { margin: 10px 0; }
    .label { font-weight: bold; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
    th { background: #2563eb; color: white; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .success { background: #10b981; color: white; }
    .warning { background: #f59e0b; color: white; }
    .danger { background: #ef4444; color: white; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Complete Digital File - Project Report</h1>
  <div class="section">
    <p><strong>Generated:</strong> ${new Date(data.generatedAt).toLocaleString()}</p>
    <p><strong>Group:</strong> ${data.group.name}</p>
    <p><strong>Description:</strong> ${data.group.description || 'N/A'}</p>
  </div>

  <h2>1. Group Members</h2>
  <div class="section">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Joined Date</th>
        </tr>
      </thead>
      <tbody>
        ${data.group.members.map((member: any) => `
          <tr>
            <td>${member.user.name}</td>
            <td>${member.user.email}</td>
            <td>${member.role}</td>
            <td>${new Date(member.joinedAt).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <h2>2. Project Information</h2>
  ${data.group.projects.map((project: any) => `
    <div class="section">
      <h3>${project.title}</h3>
      <div class="info-item"><span class="label">Description:</span> ${project.description}</div>
      <div class="info-item"><span class="label">Status:</span> <span class="badge ${project.status === 'COMPLETED' ? 'success' : project.status === 'IN_PROGRESS' ? 'warning' : 'danger'}">${project.status}</span></div>
      <div class="info-item"><span class="label">Supervisor:</span> ${project.supervisor ? project.supervisor.name : 'Not Assigned'}</div>
      <div class="info-item"><span class="label">Domain:</span> ${project.domain || 'N/A'}</div>
      <div class="info-item"><span class="label">Created:</span> ${new Date(project.createdAt).toLocaleDateString()}</div>
    </div>
  `).join('')}

  <h2>3. All Documents, Reports, Codes, and Evaluation Records</h2>
  <div class="section">
    <h3>Project Submissions</h3>
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>File Type</th>
          <th>Status</th>
          <th>Supervisor Approval</th>
          <th>Submitted Date</th>
          <th>File Name</th>
        </tr>
      </thead>
      <tbody>
        ${data.submissions.map((sub: any) => `
          <tr>
            <td>${sub.title}</td>
            <td>${sub.fileType}</td>
            <td><span class="badge ${sub.status === 'APPROVED' ? 'success' : sub.status === 'REJECTED' ? 'danger' : 'warning'}">${sub.status}</span></td>
            <td>${sub.supervisorApprovalStatus || 'N/A'}</td>
            <td>${new Date(sub.createdAt).toLocaleDateString()}</td>
            <td>${sub.fileName || 'N/A'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <h2>4. Evaluations and Re-evaluation Details</h2>
  ${data.evaluations.map((evaluation: any) => `
    <div class="section">
      <h3>${evaluation.evaluationType} Evaluation</h3>
      <div class="info-item"><span class="label">Status:</span> ${evaluation.status}</div>
      <div class="info-item"><span class="label">Score:</span> ${evaluation.score || 'N/A'}</div>
      <div class="info-item"><span class="label">Attempt Number:</span> ${evaluation.attemptNumber}</div>
      <div class="info-item"><span class="label">Defense Date:</span> ${evaluation.defenseDate ? new Date(evaluation.defenseDate).toLocaleDateString() : 'N/A'}</div>
      <div class="info-item"><span class="label">Feedback:</span> ${evaluation.feedback || 'N/A'}</div>
      <div class="info-item"><span class="label">Supervisor Remarks:</span> ${evaluation.supervisorRemarks || 'N/A'}</div>
      <div class="info-item"><span class="label">Final Marks:</span> ${evaluation.finalMarks || 'N/A'}</div>
      <div class="info-item"><span class="label">Passed:</span> ${evaluation.isPassed ? 'Yes' : 'No'}</div>
      <div class="info-item"><span class="label">Needs Re-evaluation:</span> ${evaluation.needsReEvaluation ? 'Yes' : 'No'}</div>
    </div>
  `).join('')}

  <h2>5. Defense Schedules and Jury Assignments</h2>
  ${data.juryAssignments.map((assignment: any) => `
    <div class="section">
      <h3>${assignment.defenseSchedule.title}</h3>
      <div class="info-item"><span class="label">Defense Type:</span> ${assignment.defenseSchedule.defenseType}</div>
      <div class="info-item"><span class="label">Date:</span> ${new Date(assignment.defenseSchedule.defenseDate).toLocaleDateString()}</div>
      <div class="info-item"><span class="label">Time:</span> ${assignment.defenseSchedule.defenseTime}</div>
      <div class="info-item"><span class="label">Venue:</span> ${assignment.defenseSchedule.venue}</div>
      <div class="info-item"><span class="label">Evaluation Status:</span> ${assignment.evaluationStatus}</div>
      <div class="info-item"><span class="label">Marks:</span> ${assignment.marks || 'N/A'}</div>
      <div class="info-item"><span class="label">Feedback:</span> ${assignment.feedback || 'N/A'}</div>
    </div>
  `).join('')}

  <h2>6. Chat Logs, Meeting History, and Committee Remarks</h2>
  <div class="section">
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Title</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>
        ${data.notifications.map((notif: any) => `
          <tr>
            <td>${new Date(notif.createdAt).toLocaleString()}</td>
            <td>${notif.type}</td>
            <td>${notif.title}</td>
            <td>${notif.message}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <h2>7. Final Results</h2>
  <div class="section">
    ${data.evaluations.filter((e: any) => e.evaluationType === 'FYP_II' && e.isPassed).length > 0 ? `
      <h3>Final Evaluation Results</h3>
      ${data.evaluations.filter((e: any) => e.evaluationType === 'FYP_II').map((evaluation: any) => `
        <div class="info-item">
          <span class="label">Final Status:</span> ${evaluation.isPassed ? '<span class="badge success">PASSED</span>' : '<span class="badge danger">FAILED</span>'}
        </div>
        <div class="info-item"><span class="label">Final Marks:</span> ${evaluation.finalMarks || evaluation.score || 'N/A'}</div>
        <div class="info-item"><span class="label">Archive Path:</span> ${evaluation.archivePath || 'Not Archived'}</div>
      `).join('')}
    ` : '<p>Final evaluation not yet completed.</p>'}
  </div>

  <div class="footer">
    <p>This is a complete digital file containing all project documentation, evaluations, and records.</p>
    <p>Generated by FYP Portal System on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `;
  
  return html;
}

