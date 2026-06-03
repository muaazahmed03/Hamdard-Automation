import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/faculties - Get all faculties
export async function GET(request: NextRequest) {
  try {
    const faculties = await db.faculty.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(faculties);
  } catch (error) {
    console.error('Error fetching faculties:', error);
    return NextResponse.json(
      { error: 'Failed to fetch faculties' },
      { status: 500 }
    );
  }
}

// POST /api/admin/faculties - Create a new faculty
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, code, departments } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Faculty name is required' },
        { status: 400 }
      );
    }

    if (!departments) {
      return NextResponse.json(
        { error: 'Departments are required' },
        { status: 400 }
      );
    }

    const faculty = await db.faculty.create({
      data: {
        name,
        description: description || '',
        code: code || null,
        departments: departments || '',
        isActive: true
      }
    });

    return NextResponse.json(faculty, { status: 201 });
  } catch (error: any) {
    console.error('Error creating faculty:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A faculty with this name or code already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create faculty' },
      { status: 500 }
    );
  }
}
