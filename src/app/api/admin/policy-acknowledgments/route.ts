import { NextResponse } from 'next/server'
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

// POST - Record acknowledgment
export async function POST(request: Request) {
  try {
    await ensurePoliciesFile()
    const body = await request.json()
    
    const data = await fs.readFile(POLICIES_FILE, 'utf-8')
    const policiesData = JSON.parse(data)
    
    // Check if already acknowledged
    const existingAck = policiesData.acknowledgments?.find(
      (a: any) => a.studentId === body.studentId && a.policyId === body.policyId
    )
    
    if (existingAck) {
      return NextResponse.json({ 
        success: true, 
        message: 'Already acknowledged',
        acknowledgment: existingAck 
      })
    }
    
    // Generate new ID
    const maxId = policiesData.acknowledgments?.length > 0 
      ? Math.max(...policiesData.acknowledgments.map((a: any) => a.id))
      : 0
    
    const newAcknowledgment = {
      id: maxId + 1,
      policyId: body.policyId,
      studentId: body.studentId,
      studentName: body.studentName,
      studentEmail: body.studentEmail,
      department: body.department,
      rollNumber: body.rollNumber,
      acknowledgedDate: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      policyVersion: body.policyVersion
    }
    
    if (!policiesData.acknowledgments) {
      policiesData.acknowledgments = []
    }
    
    policiesData.acknowledgments.push(newAcknowledgment)
    
    // Update acknowledgment count for the policy
    policiesData.policies = policiesData.policies.map((p: any) => {
      if (p.id === body.policyId) {
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
      acknowledgment: newAcknowledgment 
    })
  } catch (error) {
    console.error('Error recording acknowledgment:', error)
    return NextResponse.json(
      { error: 'Failed to record acknowledgment' },
      { status: 500 }
    )
  }
}

// GET - Get acknowledgments for a policy
export async function GET(request: Request) {
  try {
    await ensurePoliciesFile()
    const { searchParams } = new URL(request.url)
    const policyId = searchParams.get('policyId')
    
    const data = await fs.readFile(POLICIES_FILE, 'utf-8')
    const policiesData = JSON.parse(data)
    
    let acknowledgments = policiesData.acknowledgments || []
    
    if (policyId) {
      acknowledgments = acknowledgments.filter((a: any) => a.policyId === parseInt(policyId))
    }
    
    return NextResponse.json(acknowledgments)
  } catch (error) {
    console.error('Error fetching acknowledgments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch acknowledgments' },
      { status: 500 }
    )
  }
}
