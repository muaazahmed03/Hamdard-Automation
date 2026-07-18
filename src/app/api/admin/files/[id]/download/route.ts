import { NextRequest, NextResponse } from 'next/server'
import { loadSubmissionFileBytes } from '@/lib/submission-file-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolved = await Promise.resolve(params)
    const id = resolved.id

    const file = await loadSubmissionFileBytes(id)
    if (!file || !file.buffer?.length) {
      return NextResponse.json(
        {
          error:
            'File not found on server. It may have been uploaded before durable storage was enabled — please ask the student to re-upload.',
        },
        { status: 404 }
      )
    }

    const url = new URL(req.url)
    const inline = url.searchParams.get('inline') === '1' || url.searchParams.get('inline') === 'true'
    const safeName = (file.fileName || 'document.pdf').replace(/"/g, '')

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Length': String(file.buffer.length),
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(safeName)}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('Download endpoint error:', err)
    return NextResponse.json(
      { error: 'Failed to read file', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
