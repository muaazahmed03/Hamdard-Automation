const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSupervision() {
  try {
    console.log('🔍 Checking supervision data...\n');

    // Get Emily's user ID (the teacher)
    const emily = await prisma.user.findFirst({
      where: {
        email: 'emilybashe91@gmail.com',
        role: 'TEACHER'
      }
    });

    if (!emily) {
      console.log('❌ Emily not found');
      return;
    }

    console.log('✅ Teacher found:', emily.name, '(ID:', emily.id, ')\n');

    // Check projects where Emily is supervisor
    const projects = await prisma.project.findMany({
      where: {
        supervisorId: emily.id
      },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    rollNumber: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`📊 Projects supervised by Emily: ${projects.length}\n`);

    if (projects.length === 0) {
      console.log('❌ No projects found with Emily as supervisor');
      
      // Check all projects
      const allProjects = await prisma.project.findMany({
        select: {
          id: true,
          title: true,
          supervisorId: true,
          groupId: true
        }
      });
      
      console.log('\n📋 All projects in database:');
      allProjects.forEach(p => {
        console.log(`  - ${p.title} | Supervisor: ${p.supervisorId || 'NONE'} | Group: ${p.groupId || 'NONE'}`);
      });
    } else {
      projects.forEach((project, index) => {
        console.log(`${index + 1}. Project: ${project.title}`);
        console.log(`   Status: ${project.status}`);
        console.log(`   Group: ${project.group?.name || 'No group assigned'}`);
        if (project.group) {
          console.log(`   Members: ${project.group.members.length}`);
          project.group.members.forEach(member => {
            console.log(`     - ${member.user.name} (${member.user.rollNumber || 'No roll'})`);
          });
        }
        console.log('');
      });
    }

    // Check supervisor requests
    const requests = await prisma.supervisorRequest.findMany({
      where: {
        teacherId: emily.id
      },
      include: {
        student: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`\n📨 Supervision requests for Emily: ${requests.length}`);
    requests.forEach(req => {
      console.log(`  - From: ${req.student.name} | Status: ${req.status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSupervision();
