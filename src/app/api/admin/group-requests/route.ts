import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'

// GET all group requests
export async function GET() {
  try {
    const requests = await prisma.groupRequest.findMany({
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true
          }
        },
        toUser: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching group requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch group requests' },
      { status: 500 }
    )
  }
}
