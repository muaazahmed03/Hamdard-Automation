const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeAdmin() {
  try {
    console.log('Removing admin@hamdard.edu...');
    
    const result = await prisma.user.delete({
      where: {
        email: 'admin@hamdard.edu'
      }
    });
    
    console.log('✅ Successfully removed:', result.email);
    
    // Verify remaining users
    const users = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        role: true,
        status: true
      }
    });
    
    console.log('\n📋 Remaining users:');
    users.forEach(user => {
      console.log(`   ${user.email} - ${user.role} (${user.status})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

removeAdmin();
