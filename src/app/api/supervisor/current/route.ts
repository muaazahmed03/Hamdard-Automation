import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Mock current supervisor data
    const supervisor = {
      id: 'teacher2',
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@university.edu',
      department: 'Software Engineering',
      specialization: 'Mobile Development',
      designation: 'Associate Professor',
      employeeId: 'EMP002',
      officeHours: 'Monday, Wednesday: 2:00 PM - 4:00 PM'
    };

    return NextResponse.json(supervisor);
  } catch (error) {
    console.error('Error fetching current supervisor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current supervisor' },
      { status: 500 }
    );
  }
}