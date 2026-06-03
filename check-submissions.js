const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const subs = await prisma.projectSubmission.findMany({
      include: { student: true },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\nTotal files in database: ${subs.length}\n`);
    subs.forEach((s, i) => {
      console.log(`${i+1}. ${s.fileName}`);
      console.log(`   Student: ${s.student.name} (${s.studentId})`);
      console.log(`   Type: ${s.fileType}`);
      console.log(`   Status: ${s.status}`);
      console.log(`   ProjectId: ${s.projectId || 'null'}`);
      console.log(`   Created: ${s.createdAt.toLocaleString()}\n`);
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
