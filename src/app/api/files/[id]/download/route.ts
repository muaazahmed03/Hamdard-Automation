import { NextRequest, NextResponse } from 'next/server';
import { loadSubmissionFileBytes } from '@/lib/submission-file-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Authenticated-friendly file download for teacher/committee/admin/student.
 * Serves bytes from DB first (survives Render redeploys), then disk.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const resolved = await Promise.resolve(params);
    const id = resolved.id;

    if (!id) {
      return NextResponse.json({ error: 'File id is required' }, { status: 400 });
    }

    const file = await loadSubmissionFileBytes(id);
    if (!file || !file.buffer?.length) {
      return NextResponse.json(
        {
          error:
            'File not found on server. It may have been uploaded before durable storage was enabled — please ask the student to re-upload.',
        },
        { status: 404 },
      );
    }

    const inline =
      request.nextUrl.searchParams.get('inline') === '1' ||
      request.nextUrl.searchParams.get('inline') === 'true';

    const safeName = (file.fileName || 'document.pdf').replace(/"/g, '');

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Length': String(file.buffer.length),
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(safeName)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}
