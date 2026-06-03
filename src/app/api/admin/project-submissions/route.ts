import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'

// GET all project submissions
export async function GET() {
  try {
    const submissions = await prisma.projectSubmission.findMany({
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true
          }
        },
        project: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(submissions)
  } catch (error) {
    console.error('Error fetching project submissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project submissions' },
      { status: 500 }
    )
  }
}
