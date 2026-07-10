const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPI() {
  try {
    // Get Emily's ID
    const emily = await prisma.user.findFirst({
      where: {
        email: 'emilydaphne01@gmail.com',
        role: 'TEACHER'
      }
    });

    if (!emily) {
      console.log('❌ Emily not found');
      return;
    }

    console.log(`✅ Teacher: ${emily.name} (${emily.id})\n`);

    // Simulate the API query
    const projects = await prisma.project.findMany({
      where: {
        supervisorId: emily.id,
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
                    rollNumber: true,
                    department: true,
                    gpa: true,
                    profileImage: true,
                    status: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`📊 Supervised projects: ${projects.length}\n`);

    const groupsMap = new Map();
    
    projects.forEach(project => {
      if (project.group && !groupsMap.has(project.group.id)) {
        groupsMap.set(project.group.id, {
          ...project.group,
          projects: []
        });
      }
      if (project.group) {
        groupsMap.get(project.group.id).projects.push({
          id: project.id,
          title: project.title,
          description: project.description,
          status: project.status
        });
      }
    });

    const groups = Array.from(groupsMap.values());
    console.log(`📊 Unique supervised groups: ${groups.length}\n`);

    groups.forEach((group, index) => {
      console.log(`${index + 1}. ${group.name}`);
      console.log(`   Members: ${group.members.length}`);
      console.log(`   Projects: ${group.projects.length}`);
      
      group.members.forEach(member => {
        console.log(`     - ${member.user.name} (${member.user.email})`);
      });
      
      group.projects.forEach(project => {
        console.log(`     📋 ${project.title} [${project.status}]`);
      });
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPI();
