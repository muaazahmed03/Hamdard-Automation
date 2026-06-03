import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { db as prisma } from '@/lib/db'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    // First, get the submission from database to get the fileUrl
    const submission = await prisma.projectSubmission.findUnique({
      where: { id },
      select: {
        fileUrl: true,
        fileName: true,
        fileType: true
      }
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    if (!submission.fileUrl) {
      return NextResponse.json({ error: 'File URL not found' }, { status: 404 })
    }

    // fileUrl is like /uploads/proposals/filename or /uploads/filename
    // Remove leading slash and construct full path
    const fileUrlPath = submission.fileUrl.startsWith('/') 
      ? submission.fileUrl.slice(1) 
      : submission.fileUrl
    const filePath = join(process.cwd(), 'public', fileUrlPath)

    if (!existsSync(filePath)) {
      console.error('File not found at path:', filePath)
      return NextResponse.json({ error: 'File not found on server' }, { status: 404 })
    }

    const buffer = await readFile(filePath)

    // Use fileName from database, or derive from fileUrl
    const originalName = submission.fileName || 
                        fileUrlPath.split('/').pop() || 
                        'download'

    // determine content-type by extension (simple)
    const lower = originalName.toLowerCase()
    let contentType = 'application/octet-stream'
    if (lower.endsWith('.pdf')) contentType = 'application/pdf'
    else if (lower.endsWith('.docx')) contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    else if (lower.endsWith('.doc')) contentType = 'application/msword'
    else if (lower.endsWith('.zip')) contentType = 'application/zip'
    else if (lower.endsWith('.txt')) contentType = 'text/plain'
    else if (lower.endsWith('.png')) contentType = 'image/png'
    else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) contentType = 'image/jpeg'

    const url = new URL(req.url)
    const inline = url.searchParams.get('inline') === '1' || url.searchParams.get('inline') === 'true'

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': String(buffer.length),
    }

    // set content-disposition
    if (inline) {
      headers['Content-Disposition'] = `inline; filename="${encodeURIComponent(originalName)}"`
    } else {
      headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(originalName)}"`
    }

    return new Response(buffer, { status: 200, headers })
  } catch (err) {
    console.error('Download endpoint error:', err)
    return NextResponse.json({ error: 'Failed to read file', details: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
