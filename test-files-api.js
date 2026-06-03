const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFilesAPI() {
  try {
    console.log('🧪 Testing Files API logic...\n');

    const teacherId = 'cmj1qqs7q0000i66cyuu29pqv'; // Emily's ID

    // Simulate the API logic
    const supervisedProjects = await prisma.project.findMany({
      where: {
        supervisorId: teacherId,
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

    console.log(`📊 Supervised projects: ${supervisedProjects.length}\n`);

    const groupsMap = new Map();
    supervisedProjects.forEach(project => {
      if (project.group && !groupsMap.has(project.group.id)) {
        groupsMap.set(project.group.id, {
          ...project.group,
          projects: []
        });
      }
      if (project.group) {
        groupsMap.get(project.group.id).projects.push(project);
      }
    });

    const supervisedGroups = Array.from(groupsMap.values());

    const studentIds = supervisedProjects
      .filter(p => p.group)
      .flatMap(p => p.group.members.map(member => member.userId));

    const projectIds = supervisedProjects.map(p => p.id);

    console.log(`👥 Student IDs: ${studentIds.length}`);
    console.log(`📋 Project IDs: ${projectIds.length}\n`);

    // Fetch submissions
    const projectSubmissions = await prisma.projectSubmission.findMany({
      where: {
        OR: [
          { studentId: { in: studentIds } },
          { projectId: { in: projectIds } },
        ],
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📤 Files found: ${projectSubmissions.length}\n`);

    const allFiles = [];
    projectSubmissions.forEach(submission => {
      const studentGroup = supervisedGroups.find(group =>
        group.members.some(member => member.userId === submission.studentId)
      );

      allFiles.push({
        id: submission.id,
        name: submission.fileName,
        fileType: submission.fileType,
        status: submission.status,
        student: submission.student,
        project: submission.project,
        groupName: studentGroup?.name || 'Unknown Group',
        groupId: studentGroup?.id,
        uploadedAt: submission.createdAt,
      });
    });

    console.log('✅ Files that will be shown:');
    allFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   Student: ${file.student.name}`);
      console.log(`   Group: ${file.groupName}`);
      console.log(`   Type: ${file.fileType}`);
      console.log(`   Status: ${file.status}\n`);
    });

    console.log(`📊 Groups data:`);
    supervisedGroups.forEach((group, index) => {
      console.log(`${index + 1}. ${group.name} (${group.members.length} members)`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFilesAPI();
