import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Mock data for available teachers
    const teachers = [
      {
        id: 'teacher1',
        name: 'Dr. John Smith',
        email: 'john.smith@university.edu',
        department: 'Computer Science',
        specialization: 'Machine Learning',
        designation: 'Professor',
        employeeId: 'EMP001'
      },
      {
        id: 'teacher2',
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@university.edu',
        department: 'Software Engineering',
        specialization: 'Mobile Development',
        designation: 'Associate Professor',
        employeeId: 'EMP002'
      },
      {
        id: 'teacher3',
        name: 'Dr. Michael Brown',
        email: 'michael.brown@university.edu',
        department: 'Computer Science',
        specialization: 'Blockchain',
        designation: 'Assistant Professor',
        employeeId: 'EMP003'
      },
      {
        id: 'teacher4',
        name: 'Dr. Emily Davis',
        email: 'emily.davis@university.edu',
        department: 'Data Science',
        specialization: 'Big Data Analytics',
        designation: 'Professor',
        employeeId: 'EMP004'
      },
      {
        id: 'teacher5',
        name: 'Dr. James Wilson',
        email: 'james.wilson@university.edu',
        department: 'Computer Science',
        specialization: 'Cybersecurity',
        designation: 'Associate Professor',
        employeeId: 'EMP005'
      }
    ];

    return NextResponse.json(teachers);
  } catch (error) {
    console.error('Error fetching available teachers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available teachers' },
      { status: 500 }
    );
  }
}