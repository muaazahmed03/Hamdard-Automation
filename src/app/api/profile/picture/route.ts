import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Get userId from header or query (you might want to get this from auth token)
    const userId = request.headers.get('x-user-id') || request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Create profile pictures directory if it doesn't exist
    const profileDir = join(process.cwd(), 'public', 'profile-pictures');
    if (!existsSync(profileDir)) {
      await mkdir(profileDir, { recursive: true });
    }

    // Create a unique filename for the profile picture
    const timestamp = Date.now();
    const fileName = `profile_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = join(profileDir, fileName);

    // Convert file to bytes and save to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the file URL
    const fileUrl = `/profile-pictures/${fileName}`;
    
    // Update user profile in database
    await db.user.update({
      where: { id: userId },
      data: { profileImage: fileUrl }
    });
    
    return NextResponse.json({ 
      profilePictureUrl: fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json(
      { error: 'Failed to upload profile picture' },
      { status: 500 }
    );
  }
}