import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile } from 'fs/promises';
import path from 'path';

// POST /api/proposals/submit - Submit a project proposal
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    // Verify user is a student
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
      },
    });

    // Fetch the student's active group
    const groupMembership = await db.groupMember.findFirst({
      where: {
        userId: userId,
        group: { isActive: true }
      },
      include: { group: true }
    });
    const groupId = groupMembership?.groupId || null;

    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can submit proposals' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const domain = formData.get('domain') as string;
    const objectives = formData.get('objectives') as string;
    const abstract = formData.get('abstract') as string;
    const tools = formData.get('tools') as string;
    const supervisorId = formData.get('supervisorId') as string;
    const linkedFacultyIdeaId = formData.get('linkedFacultyIdeaId') as string | null;
    const isFacultyProposed = formData.get('isFacultyProposed') === 'true';
    const documentFile = formData.get('proposalDocument') as File | null;

    if (!title || !description || !supervisorId) {
      return NextResponse.json(
        { error: 'Title, description, and supervisor are required' },
        { status: 400 }
      );
    }

    // Check supervisor capacity
    const activeProjects = await db.project.count({
      where: {
        supervisorId,
        status: {
          in: ['PROPOSED', 'APPROVED', 'IN_PROGRESS'],
        },
      },
    });

    const supervisor = await db.user.findUnique({
      where: { id: supervisorId },
      include: { teacherProfile: true },
    });

    const capacity = (supervisor?.teacherProfile as any)?.supervisionCapacity || 4;
    if (activeProjects >= capacity) {
      return NextResponse.json(
        { 
          error: 'Supervisor has reached capacity',
          message: `This supervisor can only supervise ${capacity} projects and currently has ${activeProjects} active projects.`
        },
        { status: 400 }
      );
    }

    // Handle document upload
    let documentPath = null;
    if (documentFile) {
      const bytes = await documentFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `proposal_${Date.now()}_${documentFile.name}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'proposals');
      documentPath = `/uploads/proposals/${fileName}`;

      // Ensure the directory exists
      const fs = await import('fs/promises');
      const fsSync = await import('fs');
      if (!fsSync.existsSync(uploadDir)) {
        await fs.mkdir(uploadDir, { recursive: true });
      }

      await writeFile(path.join(uploadDir, fileName), buffer);
    }

    // Create project with PROPOSED status (requires supervisor review)
    const project = await db.project.create({
      data: {
        title,
        description,
        domain: domain || null,
        objectives: objectives || null,
        abstract: abstract || null,
        tools: tools || null,
        proposalDocument: documentPath,
        isFacultyProposed: isFacultyProposed || false,
        status: 'PROPOSED', // Requires supervisor review
        teacherId: userId,
        supervisorId,
        groupId, // Associate project with student's group
      },
      include: {
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create a supervisor request for tracking
    await db.supervisorRequest.create({
      data: {
        studentId: userId,
        teacherId: supervisorId,
        projectId: project.id,
        status: 'PENDING',
        message: `Proposal: ${title}`,
      },
    });

    // Create notification for supervisor
    await db.notification.create({
      data: {
        userId: supervisorId,
        type: 'SUPERVISOR_REQUEST',
        title: 'New Proposal Submission',
        message: `${user.name} has submitted a proposal: "${title}" for your review.`,
        relatedId: project.id,
      },
    });

    return NextResponse.json({
      message: 'Proposal submitted successfully',
      project,
    }, { status: 201 });
  } catch (error) {
    console.error('Error submitting proposal:', error);
    return NextResponse.json(
      { error: 'Failed to submit proposal' },
      { status: 500 }
    );
  }
}
