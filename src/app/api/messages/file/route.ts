import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, existsSync, statSync } from 'fs';
import path from 'path';
import { Readable } from 'stream';

const ALLOWED_PREFIXES = ['/uploads/messages/', '/uploads/'];

function resolveSafeFilePath(requestedPath: string) {
  const normalized = requestedPath.startsWith('/') ? requestedPath : `/${requestedPath}`;
  const isAllowed = ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  if (!isAllowed) {
    return null;
  }

  const relativePath = normalized.replace(/^\//, '');
  const absolutePath = path.join(process.cwd(), 'public', relativePath);
  const publicRoot = path.join(process.cwd(), 'public');

  if (!absolutePath.startsWith(publicRoot)) {
    return null;
  }

  return absolutePath;
}

function getMimeType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
  };
  return map[ext] ?? 'application/octet-stream';
}

export async function GET(request: NextRequest) {
  try {
    const filePathParam = request.nextUrl.searchParams.get('path');
    if (!filePathParam) {
      return NextResponse.json({ error: 'Missing file path' }, { status: 400 });
    }

    const absolutePath = resolveSafeFilePath(decodeURIComponent(filePathParam));
    if (!absolutePath) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    if (!existsSync(absolutePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stats = statSync(absolutePath);
    if (!stats.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 });
    }

    const fileName = path.basename(absolutePath);
    const mimeType = getMimeType(absolutePath);
    const stream = createReadStream(absolutePath);
    const webStream = Readable.toWeb(stream) as ReadableStream;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(stats.size),
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Chat file download error:', error);
    return NextResponse.json({ error: 'Failed to load file' }, { status: 500 });
  }
}
