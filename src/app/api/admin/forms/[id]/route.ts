import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const FORMS_FILE = path.join(process.cwd(), 'data', 'forms.json')

// PUT - Update form
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formId = parseInt(params.id)
    const body = await request.json()
    
    const data = await fs.readFile(FORMS_FILE, 'utf-8')
    const formsData = JSON.parse(data)
    
    const formIndex = formsData.forms.findIndex((f: any) => f.id === formId)
    
    if (formIndex === -1) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      )
    }
    
    // Update form
    formsData.forms[formIndex] = {
      ...formsData.forms[formIndex],
      ...body,
      updatedAt: new Date().toISOString()
    }
    
    await fs.writeFile(FORMS_FILE, JSON.stringify(formsData, null, 2))
    
    return NextResponse.json(formsData.forms[formIndex])
  } catch (error) {
    console.error('Error updating form:', error)
    return NextResponse.json(
      { error: 'Failed to update form' },
      { status: 500 }
    )
  }
}

// DELETE - Delete form
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formId = parseInt(params.id)
    
    const data = await fs.readFile(FORMS_FILE, 'utf-8')
    const formsData = JSON.parse(data)
    
    formsData.forms = formsData.forms.filter((f: any) => f.id !== formId)
    formsData.submissions = formsData.submissions.filter((s: any) => s.formId !== formId)
    
    await fs.writeFile(FORMS_FILE, JSON.stringify(formsData, null, 2))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting form:', error)
    return NextResponse.json(
      { error: 'Failed to delete form' },
      { status: 500 }
    )
  }
}
