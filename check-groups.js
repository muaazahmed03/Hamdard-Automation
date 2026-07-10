const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGroups() {
  try {
    const groups = await prisma.group.findMany({
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });

    console.log('\n=== DATABASE GROUPS ===');
    console.log(`Total groups found: ${groups.length}\n`);

    groups.forEach(group => {
      console.log(`Group ID: ${group.id}`);
      console.log(`Name: ${group.name}`);
      console.log(`Active: ${group.isActive}`);
      console.log(`Approved: ${group.isApproved}`);
      console.log(`Members: ${group.members.length}`);
      group.members.forEach(member => {
        console.log(`  - ${member.user?.name} (${member.role})`);
      });
      console.log('---');
    });

    // Now update any inactive groups to be active
    if (groups.some(g => !g.isActive)) {
      console.log('\nUpdating inactive groups to be active...');
      await prisma.group.updateMany({
        where: { isActive: false },
        data: { isActive: true }
      });
      console.log('✓ All groups are now active');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGroups();
