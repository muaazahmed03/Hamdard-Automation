const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFiles() {
  try {
    console.log('🔍 Checking uploaded files...\n');

    // Get Emily
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

    // Get supervised projects
    const projects = await prisma.project.findMany({
      where: {
        supervisorId: emily.id,
      },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    console.log(`📊 Supervised projects: ${projects.length}\n`);

    if (projects.length === 0) {
      console.log('❌ No supervised projects found\n');
      return;
    }

    // Get student IDs
    const studentIds = projects
      .filter(p => p.group)
      .flatMap(p => p.group.members.map(member => member.userId));

    console.log(`👥 Supervised students: ${studentIds.length}`);
    console.log(`   Student IDs: ${studentIds.join(', ')}\n`);

    // Get project IDs
    const projectIds = projects.map(p => p.id);
    console.log(`📋 Project IDs: ${projectIds.join(', ')}\n`);

    // Check for project submissions
    const submissions = await prisma.projectSubmission.findMany({
      where: {
        OR: [
          { studentId: { in: studentIds } },
          { projectId: { in: projectIds } },
        ],
      },
      include: {
        student: {
          select: {
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            title: true,
          },
        },
      },
    });

    console.log(`📤 Total submissions: ${submissions.length}\n`);

    if (submissions.length === 0) {
      console.log('ℹ️  No files uploaded yet by supervised students\n');
    } else {
      submissions.forEach((sub, index) => {
        console.log(`${index + 1}. ${sub.fileName || 'Untitled'}`);
        console.log(`   Student: ${sub.student.name}`);
        console.log(`   Type: ${sub.fileType}`);
        console.log(`   Status: ${sub.status}`);
        console.log(`   Project: ${sub.project?.title || 'N/A'}`);
        console.log(`   Uploaded: ${sub.createdAt}`);
        console.log('');
      });
    }

    // Check all submissions in database
    const allSubmissions = await prisma.projectSubmission.findMany({
      include: {
        student: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(`\n📊 Total submissions in database: ${allSubmissions.length}`);
    if (allSubmissions.length > 0) {
      console.log('\nAll files:');
      allSubmissions.forEach((sub, index) => {
        console.log(`${index + 1}. ${sub.fileName || 'Untitled'} by ${sub.student.name}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFiles();
