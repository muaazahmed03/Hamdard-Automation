import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/forms/all - Admin: get all form submissions with user details
export async function GET(request: NextRequest) {
  try {
    const forms = await db.formSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Fetch user details for each form submission
    const formsWithUser = await Promise.all(
      forms.map(async (form: any) => {
        let userDetails = null;
        
        // Try to get user from submittedBy field
        if (form.submittedBy) {
          try {
            const user = await db.user.findUnique({
              where: { id: form.submittedBy },
              select: {
                id: true,
                name: true,
                email: true,
                rollNumber: true,
                department: true,
              }
            });
            userDetails = user;
          } catch (error) {
            console.error(`Error fetching user ${form.submittedBy}:`, error);
          }
        }
        
        // If no user found and form data has member info, try to get user from first member's email/rollNumber
        if (!userDetails && form.data) {
          try {
            // Check if form has members array
            if (form.data.members && Array.isArray(form.data.members) && form.data.members.length > 0) {
              const firstMember = form.data.members[0];
              if (firstMember.regNo) {
                const user = await db.user.findUnique({
                  where: { rollNumber: firstMember.regNo },
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    rollNumber: true,
                    department: true,
                  }
                });
                if (user) {
                  userDetails = user;
                }
              }
            }
          } catch (error) {
            // Silently fail - this is just a fallback
          }
        }

        return {
          id: form.id,
          type: form.type,
          data: form.data,
          submittedBy: form.submittedBy,
          submittedByName: userDetails?.name || null,
          submittedByEmail: userDetails?.email || null,
          submittedByRollNumber: userDetails?.rollNumber || null,
          submittedByDepartment: userDetails?.department || null,
          status: (form as any).status || 'PENDING',
          reviewedBy: (form as any).reviewedBy || null,
          reviewComments: (form as any).reviewComments || null,
          reviewedAt: (form as any).reviewedAt || null,
          createdAt: form.createdAt,
        };
      })
    );

    return NextResponse.json(formsWithUser);
  } catch (error: any) {
    console.error('Error fetching forms:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch forms',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
