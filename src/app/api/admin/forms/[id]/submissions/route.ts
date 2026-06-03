import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const FORMS_FILE = path.join(process.cwd(), 'data', 'forms.json')

// GET - Get submissions for a specific form
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formId = parseInt(params.id)
    
    const data = await fs.readFile(FORMS_FILE, 'utf-8')
    const formsData = JSON.parse(data)
    
    const submissions = formsData.submissions?.filter((s: any) => s.formId === formId) || []
    
    return NextResponse.json({ submissions })
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return NextResponse.json(
      { submissions: [] },
      { status: 500 }
    )
  }
}
