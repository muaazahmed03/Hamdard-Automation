import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEPARTMENTS =
  'Computer Science, Software Engineering, Information Technology, Data Science, Cyber Security';

async function main() {
  console.log('🌱 Seeding faculties and demo users...');

  await prisma.faculty.upsert({
    where: { name: 'Faculty of Engineering & Technology' },
    update: { departments: DEPARTMENTS, isActive: true },
    create: {
      name: 'Faculty of Engineering & Technology',
      code: 'FET',
      description: 'Default faculty for FYP portal',
      departments: DEPARTMENTS,
      isActive: true,
    },
  });

  const users = [
    {
      name: 'Admin (Super Admin)',
      email: 'ahmedshayan928@gmail.com',
      password: 'admin12345',
      role: 'ADMIN',
      status: 'APPROVED',
      department: 'Computer Science',
    },
    {
      name: 'Committee Head',
      email: 'committee@hamdard.edu',
      password: 'committee12345',
      role: 'COMMITTEE_HEAD',
      status: 'APPROVED',
      department: 'Computer Science',
    },
    {
      name: 'Teacher',
      email: 'teacher@hamdard.edu',
      password: 'teacher12345',
      role: 'TEACHER',
      status: 'APPROVED',
      department: 'Computer Science',
    },
    {
      name: 'Student',
      email: 'student@hamdard.edu',
      password: 'student12345',
      role: 'STUDENT',
      status: 'APPROVED',
      rollNumber: 'BSCS-DEMO-001',
      department: 'Computer Science',
      gpa: 3.5,
    },
  ];

  for (const u of users) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        password: hashedPassword,
        role: u.role,
        status: u.status,
        department: u.department,
        rollNumber: u.rollNumber ?? null,
        gpa: u.gpa ?? null,
        isActive: true,
      },
      create: {
        name: u.name,
        email: u.email,
        password: hashedPassword,
        role: u.role,
        status: u.status,
        department: u.department,
        rollNumber: u.rollNumber ?? null,
        gpa: u.gpa ?? null,
        isActive: true,
      },
    });

    if (u.role === 'STUDENT') {
      await prisma.studentProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          semester: 1,
          batch: new Date().getFullYear().toString(),
          faculty: 'Faculty of Engineering & Technology',
          session: '2022-2026',
          contactInfo: '03000000000',
          cgpa: u.gpa ?? 3.5,
          prerequisitesPassed: true,
          eligibilityStatus: 'ELIGIBLE',
          policyAccepted: true,
          policyAcceptedAt: new Date(),
        },
      });
    }

    if (u.role === 'TEACHER') {
      await prisma.teacherProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          employeeId: `EMP-${user.id.slice(0, 8)}`,
          designation: 'Faculty Member',
          officeHours: '9:00 AM - 5:00 PM',
        },
      });
    }

    console.log(`  ✓ ${u.role} → ${u.email} / ${u.password}`);
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
