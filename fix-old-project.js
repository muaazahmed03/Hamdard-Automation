const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOldProject() {
  try {
    console.log('🔧 Fixing old project...\n');

    // Get Emily
    const emily = await prisma.user.findFirst({
      where: {
        email: 'emilydaphne01@gmail.com',
        role: 'TEACHER'
      }
    });

    // Get Alpha group
    const alphaGroup = await prisma.group.findFirst({
      where: { name: 'Alpha' }
    });

    if (!emily || !alphaGroup) {
      console.log('❌ Emily or Alpha group not found');
      return;
    }

    // Update the ARDUINO ROBOT project
    const arduinoProject = await prisma.project.findFirst({
      where: { title: 'ARDUINO ROBOT' }
    });

    if (arduinoProject) {
      const updated = await prisma.project.update({
        where: { id: arduinoProject.id },
        data: {
          supervisorId: emily.id,
          groupId: alphaGroup.id,
          status: 'APPROVED'
        }
      });

      console.log(`✅ Updated project: ${updated.title}`);
      console.log(`   Supervisor: ${updated.supervisorId}`);
      console.log(`   Group: ${updated.groupId}`);
      console.log(`   Status: ${updated.status}\n`);
    }

    // Verify supervised projects now
    const supervisedProjects = await prisma.project.findMany({
      where: {
        supervisorId: emily.id
      },
      include: {
        group: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`📊 Emily now supervises ${supervisedProjects.length} projects:`);
    supervisedProjects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.title} (Group: ${project.group?.name || 'N/A'})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOldProject();
