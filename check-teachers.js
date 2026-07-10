const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTeachers() {
  try {
    console.log('🔍 Checking all teachers...\n');

    const teachers = await prisma.user.findMany({
      where: {
        role: 'TEACHER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    console.log(`📊 Total teachers: ${teachers.length}\n`);
    teachers.forEach((teacher, index) => {
      console.log(`${index + 1}. ${teacher.name}`);
      console.log(`   Email: ${teacher.email}`);
      console.log(`   ID: ${teacher.id}\n`);
    });

    // Check projects with supervisors
    const projectsWithSupervisors = await prisma.project.findMany({
      where: {
        supervisorId: { not: null }
      },
      include: {
        supervisor: {
          select: {
            name: true,
            email: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`\n📋 Projects with supervisors assigned: ${projectsWithSupervisors.length}\n`);
    projectsWithSupervisors.forEach((project, index) => {
      console.log(`${index + 1}. ${project.title}`);
      console.log(`   Supervisor: ${project.supervisor.name} (${project.supervisor.email})`);
      console.log(`   Group: ${project.group?.name || 'No group'}`);
      console.log(`   Supervisor ID: ${project.supervisorId}\n`);
    });

    // Check all groups
    const groups = await prisma.group.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        projects: {
          select: {
            title: true,
            supervisorId: true
          }
        }
      }
    });

    console.log(`\n👥 Total groups: ${groups.length}\n`);
    groups.forEach((group, index) => {
      console.log(`${index + 1}. ${group.name}`);
      console.log(`   Members: ${group.members.length}`);
      console.log(`   Projects: ${group.projects.length}`);
      if (group.projects.length > 0) {
        group.projects.forEach(p => {
          console.log(`     - ${p.title} | Supervisor: ${p.supervisorId || 'NONE'}`);
        });
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTeachers();
