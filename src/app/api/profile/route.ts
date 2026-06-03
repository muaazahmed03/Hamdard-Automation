import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get userId from header or query
    const userId = request.headers.get('x-user-id') || request.nextUrl.searchParams.get('userId');
    
    // If no userId in header, try to get from token/auth
    // For now, we'll get it from query or use a default approach
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Format profile data
    const profileData: any = {
      id: user.id,
      name: user.name,
      email: user.email,
      rollNumber: user.rollNumber,
      gpa: user.gpa,
      department: user.department,
      specialization: user.specialization,
      contactInfo: user.contactInfo,
      profileImage: user.profileImage,
    };

    if (user.studentProfile) {
      profileData.studentProfile = user.studentProfile;
      profileData.semester = user.studentProfile.semester;
      profileData.batch = user.studentProfile.batch;
      profileData.interests = user.studentProfile.interests ? user.studentProfile.interests.split(',').map(i => i.trim()) : [];
      profileData.skills = user.studentProfile.skills ? user.studentProfile.skills.split(',').map(s => s.trim()) : [];
    }

    if (user.teacherProfile) {
      profileData.teacherProfile = user.teacherProfile;
      profileData.designation = user.teacherProfile.designation;
      profileData.officeHours = user.teacherProfile.officeHours;
      profileData.employeeId = user.teacherProfile.employeeId;
    }

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || request.nextUrl.searchParams.get('userId');
    const updates = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    // Update user in database
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.department !== undefined) updateData.department = updates.department;
    if (updates.rollNumber !== undefined) updateData.rollNumber = updates.rollNumber;
    if (updates.gpa !== undefined) updateData.gpa = updates.gpa;
    if (updates.contactInfo !== undefined) updateData.contactInfo = updates.contactInfo;
    if (updates.profileImage !== undefined) updateData.profileImage = updates.profileImage;
    if (updates.specialization !== undefined) updateData.specialization = updates.specialization;

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    // Update student profile if exists
    if (updates.semester !== undefined || updates.batch !== undefined || updates.interests !== undefined || updates.skills !== undefined) {
      const studentProfile = await db.studentProfile.findUnique({
        where: { userId: userId },
      });

      if (studentProfile) {
        await db.studentProfile.update({
          where: { userId: userId },
          data: {
            semester: updates.semester,
            batch: updates.batch,
            interests: updates.interests ? (Array.isArray(updates.interests) ? updates.interests.join(',') : updates.interests) : undefined,
            skills: updates.skills ? (Array.isArray(updates.skills) ? updates.skills.join(',') : updates.skills) : undefined,
          },
        });
      }
    }

    // Update teacher profile if exists
    if (updates.designation !== undefined || updates.officeHours !== undefined || updates.employeeId !== undefined) {
      const teacherProfile = await db.teacherProfile.findUnique({
        where: { userId: userId },
      });

      if (teacherProfile) {
        await db.teacherProfile.update({
          where: { userId: userId },
          data: {
            designation: updates.designation,
            officeHours: updates.officeHours,
            employeeId: updates.employeeId,
          },
        });
      }
    }

    // Format response
    const profileData: any = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      rollNumber: updatedUser.rollNumber,
      gpa: updatedUser.gpa,
      department: updatedUser.department,
      specialization: updatedUser.specialization,
      contactInfo: updatedUser.contactInfo,
      profileImage: updatedUser.profileImage,
    };

    if (updatedUser.studentProfile) {
      profileData.studentProfile = updatedUser.studentProfile;
      profileData.semester = updatedUser.studentProfile.semester;
      profileData.batch = updatedUser.studentProfile.batch;
    }

    if (updatedUser.teacherProfile) {
      profileData.teacherProfile = updatedUser.teacherProfile;
      profileData.designation = updatedUser.teacherProfile.designation;
      profileData.officeHours = updatedUser.teacherProfile.officeHours;
    }

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}