const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateTeacher() {
  try {
    console.log('Updating teacher department...');
    
    const result = await prisma.user.update({
      where: {
        email: 'teacher@hamdard.edu'
      },
      data: {
        department: 'Computer Science'
      }
    });
    
    console.log('✅ Successfully updated teacher:', result.email);
    console.log('   Department:', result.department);
    
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
      console.log(`   Department: ${teacher.department || 'Not set'}`);
      console.log(`   Status: ${teacher.status}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateTeacher();
