import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { db } from '@/lib/db';

function guessMimeType(fileName?: string | null, fallback = 'application/octet-stream') {
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.zip')) return 'application/zip';
  if (lower.endsWith('.txt')) return 'text/plain';
  return fallback;
}

function diskPathFromFileUrl(fileUrl: string) {
  const relative = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
  return join(process.cwd(), 'public', relative);
}

export async function saveSubmissionFileBytes(params: {
  submissionId: string;
  buffer: Buffer;
  fileName?: string | null;
  mimeType?: string | null;
}) {
  const mimeType =
    params.mimeType ||
    guessMimeType(params.fileName, 'application/pdf');

  await db.submissionFile.upsert({
    where: { submissionId: params.submissionId },
    create: {
      submissionId: params.submissionId,
      mimeType,
      fileName: params.fileName || null,
      data: params.buffer,
    },
    update: {
      mimeType,
      fileName: params.fileName || null,
      data: params.buffer,
    },
  });
}

export async function loadSubmissionFileBytes(submissionId: string): Promise<{
  buffer: Buffer;
  mimeType: string;
  fileName: string;
} | null> {
  const submission = await db.projectSubmission.findUnique({
    where: { id: submissionId },
    select: {
      fileUrl: true,
      fileName: true,
      fileBlob: true,
    },
  });

  if (!submission) {
    return null;
  }

  if (submission.fileBlob?.data) {
    return {
      buffer: Buffer.from(submission.fileBlob.data),
      mimeType:
        submission.fileBlob.mimeType ||
        guessMimeType(submission.fileName || submission.fileBlob.fileName),
      fileName:
        submission.fileBlob.fileName ||
        submission.fileName ||
        'document.pdf',
    };
  }

  if (submission.fileUrl) {
    const filePath = diskPathFromFileUrl(submission.fileUrl);
    if (existsSync(filePath)) {
      const buffer = await readFile(filePath);
      if (buffer.length > 0) {
        return {
          buffer,
          mimeType: guessMimeType(submission.fileName || filePath),
          fileName: submission.fileName || filePath.split('/').pop() || 'document.pdf',
        };
      }
    }
  }

  return null;
}
