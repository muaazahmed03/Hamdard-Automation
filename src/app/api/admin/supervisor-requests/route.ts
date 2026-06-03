import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'

// GET all supervisor requests
export async function GET() {
  try {
    const requests = await prisma.supervisorRequest.findMany({
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true
          }
        },
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
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

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching supervisor requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supervisor requests' },
      { status: 500 }
    )
  }
}
