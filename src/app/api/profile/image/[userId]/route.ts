import { NextRequest, NextResponse } from 'next/server';
import { loadUserProfileImageBytes } from '@/lib/profile-image-storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const image = await loadUserProfileImageBytes(userId);
    if (!image) {
      return NextResponse.json({ error: 'Profile image not found' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(image.buffer), {
      status: 200,
      headers: {
        'Content-Type': image.mimeType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Error serving profile image:', error);
    return NextResponse.json({ error: 'Failed to load profile image' }, { status: 500 });
  }
}
