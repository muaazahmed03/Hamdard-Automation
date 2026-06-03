import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/students/search - Search for students for group formation
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const searchType = searchParams.get('type') || 'name'; // 'name' or 'rollNumber'
    const currentUserId = request.headers.get('x-user-id');

    // Build where clause based on search type
    let whereClause: any = {
      role: 'STUDENT',
      status: 'APPROVED', // Only show approved students
    };

    // Exclude current user from results
    if (currentUserId) {
      whereClause.id = { not: currentUserId };
    }

    // Add search filter (case-insensitive)
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      if (searchType === 'name') {
        whereClause.OR = [
          { name: { contains: query } },
          { name: { contains: lowerQuery } },
          { name: { contains: query.toUpperCase() } },
          { name: { contains: query.charAt(0).toUpperCase() + query.slice(1).toLowerCase() } }
        ];
      } else if (searchType === 'rollNumber') {
        whereClause.rollNumber = {
          contains: query
        };
      }
    }

    const students = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        rollNumber: true,
        department: true,
        gpa: true,
        profileImage: true,
        createdAt: true,
        studentProfile: {
          select: {
            semester: true,
            batch: true,
            skills: true,
            interests: true,
          }
        },
        groupMemberships: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                isActive: true,
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Format the response
    const formattedStudents = students.map(student => {
      const activeGroup = student.groupMemberships.find(gm => gm.group.isActive);
      
      return {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber || 'N/A',
        email: student.email,
        gpa: student.gpa || 0,
        department: student.department || 'N/A',
        semester: student.studentProfile?.semester || 0,
        batch: student.studentProfile?.batch || '',
        skills: student.studentProfile?.skills ? student.studentProfile.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        interests: student.studentProfile?.interests ? student.studentProfile.interests.split(',').map(i => i.trim()).filter(Boolean) : [],
        profileImage: student.profileImage,
        isInGroup: !!activeGroup,
        currentGroup: activeGroup ? {
          id: activeGroup.group.id,
          name: activeGroup.group.name
        } : null
      };
    });

    return NextResponse.json(formattedStudents);
  } catch (error) {
    console.error('Error searching students:', error);
    return NextResponse.json(
      { error: 'Failed to search students' },
      { status: 500 }
    );
  }
}
