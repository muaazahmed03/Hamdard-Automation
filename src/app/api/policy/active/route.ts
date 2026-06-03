import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const POLICIES_FILE = path.join(process.cwd(), 'data', 'policy-documents.json')

// Ensure file exists
async function ensurePoliciesFile() {
  try {
    const dataDir = path.join(process.cwd(), 'data')
    await fs.mkdir(dataDir, { recursive: true })
    
    try {
      await fs.access(POLICIES_FILE)
    } catch {
      const defaultData = { policies: [], acknowledgments: [] }
      await fs.writeFile(POLICIES_FILE, JSON.stringify(defaultData, null, 2))
    }
  } catch (error) {
    console.error('Error ensuring policies file:', error)
  }
}

// GET - Fetch active policy
export async function GET(request: NextRequest) {
  try {
    await ensurePoliciesFile()
    const data = await fs.readFile(POLICIES_FILE, 'utf-8')
    const policiesData = JSON.parse(data)
    
    // Find the active policy
    const activePolicy = policiesData.policies?.find((p: any) => p.isActive === true)
    
    if (!activePolicy) {
      return NextResponse.json(
        { error: 'No active policy found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...activePolicy,
      requireAcknowledgment: true
    })
  } catch (error) {
    console.error('Error fetching active policy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active policy' },
      { status: 500 }
    )
  }
}

// POST - Record student acknowledgment
export async function POST(request: NextRequest) {
  try {
    await ensurePoliciesFile()
    const body = await request.json()
    const { studentId, studentName, studentEmail, department, rollNumber, policyVersion, policyId } = body

    const data = await fs.readFile(POLICIES_FILE, 'utf-8')
    const policiesData = JSON.parse(data)

    // Check if already acknowledged
    const existingAck = policiesData.acknowledgments?.find(
      (a: any) => a.studentId === studentId && a.policyId === policyId
    )

    if (existingAck) {
      return NextResponse.json({
        success: true,
        message: 'Already acknowledged'
      })
    }

    // Generate new ID
    const maxId = policiesData.acknowledgments?.length > 0 
      ? Math.max(...policiesData.acknowledgments.map((a: any) => a.id))
      : 0

    const newAcknowledgment = {
      id: maxId + 1,
      policyId: policyId || 1,
      studentId,
      studentName,
      studentEmail,
      department,
      rollNumber,
      acknowledgedDate: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      policyVersion
    }

    if (!policiesData.acknowledgments) {
      policiesData.acknowledgments = []
    }

    policiesData.acknowledgments.push(newAcknowledgment)

    // Update acknowledgment count for the policy
    policiesData.policies = policiesData.policies.map((p: any) => {
      if (p.id === policyId || p.version === policyVersion) {
        return {
          ...p,
          acknowledgments: (p.acknowledgments || 0) + 1
        }
      }
      return p
    })

    await fs.writeFile(POLICIES_FILE, JSON.stringify(policiesData, null, 2))

    return NextResponse.json({
      success: true,
      message: 'Policy acknowledgment recorded'
    })
  } catch (error) {
    console.error('Error recording policy acknowledgment:', error)
    return NextResponse.json(
      { error: 'Failed to record acknowledgment' },
      { status: 500 }
    )
  }
}

