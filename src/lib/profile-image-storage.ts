import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { db } from '@/lib/db';
import { profileImageApiPath } from '@/lib/profile-image-url';

export async function saveUserProfileImage(
  userId: string,
  buffer: Buffer,
  mimeType: string,
) {
  await db.userProfileImage.upsert({
    where: { userId },
    create: {
      userId,
      mimeType: mimeType || 'image/jpeg',
      data: buffer,
    },
    update: {
      mimeType: mimeType || 'image/jpeg',
      data: buffer,
    },
  });

  const fileUrl = profileImageApiPath(userId);
  await db.user.update({
    where: { id: userId },
    data: { profileImage: fileUrl },
  });

  return fileUrl;
}

export async function deleteUserProfileImage(userId: string) {
  await db.userProfileImage.deleteMany({ where: { userId } });
  await db.user.update({
    where: { id: userId },
    data: { profileImage: null },
  });
}

export async function loadUserProfileImageBytes(userId: string): Promise<{
  buffer: Buffer;
  mimeType: string;
} | null> {
  const stored = await db.userProfileImage.findUnique({
    where: { userId },
  });
  if (stored) {
    return {
      buffer: Buffer.from(stored.data),
      mimeType: stored.mimeType || 'image/jpeg',
    };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { profileImage: true },
  });

  if (user?.profileImage?.startsWith('/profile-pictures/')) {
    const filePath = join(process.cwd(), 'public', user.profileImage);
    if (existsSync(filePath)) {
      const buffer = await readFile(filePath);
      return { buffer, mimeType: 'image/jpeg' };
    }
  }

  return null;
}
