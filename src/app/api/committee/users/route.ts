import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function userIsCommitteeMember(userId: string) {
  const committees = await db.committee.findMany({
    where: { isActive: true },
    select: { chairpersonId: true, members: true },
  });

  return committees.some((committee) => {
    if (committee.chairpersonId === userId) {
      return true;
    }
    if (!committee.members) {
      return false;
    }
    try {
      const memberIds = JSON.parse(committee.members);
      return Array.isArray(memberIds) && memberIds.includes(userId);
    } catch {
      return false;
    }
  });
}

async function requireCommitteeApprover(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true },
  });

  if (!user || user.status !== 'APPROVED') {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (user.role === 'ADMIN' || user.role === 'COMMITTEE_HEAD') {
    return { userId };
  }

  if (user.role === 'TEACHER' && (await userIsCommitteeMember(userId))) {
    return { userId };
  }

  return {
    error: NextResponse.json(
      { error: 'Only committee heads and members can manage user registrations' },
      { status: 403 },
    ),
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireCommitteeApprover(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';
    const role = searchParams.get('role');

    const users = await db.user.findMany({
      where: {
        status,
        emailVerified: true,
        role: role
          ? (role as 'STUDENT' | 'TEACHER')
          : { in: ['STUDENT', 'TEACHER'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        department: true,
        rollNumber: true,
        gpa: true,
        createdAt: true,
        studentProfile: {
          select: {
            faculty: true,
            session: true,
            cgpa: true,
            eligibilityStatus: true,
          },
        },
        teacherProfile: {
          select: {
            faculty: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching committee users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending users' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireCommitteeApprover(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const body = await request.json();
    const { userId, action } = body as { userId?: string; action?: string };

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'userId and action are required' },
        { status: 400 },
      );
    }

    let newStatus: string | undefined;
    if (action === 'approve' || action === 'APPROVED') newStatus = 'APPROVED';
    else if (action === 'reject' || action === 'REJECTED') newStatus = 'REJECTED';
    else if (action === 'pending' || action === 'PENDING') newStatus = 'PENDING';

    if (!newStatus) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const existing = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, emailVerified: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!existing.emailVerified) {
      return NextResponse.json(
        { error: 'User has not verified their email yet' },
        { status: 400 },
      );
    }

    if (!['STUDENT', 'TEACHER'].includes(existing.role)) {
      return NextResponse.json(
        { error: 'Committee can only approve student and teacher registrations' },
        { status: 403 },
      );
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { status: newStatus },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        department: true,
      },
    });

    try {
      const { createNotification, NotificationTemplates } = await import(
        '@/lib/notification-service'
      );
      const template =
        newStatus === 'APPROVED'
          ? NotificationTemplates.userApproved(updatedUser.name || 'User')
          : newStatus === 'REJECTED'
            ? NotificationTemplates.userRejected(updatedUser.name || 'User')
            : null;

      if (template) {
        await createNotification({ userId, ...template });
      }
    } catch (notifErr) {
      console.error('Failed to create notification:', notifErr);
    }

    return NextResponse.json({
      message: `User status updated to ${newStatus}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Committee user approval error:', error);
    return NextResponse.json(
      { error: 'Failed to update user status' },
      { status: 500 },
    );
  }
}
