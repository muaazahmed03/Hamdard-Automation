import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users/search - Search all users (students and teachers) for messaging
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const currentUserId = request.headers.get('x-user-id');

    // Build where clause
    let whereClause: any = {
      status: 'APPROVED', // Only show approved users
    };

    // Exclude current user
    if (currentUserId) {
      whereClause.id = { not: currentUserId };
    }

    // Add search filter (case-insensitive)
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      const upperQuery = query.toUpperCase();
      const capitalizedQuery = query.charAt(0).toUpperCase() + query.slice(1).toLowerCase();
      
      whereClause.OR = [
        { name: { contains: query } },
        { name: { contains: lowerQuery } },
        { name: { contains: upperQuery } },
        { name: { contains: capitalizedQuery } },
        { email: { contains: query } },
        { email: { contains: lowerQuery } },
        { rollNumber: { contains: query } },
        { rollNumber: { contains: upperQuery } }
      ];
    }

    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rollNumber: true,
        profileImage: true,
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ],
      take: 50 // Limit results
    });

    // Format the response
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.toLowerCase(),
      rollNumber: user.rollNumber,
      profileImage: user.profileImage,
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}
