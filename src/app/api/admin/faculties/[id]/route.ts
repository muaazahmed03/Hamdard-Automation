import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/admin/faculties/[id] - Update a faculty
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, description, code, departments, isActive } = body;

    const faculty = await db.faculty.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(code !== undefined && { code }),
        ...(departments !== undefined && { departments }),
        ...(isActive !== undefined && { isActive })
      }
    });

    return NextResponse.json(faculty);
  } catch (error: any) {
    console.error('Error updating faculty:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Faculty not found' },
        { status: 404 }
      );
    }
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A faculty with this name or code already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update faculty' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/faculties/[id] - Delete a faculty
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    await db.faculty.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting faculty:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Faculty not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete faculty' },
      { status: 500 }
    );
  }
}
