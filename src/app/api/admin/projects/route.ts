import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/projects - Get all projects (admin only)
export async function GET(request: NextRequest) {
  try {
    // For now, skip authentication and return all projects
    const projects = await db.project.findMany({
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    rollNumber: true,
                  },
                },
              },
            },
          },
        },
        submissions: {
          select: {
            id: true,
            title: true,
            fileType: true,
            status: true,
            isSubmitted: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/admin/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, requirements, teacherId } = body;

    if (!title || !teacherId) {
      return NextResponse.json(
        { error: 'Title and teacher ID are required' },
        { status: 400 }
      );
    }

    const project = await db.project.create({
      data: {
        title,
        description: description || '',
        requirements: requirements || '',
        teacherId,
        status: 'PROPOSED',
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}