import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get approved students from database
    const students = await db.user.findMany({
      where: {
        role: 'STUDENT',
        status: 'APPROVED',
      },
      select: {
        id: true,
        name: true,
        email: true,
        rollNumber: true,
        gpa: true,
        department: true,
        profileImage: true,
        studentProfile: {
          select: {
            semester: true,
            batch: true,
            interests: true,
            skills: true,
          },
        },
        groupMemberships: {
          select: {
            groupId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format students for frontend
    const formattedStudents = students.map(student => ({
      id: student.id,
      name: student.name || 'Unknown',
      rollNumber: student.rollNumber || '',
      email: student.email,
      gpa: student.gpa || 0,
      department: student.department || 'N/A',
      semester: student.studentProfile?.semester || 0,
      skills: student.studentProfile?.skills ? student.studentProfile.skills.split(',').map(s => s.trim()) : [],
      interests: student.studentProfile?.interests ? student.studentProfile.interests.split(',').map(i => i.trim()) : [],
      profileImage: student.profileImage,
      isAvailable: (student.groupMemberships?.length || 0) === 0,
      currentGroup: student.groupMemberships?.length > 0 ? `Group ${student.groupMemberships[0].groupId}` : null,
    }));

    /* Mock data for available students (fallback if database is empty)
    const students = [
      {
        id: '1',
        name: 'Alice Johnson',
        rollNumber: 'CS2021001',
        email: 'alice@university.edu',
        gpa: 3.8,
        department: 'Computer Science',
        semester: 6,
        skills: ['React', 'Node.js', 'MongoDB', 'Machine Learning'],
        interests: ['Web Development', 'AI', 'Data Science'],
        profileImage: null,
        isAvailable: true,
        currentGroup: null
      },
      {
        id: '2',
        name: 'Bob Wilson',
        rollNumber: 'CS2021002',
        email: 'bob@university.edu',
        gpa: 3.6,
        department: 'Computer Science',
        semester: 6,
        skills: ['Python', 'TensorFlow', 'React', 'PostgreSQL'],
        interests: ['Machine Learning', 'Computer Vision', 'Deep Learning'],
        profileImage: null,
        isAvailable: false,
        currentGroup: 'Group A'
      },
      {
        id: '3',
        name: 'Emma Thompson',
        rollNumber: 'CS2021003',
        email: 'emma@university.edu',
        gpa: 3.9,
        department: 'Computer Science',
        semester: 6,
        skills: ['Java', 'Spring Boot', 'MySQL', 'Docker'],
        interests: ['Software Engineering', 'Cloud Computing', 'DevOps'],
        profileImage: null,
        isAvailable: true,
        currentGroup: null
      },
      {
        id: '4',
        name: 'David Lee',
        rollNumber: 'CS2021004',
        email: 'david@university.edu',
        gpa: 3.7,
        department: 'Computer Science',
        semester: 6,
        skills: ['Vue.js', 'Laravel', 'MySQL', 'AWS'],
        interests: ['Web Development', 'Cloud Computing', 'Full Stack'],
        profileImage: null,
        isAvailable: true,
        currentGroup: null
      },
      {
        id: '5',
        name: 'Sarah Davis',
        rollNumber: 'CS2021005',
        email: 'sarah@university.edu',
        gpa: 3.5,
        department: 'Computer Science',
        semester: 6,
        skills: ['C++', 'OpenGL', 'Unity', 'Game Development'],
        interests: ['Game Development', 'Graphics Programming', 'VR'],
        profileImage: null,
        isAvailable: false,
        currentGroup: 'Group B'
      }
    ];*/

    return NextResponse.json(formattedStudents);
  } catch (error) {
    console.error('Error fetching available students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available students' },
      { status: 500 }
    );
  }
}