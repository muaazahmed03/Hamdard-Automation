import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'

// PATCH - Update supervisor request status
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json()
    const { id } = params

    const updated = await prisma.supervisorRequest.update({
      where: { id },
      data: { status }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating supervisor request:', error)
    return NextResponse.json(
      { error: 'Failed to update supervisor request' },
      { status: 500 }
    )
  }
}
