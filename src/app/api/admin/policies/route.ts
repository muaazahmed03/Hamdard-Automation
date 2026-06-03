import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const POLICIES_FILE = path.join(process.cwd(), 'data', 'policy-documents.json')

// Ensure data directory and file exist
async function ensurePoliciesFile() {
  try {
    const dataDir = path.join(process.cwd(), 'data')
    await fs.mkdir(dataDir, { recursive: true })
    
    try {
      await fs.access(POLICIES_FILE)
    } catch {
      // File doesn't exist, create with default data
      const defaultData = {
        policies: [],
        acknowledgments: []
      }
      await fs.writeFile(POLICIES_FILE, JSON.stringify(defaultData, null, 2))
    }
  } catch (error) {
    console.error('Error ensuring policies file:', error)
  }
}

// GET - Fetch all policies and acknowledgments
export async function GET() {
  try {
    await ensurePoliciesFile()
    const data = await fs.readFile(POLICIES_FILE, 'utf-8')
    const policiesData = JSON.parse(data)
    
    return NextResponse.json({
      policies: policiesData.policies || [],
      acknowledgments: policiesData.acknowledgments || []
    })
  } catch (error) {
    console.error('Error reading policies:', error)
    return NextResponse.json(
      { 
        policies: [], 
        acknowledgments: [],
        error: 'Failed to load policies' 
      },
      { status: 500 }
    )
  }
}

// POST - Create new policy
export async function POST(request: Request) {
  try {
    await ensurePoliciesFile()
    const body = await request.json()
    
    const data = await fs.readFile(POLICIES_FILE, 'utf-8')
    const policiesData = JSON.parse(data)
    
    // Generate new ID
    const maxId = policiesData.policies.length > 0 
      ? Math.max(...policiesData.policies.map((p: any) => p.id))
      : 0
    
    const newPolicy = {
      id: maxId + 1,
      version: body.version,
      description: body.description,
      fileName: body.fileName,
      fileUrl: body.fileUrl,
      uploadedDate: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      uploadedBy: body.uploadedBy || 'Super Admin',
      isActive: body.isActive !== undefined ? body.isActive : false,
      acknowledgments: 0,
      totalStudents: body.totalStudents || 0
    }
    
    // If this policy is set as active, deactivate all others
    if (newPolicy.isActive) {
      policiesData.policies = policiesData.policies.map((p: any) => ({
        ...p,
        isActive: false
      }))
    }
    
    policiesData.policies.push(newPolicy)
    
    await fs.writeFile(POLICIES_FILE, JSON.stringify(policiesData, null, 2))
    
    return NextResponse.json(newPolicy)
  } catch (error) {
    console.error('Error creating policy:', error)
    return NextResponse.json(
      { error: 'Failed to create policy' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a policy
export async function DELETE(request: Request) {
  try {
    await ensurePoliciesFile()
    const { searchParams } = new URL(request.url)
    const policyId = searchParams.get('id')
    
    if (!policyId) {
      return NextResponse.json({ error: 'Policy ID required' }, { status: 400 })
    }
    
    const data = await fs.readFile(POLICIES_FILE, 'utf-8')
    const policiesData = JSON.parse(data)
    
    policiesData.policies = policiesData.policies.filter((p: any) => p.id !== parseInt(policyId))
    policiesData.acknowledgments = policiesData.acknowledgments.filter((a: any) => a.policyId !== parseInt(policyId))
    
    await fs.writeFile(POLICIES_FILE, JSON.stringify(policiesData, null, 2))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting policy:', error)
    return NextResponse.json(
      { error: 'Failed to delete policy' },
      { status: 500 }
    )
  }
}

// PATCH - Update policy (e.g., set active status)
export async function PATCH(request: Request) {
  try {
    await ensurePoliciesFile()
    const body = await request.json()
    const { id, isActive } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Policy ID required' }, { status: 400 })
    }
    
    const data = await fs.readFile(POLICIES_FILE, 'utf-8')
    const policiesData = JSON.parse(data)
    
    // If setting a policy as active, deactivate all others
    if (isActive) {
      policiesData.policies = policiesData.policies.map((p: any) => ({
        ...p,
        isActive: p.id === id
      }))
    } else {
      policiesData.policies = policiesData.policies.map((p: any) => 
        p.id === id ? { ...p, isActive: false } : p
      )
    }
    
    await fs.writeFile(POLICIES_FILE, JSON.stringify(policiesData, null, 2))
    
    const updatedPolicy = policiesData.policies.find((p: any) => p.id === id)
    return NextResponse.json(updatedPolicy)
  } catch (error) {
    console.error('Error updating policy:', error)
    return NextResponse.json(
      { error: 'Failed to update policy' },
      { status: 500 }
    )
  }
}
