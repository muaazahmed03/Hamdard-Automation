import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/faculty-ideas - Get all faculty-proposed project ideas
export async function GET(request: NextRequest) {
  try {
    const facultyIdeas = await db.project.findMany({
      where: {
        isFacultyProposed: true,
        status: 'PROPOSED', // Only show proposed ideas that haven't been taken yet
        teacher: {
          role: { in: ['TEACHER', 'COMMITTEE_HEAD', 'ADMIN'] },
        },
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            teacherProfile: {
              select: {
                designation: true,
                supervisionCapacity: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate teacher availability for each project
    const ideasWithAvailability = await Promise.all(
      facultyIdeas.map(async (idea) => {
        const teacherActiveProjects = await db.project.count({
          where: {
            supervisorId: idea.teacherId,
            status: {
              in: ['PROPOSED', 'APPROVED', 'IN_PROGRESS'],
            },
          },
        });

        const capacity = idea.teacher.teacherProfile?.supervisionCapacity || 4;
        const isAvailable = teacherActiveProjects < capacity;

        return {
          ...idea,
          teacher: {
            ...idea.teacher,
            isAvailable,
            activeProjects: teacherActiveProjects,
            capacity,
          },
        };
      })
    );

    return NextResponse.json(ideasWithAvailability);
  } catch (error) {
    console.error('Error fetching faculty ideas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch faculty ideas' },
      { status: 500 }
    );
  }
}

// POST /api/faculty-ideas - Create a new faculty-proposed project idea (teacher only)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a teacher
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || !['TEACHER', 'COMMITTEE_HEAD', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only teachers, committee heads, or admins can propose project ideas' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, domain, objectives, requirements, tools } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    const newIdea = await db.project.create({
      data: {
        title,
        description,
        domain: domain || null,
        objectives: objectives || null,
        requirements: requirements || null,
        tools: tools || null,
        isFacultyProposed: true,
        status: 'PROPOSED',
        teacherId: userId,
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

    return NextResponse.json(newIdea, { status: 201 });
  } catch (error) {
    console.error('Error creating faculty idea:', error);
    return NextResponse.json(
      { error: 'Failed to create faculty idea' },
      { status: 500 }
    );
  }
}
