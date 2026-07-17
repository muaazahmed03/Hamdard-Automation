import PDFDocument from 'pdfkit';

type PdfDoc = InstanceType<typeof PDFDocument>;

const COLORS = {
  primary: '#2563eb',
  heading: '#1e40af',
  text: '#111827',
  muted: '#6b7280',
  border: '#d1d5db',
  rowAlt: '#f3f4f6',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
};

const PAGE_MARGIN = 50;

function contentWidth(doc: PdfDoc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function ensureSpace(doc: PdfDoc, needed: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) {
    doc.addPage();
  }
}

function formatDate(value?: string | Date | null) {
  if (!value) return 'N/A';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return 'N/A';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function safe(value: unknown, fallback = 'N/A') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function documentTitle(doc: PdfDoc, title: string, subtitle?: string) {
  doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(22).text(title, {
    align: 'left',
  });
  if (subtitle) {
    doc.moveDown(0.2);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(11).text(subtitle);
  }
  doc.moveDown(0.4);
  doc
    .strokeColor(COLORS.primary)
    .lineWidth(2)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.8);
}

function sectionHeading(doc: PdfDoc, text: string) {
  ensureSpace(doc, 40);
  doc.moveDown(0.6);
  doc.fillColor(COLORS.heading).font('Helvetica-Bold').fontSize(14).text(text);
  doc.moveDown(0.1);
  doc
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.5);
}

function keyValue(doc: PdfDoc, label: string, value: string) {
  ensureSpace(doc, 20);
  const labelText = `${label}: `;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text);
  const labelWidth = doc.widthOfString(labelText);
  const startX = doc.page.margins.left;
  const y = doc.y;
  doc.text(labelText, startX, y, { continued: false, width: labelWidth });
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(COLORS.text)
    .text(value, startX + labelWidth, y, {
      width: contentWidth(doc) - labelWidth,
    });
  doc.moveDown(0.2);
}

function paragraph(doc: PdfDoc, text: string) {
  ensureSpace(doc, 20);
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(text, {
    width: contentWidth(doc),
  });
  doc.moveDown(0.3);
}

function mutedNote(doc: PdfDoc, text: string) {
  ensureSpace(doc, 20);
  doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLORS.muted).text(text, {
    width: contentWidth(doc),
  });
  doc.moveDown(0.3);
}

type Column = { header: string; width: number; key: string };

function drawTable(doc: PdfDoc, columns: Column[], rows: Record<string, string>[]) {
  const totalRatio = columns.reduce((sum, c) => sum + c.width, 0);
  const usableWidth = contentWidth(doc);
  const widths = columns.map((c) => (c.width / totalRatio) * usableWidth);
  const startX = doc.page.margins.left;
  const cellPadding = 5;
  const fontSize = 9;

  const measureRowHeight = (values: string[], bold: boolean) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
    let maxHeight = 0;
    values.forEach((val, i) => {
      const h = doc.heightOfString(val || '-', {
        width: widths[i] - cellPadding * 2,
      });
      if (h > maxHeight) maxHeight = h;
    });
    return maxHeight + cellPadding * 2;
  };

  const drawRow = (values: string[], bold: boolean, bg?: string) => {
    const rowHeight = measureRowHeight(values, bold);
    ensureSpace(doc, rowHeight);
    const y = doc.y;
    if (bg) {
      doc.rect(startX, y, usableWidth, rowHeight).fill(bg);
    }
    let x = startX;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
    doc.fillColor(bold ? '#ffffff' : COLORS.text);
    values.forEach((val, i) => {
      doc.text(val || '-', x + cellPadding, y + cellPadding, {
        width: widths[i] - cellPadding * 2,
      });
      x += widths[i];
    });
    doc
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .rect(startX, y, usableWidth, rowHeight)
      .stroke();
    doc.y = y + rowHeight;
  };

  drawRow(
    columns.map((c) => c.header),
    true,
    COLORS.primary,
  );
  rows.forEach((row, index) => {
    drawRow(
      columns.map((c) => row[c.key] ?? '-'),
      false,
      index % 2 === 1 ? COLORS.rowAlt : undefined,
    );
  });
  doc.moveDown(0.5);
}

function footer(doc: PdfDoc) {
  doc.moveDown(1.5);
  ensureSpace(doc, 40);
  doc
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.4);
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(
      `Generated by FYP Portal System on ${new Date().toLocaleString()}`,
      { width: contentWidth(doc) },
    );
}

