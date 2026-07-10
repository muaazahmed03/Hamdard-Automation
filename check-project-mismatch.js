const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProjectMismatch() {
  try {
    console.log('🔍 Checking project relationships...\n');

    // Get all projects
    const allProjects = await prisma.project.findMany({
      include: {
        supervisor: {
          select: {
            name: true
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

    console.log(`📊 All projects: ${allProjects.length}\n`);
    allProjects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.title}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Supervisor: ${project.supervisor?.name || 'NONE'}`);
      console.log(`   Group: ${project.group?.name || 'NONE'}`);
      console.log(`   Status: ${project.status}\n`);
    });

    // Get the submission
    const submission = await prisma.projectSubmission.findFirst({
      include: {
        student: {
          select: {
            name: true
          }
        },
        project: true
      }
    });

    if (submission) {
      console.log(`📤 Submission details:`);
      console.log(`   File: ${submission.fileName}`);
      console.log(`   Student: ${submission.student.name}`);
      console.log(`   Project ID: ${submission.projectId}`);
      console.log(`   Project Title: ${submission.project?.title || 'N/A'}\n`);
    }

    // Get Stacy's group membership
    const stacy = await prisma.user.findFirst({
      where: { name: 'Stacy' }
    });

    if (stacy) {
      const groupMemberships = await prisma.groupMember.findMany({
        where: { userId: stacy.id },
        include: {
          group: {
            include: {
              projects: true
            }
          }
        }
      });

      console.log(`👤 Stacy's groups: ${groupMemberships.length}`);
      groupMemberships.forEach((membership, index) => {
        console.log(`${index + 1}. Group: ${membership.group.name}`);
        console.log(`   Projects in group: ${membership.group.projects.length}`);
        membership.group.projects.forEach(p => {
          console.log(`     - ${p.title} (ID: ${p.id})`);
        });
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProjectMismatch();
