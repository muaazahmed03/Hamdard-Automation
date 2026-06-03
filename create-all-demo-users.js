const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createDemoUsers() {
  try {
    // Demo users data
    const demoUsers = [
      {
        name: 'Super Admin',
        email: 'ahmedshayan928@gmail.com',
        password: 'admin123',
        role: 'ADMIN',
        department: 'Administration'
      },
      {
        name: 'Committee Head',
        email: 'committee@hamdard.edu',
        password: 'committee123',
        role: 'COMMITTEE_HEAD',
        department: 'Computer Science'
      },
      {
        name: 'Teacher User',
        email: 'teacher@hamdard.edu',
        password: 'teacher123',
        role: 'TEACHER',
        department: 'Computer Science'
      },
      {
        name: 'Student User',
        email: 'student@hamdard.edu',
        password: 'student123',
        role: 'STUDENT',
        department: 'Computer Science',
        rollNumber: 'CS2024001',
        gpa: 3.5
      }
    ];

    console.log('Creating demo users...');

    for (const userData of demoUsers) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          department: userData.department,
          ...(userData.rollNumber && { rollNumber: userData.rollNumber }),
          ...(userData.gpa && { gpa: userData.gpa })
        }
      });

      console.log(`Created ${userData.role}: ${user.email}`);

      // Create profile based on role
      if (userData.role === 'STUDENT') {
        await prisma.studentProfile.create({
          data: {
            userId: user.id,
            semester: 7,
            batch: '2024',
            interests: 'AI, Web Development',
            skills: 'JavaScript, React, Node.js'
          }
        });
      } else if (userData.role === 'TEACHER') {
        await prisma.teacherProfile.create({
          data: {
            userId: user.id,
            employeeId: `EMP${Date.now()}`,
            designation: 'Assistant Professor',
            officeHours: '10:00 AM - 4:00 PM'
          }
        });
      }
    }

    console.log('Demo users created successfully!');
    console.log('\nDemo Accounts:');
    console.log('Admin (Super Admin): ahmedshayan928@gmail.com / admin123');
    console.log('Committee Head: committee@hamdard.edu / committee123');
    console.log('Teacher: teacher@hamdard.edu / teacher123');
    console.log('Student: student@hamdard.edu / student123');
    console.log('\nAccess Passes:');
    console.log('Admin: ADMIN@2024');
    console.log('Committee Head: COMMITTEE@2024');

  } catch (error) {
    console.error('Error creating demo users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoUsers();