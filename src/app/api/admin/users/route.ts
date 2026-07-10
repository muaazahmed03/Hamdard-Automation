import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validatePassword } from '@/lib/security';
import bcrypt from 'bcryptjs';

// GET /api/admin/users - Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
    // For now, skip authentication and return all users
    // Hide unverified registrations from approval queues until email OTP is confirmed
    const users = await db.user.findMany({
      where: {
        OR: [
          { emailVerified: true },
          { status: { not: 'PENDING' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isActive: true,
        emailVerified: true,
        rollNumber: true,
        department: true,
        gpa: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
        studentProfile: {
          select: {
            semester: true,
            batch: true,
            interests: true,
            skills: true,
            transcriptUrl: true,
            cgpa: true,
            eligibilityStatus: true,
          },
        },
        teacherProfile: {
          select: {
            employeeId: true,
            designation: true,
            officeHours: true,
            supervisionCapacity: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      name,
      email,
      role = 'STUDENT',
      department,
      status,
      password,
      supervisionCapacity = 4,
    } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const roleUpper = typeof role === 'string' ? role.toUpperCase() : 'STUDENT'

    let normalizedStatus = 'PENDING'
    if (typeof status === 'string') {
      const s = status.toUpperCase()
      if (s === 'APPROVED' || s === 'APPROVE') normalizedStatus = 'APPROVED'
      else if (s === 'REJECTED' || s === 'REJECT') normalizedStatus = 'REJECTED'
      else normalizedStatus = 'PENDING'
    }

    const pwd = password || 'changeme'

    // Validate password length
    const passwordValidation = validatePassword(pwd);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(pwd, 10);

    const newUser = await db.user.create({
      data: {
        name,
        email,
        role: roleUpper,
        department,
        status: normalizedStatus,
        emailVerified: true,
        password: hashedPassword,
        // Create teacher profile if role is TEACHER or COMMITTEE_HEAD
        ...(roleUpper === 'TEACHER' || roleUpper === 'COMMITTEE_HEAD'
          ? {
              teacherProfile: {
                create: {
                  supervisionCapacity: supervisionCapacity || 4,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        department: true,
        createdAt: true,
        teacherProfile: {
          select: {
            supervisionCapacity: true,
          },
        },
      },
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user', details: String(error) }, { status: 500 })
  }
}