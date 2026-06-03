import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { checkLoginAttempts, recordFailedLogin, clearLoginAttempts, getSessionExpiryTime, getSystemSettings } from '@/lib/security';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/login - User login
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

    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Find user by email first to check role
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        rollNumber: true,
        department: true,
        profileImage: true,
        createdAt: true,
        status: true, // Add status to check approval
        isActive: true, // Add isActive to check if account is deactivated
      },
    });

    // Check login attempts and lockout (skip for admins)
    const systemSettings = getSystemSettings();
    const maxAttempts = systemSettings.security?.maxLoginAttempts || 5;
    const attemptCheck = checkLoginAttempts(email, maxAttempts, user?.role);
    
    if (!attemptCheck.allowed) {
      return NextResponse.json(
        { error: attemptCheck.error },
        { status: 429 }
      );
    }

    if (!user) {
      // Record failed login for non-existent user
      recordFailedLogin(email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Record failed login attempt (pass user role to exempt admins)
      const failedAttempt = recordFailedLogin(email, user.role);
      const errorMessage = failedAttempt.shouldLock 
        ? `Invalid credentials. Account locked for 15 minutes due to too many failed attempts.`
        : `Invalid email or password. ${failedAttempt.remainingAttempts} attempt(s) remaining.`;
      
      return NextResponse.json(
        { 
          error: errorMessage,
          remainingAttempts: failedAttempt.remainingAttempts
        },
        { status: 401 }
      );
    }

    // Clear login attempts on successful login
    clearLoginAttempts(email);

    // Check if account is deactivated
    if (user.isActive === false) {
      return NextResponse.json(
        { 
          error: 'Your account has been deactivated by the administrator. Please contact support for assistance.',
          status: 'DEACTIVATED'
        },
        { status: 403 }
      );
    }

    // Check user status - prevent pending users from logging in
    if (user.status === 'PENDING') {
      return NextResponse.json(
        { 
          error: 'Your registration is pending approval. Please wait for admin approval to access your portal.',
          status: 'PENDING'
        },
        { status: 403 }
      );
    }

    if (user.status === 'REJECTED') {
      return NextResponse.json(
        { 
          error: 'Your registration has been rejected. Please contact the administrator.',
          status: 'REJECTED'
        },
        { status: 403 }
      );
    }

    // Calculate session expiry based on settings
    const sessionExpiry = getSessionExpiryTime();
    const sessionTimeoutHours = systemSettings.security?.sessionTimeout || 24;

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        loginTime: Date.now(),
        sessionExpiry: sessionExpiry
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: `${sessionTimeoutHours}h` }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token,
      sessionExpiry,
      sessionTimeoutHours
    });
  } catch (error) {
    console.error('Login error:', error);
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