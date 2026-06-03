const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateAllTeachers() {
  try {
    console.log('Updating all teachers departments...');
    
    // Update teacher@hamdard.edu
    await prisma.user.update({
      where: { email: 'teacher@hamdard.edu' },
      data: { department: 'Computer Science' }
    });
    console.log('✅ Updated teacher@hamdard.edu');
    
    // Update emilydaphne01@gmail.com
    await prisma.user.update({
      where: { email: 'emilydaphne01@gmail.com' },
      data: { department: 'Software Engineering' }
    });
    console.log('✅ Updated emilydaphne01@gmail.com');
    
    // Show all teachers
    const teachers = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
        status: 'APPROVED'
      },
      select: {
        email: true,
        name: true,
        department: true,
        status: true
      }
    });
    
    console.log('\n📋 All approved teachers:');
    teachers.forEach(teacher => {
      console.log(`   ${teacher.name} (${teacher.email})`);
      console.log(`   Department: ${teacher.department}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateAllTeachers();
