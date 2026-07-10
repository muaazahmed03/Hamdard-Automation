import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { sendWelcomeEmail } from '@/lib/email';

const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().min(6).max(6),
});

// POST /api/auth/verify-email - Verify registration email OTP
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = verifyEmailSchema.parse(body);

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        emailVerifyToken: true,
        emailVerifyExpiry: true,
        studentProfile: {
          select: {
            eligibilityStatus: true,
            cgpa: true,
            prerequisitesPassed: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid verification code or email' },
        { status: 400 },
      );
    }

    if (user.emailVerified) {
      return NextResponse.json({
        message: 'Email is already verified. Your registration is pending approval.',
        userId: user.id,
        emailVerified: true,
        eligibilityStatus: user.studentProfile?.eligibilityStatus,
        requiresConditional:
          user.role === 'STUDENT' &&
          user.studentProfile?.eligibilityStatus === 'CONDITIONAL',
      });
    }

    if (
      !user.emailVerifyToken ||
      user.emailVerifyToken !== code ||
      !user.emailVerifyExpiry ||
      user.emailVerifyExpiry < new Date()
    ) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 },
      );
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
      },
    });

    // Now that email is verified, notify user that approval is pending
    try {
      await sendWelcomeEmail(
        updatedUser.email,
        updatedUser.name || 'User',
        updatedUser.role,
      );
    } catch (emailError) {
      console.error('Failed to send welcome email after verification:', emailError);
    }

    const eligibilityStatus = user.studentProfile?.eligibilityStatus;
    const requiresConditional =
      user.role === 'STUDENT' && eligibilityStatus === 'CONDITIONAL';

    return NextResponse.json({
      message: requiresConditional
        ? 'Email verified. Please complete conditional registration details.'
        : 'Email verified successfully. Your registration is now pending admin approval.',
      user: updatedUser,
      userId: updatedUser.id,
      emailVerified: true,
      eligibilityStatus,
      requiresConditional,
      cgpa: user.studentProfile?.cgpa,
      prerequisitesPassed: user.studentProfile?.prerequisitesPassed,
    });
  } catch (error) {
    console.error('Verify email error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 },
    );
  }
}
