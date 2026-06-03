const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  try {
    console.log('🧹 Cleaning up duplicate project...\n');

    // Delete the auto-created "Alpha - FYP Project"
    const autoProject = await prisma.project.findFirst({
      where: { title: 'Alpha - FYP Project' }
    });

    if (autoProject) {
      await prisma.project.delete({
        where: { id: autoProject.id }
      });
      console.log(`✅ Deleted: ${autoProject.title}\n`);
    }

    // Verify final state
    const emily = await prisma.user.findFirst({
      where: { email: 'emilydaphne01@gmail.com' }
    });

    const projects = await prisma.project.findMany({
      where: {
        supervisorId: emily?.id
      },
      include: {
        group: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`📊 Final supervised projects: ${projects.length}`);
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.title} (Group: ${project.group?.name || 'N/A'})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
