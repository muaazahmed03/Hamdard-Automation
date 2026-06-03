import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createNotification, notifyUsersByRole, NotificationTemplates } from '@/lib/notification-service';

// POST /api/forms/submit
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    // Optionally, get user ID from headers or session if available
    const submittedBy = request.headers.get('x-user-id') || null;
    const submission = await db.formSubmission.create({
      data: {
        type: data.type,
        data,
        submittedBy,
      },
    });

    // Notify student (submitter)
    if (submittedBy) {
      await createNotification({
        userId: submittedBy,
        ...NotificationTemplates.fileUploaded(
          data.projectTitle || data.subject || data.type,
          'You',
          data.projectTitle || data.subject || data.type
        ),
        category: 'form',
        link: '/student/forms',
      });
    }

    // Notify committee head and super admin
    await notifyUsersByRole('COMMITTEE_HEAD', {
      ...NotificationTemplates.fileUploaded(
        data.projectTitle || data.subject || data.type,
        submittedBy || 'Student',
        data.projectTitle || data.subject || data.type
      ),
      category: 'form',
      link: '/committee-head',
    });
    await notifyUsersByRole('ADMIN', {
      ...NotificationTemplates.fileUploaded(
        data.projectTitle || data.subject || data.type,
        submittedBy || 'Student',
        data.projectTitle || data.subject || data.type
      ),
      category: 'form',
      link: '/super-admin',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save form submission:', error);
    return NextResponse.json({ error: 'Failed to submit form' }, { status: 500 });
  }
}
