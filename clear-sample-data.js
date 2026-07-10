import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * CLEANUP SCRIPT - npm run clean
 * 
 * This script removes all sample/test data while preserving only the permanent admin account.
 * 
 * ✅ PERMANENT ACCOUNT (WILL NOT BE DELETED):
 * - Admin: ahmedshayan928@gmail.com (PERMANENT ADMIN ONLY)
 * 
 * 🗑️  DATA THAT WILL BE REMOVED:
 * - All notifications (except "Demo Notification")
 * - All messages
 * - All conversations
 * - All meeting attendees
 * - All meetings
 * - All supervisor requests
 * - All project submissions
 * - All projects
 * - All group requests
 * - All group members
 * - All groups
 * - All posts
 * - All user profiles (except admin)
 * - All users (except admin - including teacher, committee head, student demo accounts)
 * 
 * ⚠️  WARNING: This will delete ALL data except the permanent admin account!
 */

async function clearSampleData() {
  try {
    console.log("🗑️  Starting cleanup of sample data...");
    console.log("\n📋 PERMANENT ACCOUNT (Protected from deletion):");
    console.log("   ✅ Admin: ahmedshayan928@gmail.com (PERMANENT ADMIN ONLY)");
    console.log("\n🗑️  Demo accounts that WILL BE DELETED:");
    console.log("   ❌ Teacher: teacher@hamdard.edu");
    console.log("   ❌ Committee Head: committee@hamdard.edu");
    console.log("   ❌ Student: student@hamdard.edu");
    console.log("\n⚠️  All other data will be deleted!\n");

    // Delete all notifications
    console.log("Clearing notifications...");
    await prisma.notification.deleteMany({
      where: {
        NOT: {
          title: "Demo Notification" // Keep demo notifications if any
        }
      }
    });
    console.log("✅ Notifications cleared");

    // Delete all messages
    console.log("Clearing messages...");
    await prisma.message.deleteMany();
    console.log("✅ Messages cleared");

    // Delete all conversations
    console.log("Clearing conversations...");
    await prisma.conversation.deleteMany();
    console.log("✅ Conversations cleared");

    // Delete all meeting attendees
    console.log("Clearing meeting attendees...");
    await prisma.meetingAttendee.deleteMany();
    console.log("✅ Meeting attendees cleared");

    // Delete all meetings
    console.log("Clearing meetings...");
    await prisma.meeting.deleteMany();
    console.log("✅ Meetings cleared");

    // Delete all supervisor requests
    console.log("Clearing supervisor requests...");
    await prisma.supervisorRequest.deleteMany();
    console.log("✅ Supervisor requests cleared");

    // Delete all project submissions
    console.log("Clearing project submissions...");
    await prisma.projectSubmission.deleteMany();
    console.log("✅ Project submissions cleared");

    // Delete all projects
    console.log("Clearing projects...");
    await prisma.project.deleteMany();
    console.log("✅ Projects cleared");

    // Delete all group requests
    console.log("Clearing group requests...");
    await prisma.groupRequest.deleteMany();
    console.log("✅ Group requests cleared");

    // Delete all group members
    console.log("Clearing group members...");
    await prisma.groupMember.deleteMany();
    console.log("✅ Group members cleared");

    // Delete all groups
    console.log("Clearing groups...");
    await prisma.group.deleteMany();
    console.log("✅ Groups cleared");

    // Delete all posts
    console.log("Clearing posts...");
    await prisma.post.deleteMany();
    console.log("✅ Posts cleared");

    // Permanent account that will be preserved (ONLY ADMIN)
    const PERMANENT_ACCOUNTS = [
      "ahmedshayan928@gmail.com"  // PERMANENT ADMIN ONLY
    ];

    // Delete all user profiles but keep admin account
    console.log("Clearing user profiles (preserving admin account only)...");
    await prisma.studentProfile.deleteMany({
      where: {
        user: {
          email: {
            notIn: PERMANENT_ACCOUNTS
          }
        }
      }
    });
    await prisma.teacherProfile.deleteMany({
      where: {
        user: {
          email: {
            notIn: PERMANENT_ACCOUNTS
          }
        }
      }
    });
    console.log("✅ User profiles cleared");

    // Delete all users except admin account
    console.log("Clearing users (preserving admin account only)...");
    await prisma.user.deleteMany({
      where: {
        email: {
          notIn: PERMANENT_ACCOUNTS
        }
      }
    });
    console.log("✅ Users cleared");

    // Get remaining users count
    const remainingUsers = await prisma.user.count();
    console.log(`\n📊 Remaining users in database: ${remainingUsers}`);
    
    if (remainingUsers > 0) {
      const users = await prisma.user.findMany({
        select: {
          name: true,
          email: true,
          role: true
        }
      });
      console.log("\n✅ Permanent account preserved:");
      users.forEach(user => {
        console.log(`  🔐 ${user.name} (${user.email}) - ${user.role} [PERMANENT ADMIN]`);
      });
    }

    console.log("\n✅ Cleanup completed successfully!");
    console.log("\n📋 Only permanent account remaining:");
    console.log("  🔐 Admin (PERMANENT): ahmedshayan928@gmail.com / admin123");
    console.log("\n🗑️  Demo accounts deleted:");
    console.log("  ❌ Teacher: teacher@hamdard.edu");
    console.log("  ❌ Committee Head: committee@hamdard.edu");
    console.log("  ❌ Student: student@hamdard.edu");

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearSampleData()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  });

