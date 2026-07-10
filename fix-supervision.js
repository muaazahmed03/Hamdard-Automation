const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSupervision() {
  try {
    console.log('🔧 Fixing supervision relationships...\n');

    // Find all accepted supervision requests
    const acceptedRequests = await prisma.supervisorRequest.findMany({
      where: {
        status: 'ACCEPTED'
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`📊 Found ${acceptedRequests.length} accepted supervision requests\n`);

    for (const request of acceptedRequests) {
      console.log(`Processing: ${request.student.name} -> ${request.teacher.name}`);

      // Find student's group
      const studentGroups = await prisma.groupMember.findMany({
        where: { userId: request.studentId },
        include: { 
          group: {
            include: {
              projects: true
            }
          } 
        }
      });

      if (studentGroups.length === 0) {
        console.log(`  ⚠️  Student ${request.student.name} is not in any group\n`);
        continue;
      }

      const group = studentGroups[0].group;
      console.log(`  📌 Group: ${group.name}`);

      // Update group approval
      await prisma.group.update({
        where: { id: group.id },
        data: { isApproved: true }
      });

      // Check if group has projects
      if (group.projects && group.projects.length > 0) {
        console.log(`  📋 Found ${group.projects.length} existing project(s)`);
        
        // Update all projects with supervisor
        for (const project of group.projects) {
          await prisma.project.update({
            where: { id: project.id },
            data: { 
              supervisorId: request.teacherId,
              status: project.status === 'PROPOSED' ? 'APPROVED' : project.status
            }
          });
          console.log(`  ✅ Updated project: ${project.title}`);
        }
      } else {
        // Create a new project for the group
        const newProject = await prisma.project.create({
          data: {
            title: `${group.name} - FYP Project`,
            description: `Final Year Project for group ${group.name}`,
            teacherId: request.teacherId,
            supervisorId: request.teacherId,
            groupId: group.id,
            status: 'APPROVED'
          }
        });
        console.log(`  ✨ Created new project: ${newProject.title}`);
      }
      
      console.log('');
    }

    // Verify the results
    console.log('\n📊 Final Check:');
    const projectsWithSupervisors = await prisma.project.findMany({
      where: {
        supervisorId: { not: null }
      },
      include: {
        supervisor: {
          select: {
            name: true
          }
        },
        group: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`\n✅ Projects with supervisors: ${projectsWithSupervisors.length}`);
    projectsWithSupervisors.forEach((project, index) => {
      console.log(`${index + 1}. ${project.title}`);
      console.log(`   Supervisor: ${project.supervisor.name}`);
      console.log(`   Group: ${project.group?.name || 'No group'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSupervision();
