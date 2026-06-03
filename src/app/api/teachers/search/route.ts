import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/teachers/search - Search for teachers/supervisors
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';

    console.log('Teacher search query:', query);

    // Build where clause - show only approved teachers
    const whereClause: any = {
      role: 'TEACHER',
      status: 'APPROVED', // Only show approved teachers
    };

    // Add search filter if query provided (SQLite doesn't support case-insensitive)
    if (query && query.trim()) {
      whereClause.OR = [
        {
          name: {
            contains: query.trim()
          }
        },
        {
          email: {
            contains: query.trim()
          }
        },
        {
          department: {
            contains: query.trim()
          }
        }
      ];
    }

    console.log('Where clause:', JSON.stringify(whereClause));

    const teachers = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        specialization: true,
        profileImage: true,
        role: true,
        teacherProfile: {
          select: {
            designation: true,
            officeHours: true,
            faculty: true,
            supervisionCapacity: true,
          }
        },
        receivedSupervisorRequests: {
          where: {
            status: 'ACCEPTED'
          },
          select: {
            id: true,
            studentId: true,
            student: {
              select: {
                groupMemberships: {
                  select: {
                    groupId: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      },
      take: 100
    });

    console.log(`Found ${teachers.length} teachers`);

    // Format the response
    const formattedTeachers = teachers.map(teacher => {
      // Count unique groups from accepted supervisor requests
      const uniqueGroupIds = new Set(
        teacher.receivedSupervisorRequests
          .flatMap(req => req.student.groupMemberships.map(m => m.groupId))
      );
      const currentSupervising = uniqueGroupIds.size;
      const maxSupervising = teacher.teacherProfile?.supervisionCapacity || 4;

      return {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: 'TEACHER',
        department: teacher.department || teacher.teacherProfile?.faculty || 'N/A',
        designation: teacher.teacherProfile?.designation || 'Faculty',
        officeHours: teacher.teacherProfile?.officeHours || 'N/A',
        specialization: teacher.specialization || 'N/A',
        profileImage: teacher.profileImage,
        currentSupervising,
        maxSupervising,
        isAvailable: currentSupervising < maxSupervising,
      };
    });

    console.log('Returning teachers:', formattedTeachers);
    return NextResponse.json(formattedTeachers);
  } catch (error) {
    console.error('Error searching teachers:', error);
    return NextResponse.json(
      { error: 'Failed to search teachers' },
      { status: 500 }
    );
  }
}
