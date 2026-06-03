import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Generate 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/forgot-password - Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // Always return success to prevent email enumeration attacks
    // But only send email if user exists
    if (user) {
      // Generate 6-digit verification code
      const verificationCode = generateVerificationCode();
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save verification code to database
      await db.user.update({
        where: { id: user.id },
        data: {
          resetToken: verificationCode,
          resetTokenExpiry,
        },
      });

      // Send password reset email with code
      try {
        const emailResult = await sendPasswordResetEmail(user.email, verificationCode, user.name || 'User');
        console.log('Password reset email sent:', emailResult.success ? '✅' : '❌', emailResult.error || '');
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Log the error but still return success for security
      }
    }

    // Always return success message
    return NextResponse.json({
      message: 'If an account with that email exists, a verification code has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
