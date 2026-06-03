import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updatedData = await request.json()

    // Check if committee exists
    const existingCommittee = await db.committee.findUnique({
      where: { id }
    })

    if (!existingCommittee) {
      return NextResponse.json(
        { error: 'Committee not found' },
        { status: 404 }
      )
    }

    // Update the committee in database
    const updatedCommittee = await db.committee.update({
      where: { id },
      data: {
        name: updatedData.name || existingCommittee.name,
        description: updatedData.description !== undefined ? updatedData.description : existingCommittee.description,
        chairpersonId: updatedData.headId || existingCommittee.chairpersonId,
        members: updatedData.memberIds && Array.isArray(updatedData.memberIds)
          ? JSON.stringify(updatedData.memberIds)
          : existingCommittee.members,
        isActive: updatedData.isActive !== undefined ? updatedData.isActive : existingCommittee.isActive
      }
    })

    // Format response
    const formattedCommittee = {
      id: updatedCommittee.id,
      name: updatedCommittee.name,
      description: updatedCommittee.description,
      head: updatedData.head || '',
      headId: updatedCommittee.chairpersonId,
      memberIds: updatedData.memberIds || (updatedCommittee.members ? JSON.parse(updatedCommittee.members) : []),
      members: updatedData.members || [],
      status: updatedCommittee.isActive ? 'Active' : 'Inactive',
      created: updatedCommittee.createdAt.toISOString().split('T')[0],
      isActive: updatedCommittee.isActive
    }

    return NextResponse.json({
      message: 'Committee updated successfully',
      committee: formattedCommittee
    })
  } catch (error) {
    console.error('Committee update error:', error)
    return NextResponse.json(
      { error: 'Failed to update committee', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if committee exists
    const existingCommittee = await db.committee.findUnique({
      where: { id }
    })

    if (!existingCommittee) {
      return NextResponse.json(
        { error: 'Committee not found' },
        { status: 404 }
      )
    }

    // Delete the committee from database
    await db.committee.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Committee deleted successfully',
      committee: {
        id: existingCommittee.id,
        name: existingCommittee.name
      }
    })
  } catch (error) {
    console.error('Committee deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete committee', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}