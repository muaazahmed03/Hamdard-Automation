import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { validatePassword, getSystemSettings } from '@/lib/security';
import { sendWelcomeEmail } from '@/lib/email';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'COMMITTEE_HEAD', 'TEACHER', 'STUDENT']),
  accessPass: z.string().optional(),
  rollNumber: z.string().optional(),
  department: z.string().optional(),
  faculty: z.string().optional(),
  session: z.string().optional(),
  contactInfo: z.string().optional(),
  cgpa: z.number().min(0).max(4).optional(),
  prerequisitesPassed: z.boolean().optional(),
  policyAccepted: z.boolean().optional(),
  conditionalCommitment: z.string().optional(),
  transcriptFile: z.object({
    name: z.string(),
    type: z.string(),
    data: z.string()
  }).optional(),
});

// Check system settings
function getSystemSettings() {
  try {
    const settingsFile = path.join(process.cwd(), 'data', 'system-settings.json');
    if (fs.existsSync(settingsFile)) {
      const data = fs.readFileSync(settingsFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading settings:', error);
  }
  return { general: { maintenanceMode: false, allowRegistration: true } };
}

// POST /api/auth/register - User registration
export async function POST(request: NextRequest) {
  try {
    // Check maintenance mode
    const settings = getSystemSettings();
    if (settings.general?.maintenanceMode) {
      return NextResponse.json(
        { error: 'System is under maintenance. Please try again later.' },
        { status: 503 }
      );
    }

    // Check if registration is allowed
    if (settings.general?.allowRegistration === false) {
      return NextResponse.json(
        { error: 'Registration is currently disabled. Please contact the administrator.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Validate password length based on settings
    const passwordValidation = validatePassword(validatedData.password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Validate access pass for privileged roles (NOT for students)
    if (['ADMIN', 'COMMITTEE_HEAD', 'TEACHER'].includes(validatedData.role)) {
      if (!validatedData.accessPass || validatedData.accessPass.trim() === '') {
        return NextResponse.json(
          { error: 'Access pass is required for ' + validatedData.role.toLowerCase() + ' registration' },
          { status: 400 }
        );
      }
      
      // Simple access pass validation (in production, this should be more secure)
      const validAccessPasses = {
        'ADMIN': 'ADMIN@2024',
        'COMMITTEE_HEAD': 'COMMITTEE@2024',
        'TEACHER': 'TEACHER@2024'
      };
      
      if (validatedData.accessPass !== validAccessPasses[validatedData.role as keyof typeof validAccessPasses]) {
        return NextResponse.json(
          { error: 'Invalid access pass. Use: ' + validAccessPasses[validatedData.role as keyof typeof validAccessPasses] },
          { status: 400 }
        );
      }
    }

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          ...(validatedData.role === 'STUDENT' && validatedData.rollNumber 
            ? [{ rollNumber: validatedData.rollNumber }] 
            : [])
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === validatedData.email) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 400 }
        );
      }
      if (existingUser.rollNumber === validatedData.rollNumber) {
        return NextResponse.json(
          { error: 'Roll number already registered' },
          { status: 400 }
        );
      }
    }

    // Validate department against faculty departments (skip when no faculties seeded yet)
    if (validatedData.department) {
      const faculties = await db.faculty.findMany({
        where: { isActive: true },
      });

      if (faculties.length > 0) {
        let departmentFound = false;
        for (const faculty of faculties) {
          if (faculty.departments) {
            const facultyDepartments = faculty.departments
              .split(',')
              .map((dept) => dept.trim().toLowerCase());

            if (
              facultyDepartments.includes(validatedData.department!.toLowerCase())
            ) {
              departmentFound = true;
              break;
            }
          }
        }

        if (!departmentFound) {
          return NextResponse.json(
            {
              error:
                'Department does not exist in any faculty. Use e.g. Computer Science, Software Engineering, or Information Technology.',
            },
            { status: 400 }
          );
        }
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user
    // Requirement: allow immediate login for all roles right after registration.
    const autoApprovedRoles: Array<'ADMIN' | 'COMMITTEE_HEAD' | 'TEACHER'> = [
      'ADMIN',
      'COMMITTEE_HEAD',
      'TEACHER',
    ];
    
    // Eligibility check for students
    let eligibilityStatus: 'ELIGIBLE' | 'CONDITIONAL' | 'INELIGIBLE' = 'ELIGIBLE';
    let userStatus: 'PENDING' | 'APPROVED' | 'CONDITIONALLY_REGISTERED' = 'PENDING';
    
    if (validatedData.role === 'STUDENT') {
      const cgpa = validatedData.cgpa || 0;
      
      // NEW RULE: Students with GPA >= 3.0 are auto-approved
      // Students with GPA < 3.0 require admin approval
      if (cgpa >= 3.0) {
        eligibilityStatus = 'ELIGIBLE';
        userStatus = 'APPROVED';
      } else {
        // GPA < 3.0 gets conditional status but can still proceed.
        eligibilityStatus = 'CONDITIONAL';
        userStatus = 'CONDITIONALLY_REGISTERED';
      }
    } else {
      userStatus = autoApprovedRoles.includes(validatedData.role as (typeof autoApprovedRoles)[number]) 
        ? 'APPROVED' 
        : 'PENDING';
    }

    const userData: any = {
      name: validatedData.name,
      email: validatedData.email,
      password: hashedPassword,
      role: validatedData.role,
      status: userStatus,
    };

    if (validatedData.role === 'STUDENT') {
      userData.rollNumber = validatedData.rollNumber;
      userData.gpa = validatedData.cgpa;
    }

    if (validatedData.department) {
      userData.department = validatedData.department;
    }

    const user = await db.user.create({
      data: userData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rollNumber: true,
        department: true,
        gpa: true,
        status: true,
        createdAt: true,
      },
    });

    // Handle transcript file upload
    let transcriptUrl = null;
    if (validatedData.role === 'STUDENT' && validatedData.transcriptFile) {
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'transcripts');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const base64Data = validatedData.transcriptFile.data.replace(/^data:([A-Za-z-+\/]+);base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `transcript-${user.id}-${Date.now()}${path.extname(validatedData.transcriptFile.name)}`;
        const filepath = path.join(uploadsDir, filename);
        
        fs.writeFileSync(filepath, buffer);
        transcriptUrl = `/uploads/transcripts/${filename}`;
      } catch (error) {
        console.error('Error saving transcript:', error);
      }
    }

    // Create profile based on role
    if (validatedData.role === 'STUDENT') {
      await db.studentProfile.create({
        data: {
          userId: user.id,
          semester: 1,
          batch: new Date().getFullYear().toString(),
          faculty: validatedData.faculty,
          session: validatedData.session,
          contactInfo: validatedData.contactInfo,
          cgpa: validatedData.cgpa,
          prerequisitesPassed: validatedData.prerequisitesPassed || false,
          eligibilityStatus: eligibilityStatus,
          transcriptUrl: transcriptUrl,
          policyAccepted: validatedData.policyAccepted || false,
          policyAcceptedAt: validatedData.policyAccepted ? new Date() : null,
          conditionalCommitment: validatedData.conditionalCommitment,
        },
      });
    } else if (validatedData.role === 'TEACHER') {
      await db.teacherProfile.create({
        data: {
          userId: user.id,
          employeeId: `EMP${Date.now()}`,
          designation: 'Faculty Member',
          officeHours: '9:00 AM - 5:00 PM',
        },
      });
    }

    // Send welcome email to the user
    try {
      await sendWelcomeEmail(user.email, user.name || 'User', user.role);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    return NextResponse.json({
      message: 'Registration successful',
      user,
      eligibilityStatus: validatedData.role === 'STUDENT' ? eligibilityStatus : undefined,
      userId: user.id,
      cgpa: validatedData.cgpa,
      prerequisitesPassed: validatedData.prerequisitesPassed,
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}