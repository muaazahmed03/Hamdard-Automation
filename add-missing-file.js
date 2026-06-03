const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Find Stacy's ID
    const stacy = await prisma.user.findFirst({
      where: { name: 'Stacy' }
    });

    if (!stacy) {
      console.error('Stacy not found');
      process.exit(1);
    }

    console.log(`Found student: ${stacy.name} (${stacy.id})`);

    // Find her project through the group
    const project = await prisma.project.findFirst({
      where: {
        group: {
          members: {
            some: {
              userId: stacy.id
            }
          }
        }
      }
    });

    console.log(`Found project: ${project ? project.title : 'None'} (${project?.id || 'N/A'})`);

    // Check if file already exists
    const existing = await prisma.projectSubmission.findFirst({
      where: {
        fileUrl: '/uploads/1765729659916_PROPOSAL_LAB-07.docx.pdf'
      }
    });

    if (existing) {
      console.log('File already in database, skipping');
      await prisma.$disconnect();
      return;
    }

    // Add the missing file
    const submission = await prisma.projectSubmission.create({
      data: {
        projectId: project?.id || null,
        studentId: stacy.id,
        title: 'LAB-07',
        description: 'Proposal Document',
        fileUrl: '/uploads/1765729659916_PROPOSAL_LAB-07.docx.pdf',
        fileName: 'LAB-07.docx.pdf',
        fileType: 'PROPOSAL',
        fileSize: 281241,
        status: 'PENDING',
        isSubmitted: true,
      },
    });

    console.log('✅ Successfully added missing file to database:');
    console.log(`   ID: ${submission.id}`);
    console.log(`   File: ${submission.fileName}`);
    console.log(`   Student: ${stacy.name}`);
    console.log(`   Status: ${submission.status}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
