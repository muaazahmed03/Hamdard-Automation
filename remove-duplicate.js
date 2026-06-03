const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeDuplicateAlpha() {
  try {
    // Delete the Alpha group with 2 members (ID: cmixmuqw6000gi6pk39z7e5bo)
    const groupIdToDelete = 'cmixmuqw6000gi6pk39z7e5bo';

    console.log('\n=== Removing Duplicate Alpha Group ===\n');

    // First delete the group members
    const deletedMembers = await prisma.groupMember.deleteMany({
      where: { groupId: groupIdToDelete }
    });
    console.log(`✓ Deleted ${deletedMembers.count} group members`);

    // Then delete the group
    const deletedGroup = await prisma.group.delete({
      where: { id: groupIdToDelete }
    });
    console.log(`✓ Deleted group: ${deletedGroup.name}`);

    // Verify remaining groups
    const remainingGroups = await prisma.group.findMany({
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });

    console.log('\n=== Remaining Groups ===');
    console.log(`Total groups: ${remainingGroups.length}\n`);

    remainingGroups.forEach(group => {
      console.log(`Group: ${group.name}`);
      console.log(`Members: ${group.members.length}`);
      group.members.forEach(member => {
        console.log(`  - ${member.user?.name} (${member.role})`);
      });
      console.log('---');
    });

    console.log('\n✅ Duplicate removed successfully!\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeDuplicateAlpha();
