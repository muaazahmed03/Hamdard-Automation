import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getAccessPasses,
  updateAccessPasses,
  type AccessPassRole,
} from '@/lib/access-passes';

async function requireAdmin(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { userId };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  return NextResponse.json({ accessPasses: getAccessPasses() });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const body = await request.json();
    const updates: Partial<Record<AccessPassRole, string>> = {};

    for (const role of ['TEACHER', 'COMMITTEE_HEAD'] as const) {
      if (typeof body[role] === 'string' && body[role].trim()) {
        updates[role] = body[role].trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Provide at least one access pass to update' },
        { status: 400 },
      );
    }

    const accessPasses = updateAccessPasses(updates);
    return NextResponse.json({
      message: 'Access passes updated successfully',
      accessPasses,
    });
  } catch (error) {
    console.error('Error updating access passes:', error);
    return NextResponse.json(
      { error: 'Failed to update access passes' },
      { status: 500 },
    );
  }
}
