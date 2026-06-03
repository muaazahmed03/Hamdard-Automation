import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const conditionalSchema = z.object({
  userId: z.string(),
  unpassedCourses: z.string().optional(),
  conditionalCommitment: z.string().min(10),
});

// POST /api/auth/complete-conditional - Complete conditional registration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = conditionalSchema.parse(body);

    // Find the user's student profile
    const studentProfile = await db.studentProfile.findUnique({
      where: {
        userId: validatedData.userId,
      },
    });

    if (!studentProfile) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    // Update the student profile with conditional information
    await db.studentProfile.update({
      where: {
        userId: validatedData.userId,
      },
      data: {
        unpassedCourses: validatedData.unpassedCourses,
        conditionalCommitment: validatedData.conditionalCommitment,
      },
    });

    return NextResponse.json({
      message: 'Conditional registration completed successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('Conditional registration error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
