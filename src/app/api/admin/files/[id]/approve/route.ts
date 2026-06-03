import { NextResponse } from 'next/server'
import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { createNotification, NotificationTemplates } from '@/lib/notification-service'

const META_PATH = join(process.cwd(), 'data', 'file-metadata.json')

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    const files = await readdir(uploadsDir)
    const match = files.find(f => f.startsWith(`${id}_`))
    if (!match) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const approver = body?.approver || 'Admin'

    let metadata: Record<string, any> = {}
    if (existsSync(META_PATH)) {
      try { metadata = JSON.parse(await readFile(META_PATH, 'utf-8') || '{}') } catch (e) { metadata = {} }
    }

    metadata[id] = {
      ...(metadata[id] || {}),
      status: 'Approved',
      approvedBy: approver,
      approvedDate: new Date().toISOString()
    }

    await writeFile(META_PATH, JSON.stringify(metadata, null, 2), 'utf-8')

    // Send notification to file uploader
    try {
      const fileData = metadata[id];
      if (fileData?.uploaderId) {
        const template = NotificationTemplates.fileApproved(
          fileData.fileName || 'your file',
          approver
        );
        
        await createNotification({
          userId: fileData.uploaderId,
          ...template,
          link: '/student?section=documents'
        });
      }
    } catch (notifErr) {
      console.warn('Failed to send file approval notification:', notifErr);
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Approve file error:', err)
    return NextResponse.json({ error: 'Failed to approve file' }, { status: 500 })
  }
}
