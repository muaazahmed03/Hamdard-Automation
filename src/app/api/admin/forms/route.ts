import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const FORMS_FILE = path.join(process.cwd(), 'data', 'forms.json')

// Ensure data directory and file exist
async function ensureFormsFile() {
  try {
    const dataDir = path.join(process.cwd(), 'data')
    await fs.mkdir(dataDir, { recursive: true })
    
    try {
      await fs.access(FORMS_FILE)
    } catch {
      const defaultData = {
        forms: [],
        submissions: []
      }
      await fs.writeFile(FORMS_FILE, JSON.stringify(defaultData, null, 2))
    }
  } catch (error) {
    console.error('Error ensuring forms file:', error)
  }
}

// GET - Fetch all forms
export async function GET() {
  try {
    await ensureFormsFile()
    const data = await fs.readFile(FORMS_FILE, 'utf-8')
    const formsData = JSON.parse(data)
    
    // Count submissions for each form
    const formsWithCounts = formsData.forms.map((form: any) => ({
      ...form,
      submissionsCount: formsData.submissions?.filter((s: any) => s.formId === form.id).length || 0
    }))
    
    return NextResponse.json({
      forms: formsWithCounts,
      submissions: formsData.submissions || []
    })
  } catch (error) {
    console.error('Error reading forms:', error)
    return NextResponse.json(
      { forms: [], submissions: [] },
      { status: 500 }
    )
  }
}

// POST - Create new form
export async function POST(request: Request) {
  try {
    await ensureFormsFile()
    const body = await request.json()
    
    const data = await fs.readFile(FORMS_FILE, 'utf-8')
    const formsData = JSON.parse(data)
    
    const maxId = formsData.forms.length > 0 
      ? Math.max(...formsData.forms.map((f: any) => f.id))
      : 0
    
    const newForm = {
      id: maxId + 1,
      formName: body.formName,
      description: body.description || '',
      fields: body.fields || [],
      isActive: body.isActive !== undefined ? body.isActive : false,
      createdAt: new Date().toISOString(),
      createdBy: body.createdBy || 'Super Admin'
    }
    
    // If this form is set as active, optionally handle activation logic
    formsData.forms.push(newForm)
    
    await fs.writeFile(FORMS_FILE, JSON.stringify(formsData, null, 2))
    
    return NextResponse.json(newForm)
  } catch (error) {
    console.error('Error creating form:', error)
    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    )
  }
}