function createPdfBuffer(build: (doc: PdfDoc) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: PAGE_MARGIN,
        bufferPages: true,
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      build(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export interface CompleteProjectData {
  group: {
    name?: string;
    description?: string | null;
    members?: Array<{
      user?: { name?: string; email?: string };
      role?: string;
      joinedAt?: string | Date;
    }>;
    projects?: Array<{
      title?: string;
      description?: string;
      status?: string;
      domain?: string | null;
      createdAt?: string | Date;
      supervisor?: { name?: string } | null;
    }>;
  };
  submissions?: Array<{
    title?: string;
    fileType?: string;
    status?: string;
    supervisorApprovalStatus?: string | null;
    createdAt?: string | Date;
    fileName?: string | null;
  }>;
  evaluations?: Array<{
    evaluationType?: string;
    status?: string;
    score?: number | null;
    attemptNumber?: number;
    defenseDate?: string | Date | null;
    feedback?: string | null;
    finalMarks?: number | null;
    isPassed?: boolean;
  }>;
  juryAssignments?: Array<{
    defenseSchedule?: {
      title?: string;
      defenseType?: string;
      defenseDate?: string | Date;
      defenseTime?: string;
      venue?: string;
    };
    evaluationStatus?: string;
    marks?: number | null;
    feedback?: string | null;
  }>;
  notifications?: Array<{
    createdAt?: string | Date;
    type?: string;
    title?: string;
    message?: string;
  }>;
  generatedAt?: string;
}

export function generateCommitteeReportPdf(data: CompleteProjectData): Promise<Buffer> {
  return createPdfBuffer((doc) => {
    const groupName = safe(data.group?.name, 'Group');
    documentTitle(
      doc,
      'Committee Project Report',
      `${groupName} · Generated ${formatDateTime(data.generatedAt)}`,
    );

    keyValue(doc, 'Group', groupName);
    keyValue(doc, 'Description', safe(data.group?.description));

    sectionHeading(doc, '1. Group Members');
    const members = data.group?.members ?? [];
    if (members.length) {
      drawTable(
        doc,
        [
          { header: 'Name', width: 3, key: 'name' },
          { header: 'Email', width: 4, key: 'email' },
          { header: 'Role', width: 2, key: 'role' },
          { header: 'Joined', width: 2, key: 'joined' },
        ],
        members.map((m) => ({
          name: safe(m.user?.name),
          email: safe(m.user?.email),
          role: safe(m.role),
          joined: formatDate(m.joinedAt),
        })),
      );
    } else {
      mutedNote(doc, 'No members recorded.');
    }

    sectionHeading(doc, '2. Project Information');
    const projects = data.group?.projects ?? [];
    if (projects.length) {
      projects.forEach((project) => {
        keyValue(doc, 'Title', safe(project.title));
        keyValue(doc, 'Status', safe(project.status));
        keyValue(doc, 'Supervisor', safe(project.supervisor?.name, 'Not Assigned'));
        keyValue(doc, 'Domain', safe(project.domain));
        keyValue(doc, 'Created', formatDate(project.createdAt));
        if (project.description) {
          paragraph(doc, safe(project.description));
        }
        doc.moveDown(0.3);
      });
    } else {
      mutedNote(doc, 'No project information available.');
    }

    sectionHeading(doc, '3. Project Submissions');
    const submissions = data.submissions ?? [];
    if (submissions.length) {
      drawTable(
        doc,
        [
          { header: 'Title', width: 3, key: 'title' },
          { header: 'Type', width: 2, key: 'type' },
          { header: 'Status', width: 2, key: 'status' },
          { header: 'Supervisor', width: 2, key: 'supervisor' },
          { header: 'Date', width: 2, key: 'date' },
        ],
        submissions.map((sub) => ({
          title: safe(sub.title),
          type: safe(sub.fileType),
          status: safe(sub.status),
          supervisor: safe(sub.supervisorApprovalStatus),
          date: formatDate(sub.createdAt),
        })),
      );
    } else {
      mutedNote(doc, 'No submissions found.');
    }

    sectionHeading(doc, '4. Evaluations');
    const evaluations = data.evaluations ?? [];
    if (evaluations.length) {
      evaluations.forEach((evaluation) => {
        keyValue(doc, 'Type', safe(evaluation.evaluationType));
        keyValue(doc, 'Status', safe(evaluation.status));
        keyValue(doc, 'Score', safe(evaluation.score));
        keyValue(doc, 'Attempt', safe(evaluation.attemptNumber));
        keyValue(doc, 'Final Marks', safe(evaluation.finalMarks));
        keyValue(doc, 'Passed', evaluation.isPassed ? 'Yes' : 'No');
        if (evaluation.feedback) keyValue(doc, 'Feedback', safe(evaluation.feedback));
        doc.moveDown(0.3);
      });
    } else {
      mutedNote(doc, 'No evaluations recorded.');
    }

    sectionHeading(doc, '5. Defense Schedules & Jury Assignments');
    const juryAssignments = data.juryAssignments ?? [];
    if (juryAssignments.length) {
      drawTable(
        doc,
        [
          { header: 'Defense', width: 3, key: 'defense' },
          { header: 'Date', width: 2, key: 'date' },
          { header: 'Venue', width: 2, key: 'venue' },
          { header: 'Status', width: 3, key: 'status' },
          { header: 'Marks', width: 1, key: 'marks' },
        ],
        juryAssignments.map((assignment) => ({
          defense: safe(assignment.defenseSchedule?.defenseType),
          date: formatDate(assignment.defenseSchedule?.defenseDate),
          venue: safe(assignment.defenseSchedule?.venue),
          status: safe(assignment.evaluationStatus),
          marks: safe(assignment.marks),
        })),
      );
    } else {
      mutedNote(doc, 'No jury assignments found.');
    }

    footer(doc);
  });
}

export interface ArchiveResultData {
  project: {
    title?: string;
    description?: string;
    domain?: string | null;
    status?: string;
    createdAt?: string | Date;
  };
  group: {
    name?: string;
    members?: Array<{
      name?: string;
      email?: string;
      rollNumber?: string | null;
      department?: string | null;
    }>;
  };
  supervisor?: { name?: string; email?: string; department?: string | null } | null;
  submissions?: Array<{
    title?: string;
    fileType?: string;
    status?: string;
    createdAt?: string | Date;
  }>;
  defenses?: Array<{
    defenseType?: string;
    defenseDate?: string | Date;
    venue?: string;
    assignments?: Array<{
      evaluationStatus?: string;
      marks?: number | null;
      feedback?: string | null;
    }>;
  }>;
  archiveGeneratedAt?: string;
}

export function generateArchiveResultPdf(data: ArchiveResultData): Promise<Buffer> {
  return createPdfBuffer((doc) => {
    documentTitle(
      doc,
      'Final Project Result',
      `${safe(data.project?.title, 'Project')} · Generated ${formatDateTime(
        data.archiveGeneratedAt,
      )}`,
    );

    sectionHeading(doc, 'Project Overview');
    keyValue(doc, 'Title', safe(data.project?.title));
    keyValue(doc, 'Group', safe(data.group?.name));
    keyValue(doc, 'Status', safe(data.project?.status));
    keyValue(doc, 'Domain', safe(data.project?.domain));
    keyValue(doc, 'Supervisor', safe(data.supervisor?.name, 'Not Assigned'));
    if (data.project?.description) {
      paragraph(doc, safe(data.project.description));
    }

    sectionHeading(doc, 'Group Members');
    const members = data.group?.members ?? [];
    if (members.length) {
      drawTable(
        doc,
        [
          { header: 'Name', width: 3, key: 'name' },
          { header: 'Roll No', width: 2, key: 'roll' },
          { header: 'Email', width: 4, key: 'email' },
        ],
        members.map((m) => ({
          name: safe(m.name),
          roll: safe(m.rollNumber),
          email: safe(m.email),
        })),
      );
    } else {
      mutedNote(doc, 'No members recorded.');
    }

    sectionHeading(doc, 'Defense Results');
    const defenses = data.defenses ?? [];
    const resultRows: Record<string, string>[] = [];
    defenses.forEach((defense) => {
      const assignment = defense.assignments?.[0];
      resultRows.push({
        type: safe(defense.defenseType),
        date: formatDate(defense.defenseDate),
        status: safe(assignment?.evaluationStatus),
        marks: assignment?.marks != null ? `${assignment.marks}/100` : 'N/A',
      });
    });
    if (resultRows.length) {
      drawTable(
        doc,
        [
          { header: 'Defense', width: 3, key: 'type' },
          { header: 'Date', width: 2, key: 'date' },
          { header: 'Result', width: 3, key: 'status' },
          { header: 'Marks', width: 2, key: 'marks' },
        ],
        resultRows,
      );
    } else {
      mutedNote(doc, 'No defense results available.');
    }

    sectionHeading(doc, 'Submitted Documents');
    const submissions = data.submissions ?? [];
    if (submissions.length) {
      drawTable(
        doc,
        [
          { header: 'Title', width: 4, key: 'title' },
          { header: 'Type', width: 2, key: 'type' },
          { header: 'Status', width: 2, key: 'status' },
          { header: 'Date', width: 2, key: 'date' },
        ],
        submissions.map((sub) => ({
          title: safe(sub.title),
          type: safe(sub.fileType),
          status: safe(sub.status),
          date: formatDate(sub.createdAt),
        })),
      );
    } else {
      mutedNote(doc, 'No documents submitted.');
    }

    footer(doc);
  });
}

export function generateGenericReportPdf(
  title: string,
  generatedAt?: string,
): Promise<Buffer> {
  return createPdfBuffer((doc) => {
    documentTitle(doc, title, `Generated ${formatDateTime(generatedAt)}`);
    mutedNote(
      doc,
      'This report type does not target a specific group, so no detailed project records are available. Select a group when generating a Project Summary or Group Report for full details.',
    );
    footer(doc);
  });
}
