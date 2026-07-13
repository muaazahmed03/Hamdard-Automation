import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { sendRegistrationVerificationEmail } from '@/lib/email';

const resendSchema = z.object({
  email: z.string().email('Invalid email address'),
});

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/resend-verification - Resend registration email OTP
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = resendSchema.parse(body);

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        status: true,
      },
    });

    // Always return success-style message to avoid email enumeration,
    // but only send when an unverified pending account exists.
    if (user && !user.emailVerified && user.status === 'PENDING') {
      const verificationCode = generateVerificationCode();
      const emailVerifyExpiry = new Date(Date.now() + 3600000);

      await db.user.update({
        where: { id: user.id },
        data: {
          emailVerifyToken: verificationCode,
          emailVerifyExpiry,
        },
      });

      const emailResult = await sendRegistrationVerificationEmail(
        user.email,
        verificationCode,
        user.name || 'User',
      );

      if (!emailResult.success) {
        console.error('Failed to resend verification email:', emailResult.error);
        return NextResponse.json(
          {
            error:
              'Could not send verification email. Check Gmail App Password settings and try again.',
          },
          { status: 502 },
        );
      }
    }

    return NextResponse.json({
      message:
        'If an unverified account exists for that email, a new verification code has been sent.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address', details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 },
    );
  }
}
