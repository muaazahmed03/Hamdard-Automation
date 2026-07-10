const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// ============================================
//   CONFIGURATION - CHANGE THESE VALUES
// ============================================
const NEW_ADMIN_EMAIL = 'ahmedshayan928@gmail.com';  // Change this to your new admin email
const NEW_ADMIN_PASSWORD = 'admin123';                // Change this to your new admin password (leave empty to keep current password)
const ADMIN_NAME = 'Admin (Super Admin)';             // Optional: Change admin display name

// Set to true if you want to update password, false to keep current password
const UPDATE_PASSWORD = true;

// ============================================
// 📝 FILES THAT WILL BE UPDATED
// ============================================
const FILES_TO_UPDATE = [
  {
    path: 'clear-sample-data.js',
    patterns: [
      { old: /"ahmedshayan928@gmail.com"/g, new: () => `"${NEW_ADMIN_EMAIL}"` },
      { old: /ahmedshayan928@gmail\.com/g, new: () => NEW_ADMIN_EMAIL }
    ]
  },
  {
    path: 'prisma/seed.js',
    patterns: [
      { old: /email: "ahmedshayan928@gmail.com"/g, new: () => `email: "${NEW_ADMIN_EMAIL}"` },
      { old: /password: await bcrypt\.hash\("admin123", 10\)/g, new: () => `password: await bcrypt.hash("${NEW_ADMIN_PASSWORD}", 10)` }
    ]
  },
  {
    path: 'create-all-demo-users.js',
    patterns: [
      { old: /email: 'ahmedshayan928@gmail.com'/g, new: () => `email: '${NEW_ADMIN_EMAIL}'` },
      { old: /password: 'admin123'/g, new: () => `password: '${NEW_ADMIN_PASSWORD}'` }
    ]
  },
  {
    path: 'src/lib/email.ts',
    patterns: [
      { old: /return settings\.general\?\.contactEmail \|\| 'ahmedshayan928@gmail\.com';/g, new: () => `return settings.general?.contactEmail || '${NEW_ADMIN_EMAIL}';` },
      { old: /return 'ahmedshayan928@gmail\.com'; \/\/ Fallback/g, new: () => `return '${NEW_ADMIN_EMAIL}'; // Fallback` }
    ]
  },
  {
    path: 'update-admin-email.js',
    patterns: [
      { old: /email: 'ahmedshayan928@gmail\.com'/g, new: () => `email: '${NEW_ADMIN_EMAIL}'` },
      { old: /const hashedPassword = await bcrypt\.hash\('admin123', 10\);/g, new: () => `const hashedPassword = await bcrypt.hash('${NEW_ADMIN_PASSWORD}', 10);` }
    ]
  }
];

// ============================================
// 🔧 MAIN FUNCTION
// ============================================

async function updateAdminCredentials() {
  try {
    console.log('🔄 Starting admin credentials update...\n');
    console.log('📋 Configuration:');
    console.log(`   New Email: ${NEW_ADMIN_EMAIL}`);
    console.log(`   Update Password: ${UPDATE_PASSWORD ? 'Yes' : 'No (keeping current)'}`);
    if (UPDATE_PASSWORD) {
      console.log(`   New Password: ${NEW_ADMIN_PASSWORD}`);
    }
    console.log(`   Admin Name: ${ADMIN_NAME}\n`);

    // Step 1: Find admin user
    console.log('🔍 Step 1: Finding admin user in database...');
    const admin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    });

    if (!admin) {
      console.log('❌ Admin user not found!');
      console.log('📝 Creating new admin user...');
      
      const hashedPassword = await bcrypt.hash(NEW_ADMIN_PASSWORD, 10);
      const newAdmin = await prisma.user.create({
        data: {
          email: NEW_ADMIN_EMAIL,
          password: hashedPassword,
          name: ADMIN_NAME,
          role: 'ADMIN',
          status: 'APPROVED',
          department: 'Administration',
          isActive: true
        }
      });
      
      console.log('✅ Admin user created successfully!');
      console.log(`   ID: ${newAdmin.id}`);
      console.log(`   Email: ${newAdmin.email}`);
      console.log(`   Name: ${newAdmin.name}\n`);
    } else {
      console.log(`✅ Found admin user: ${admin.email} (ID: ${admin.id})`);
      
      // Step 2: Update database
      console.log('\n💾 Step 2: Updating database...');
      const updateData = {
        email: NEW_ADMIN_EMAIL,
        name: ADMIN_NAME
      };

      if (UPDATE_PASSWORD && NEW_ADMIN_PASSWORD) {
        updateData.password = await bcrypt.hash(NEW_ADMIN_PASSWORD, 10);
        console.log('   ✅ Password will be updated');
      } else {
        console.log('   ⏭️  Password will remain unchanged');
      }

      await prisma.user.update({
        where: { id: admin.id },
        data: updateData
      });

      console.log('✅ Database updated successfully!');
      console.log(`   Old Email: ${admin.email}`);
      console.log(`   New Email: ${NEW_ADMIN_EMAIL}`);
      if (UPDATE_PASSWORD) {
        console.log(`   Password: Updated to "${NEW_ADMIN_PASSWORD}"`);
      } else {
        console.log(`   Password: Unchanged`);
      }
    }

    // Step 3: Update files
    console.log('\n📝 Step 3: Updating files...');
    let filesUpdated = 0;
    let filesSkipped = 0;

    for (const fileConfig of FILES_TO_UPDATE) {
      const filePath = path.join(process.cwd(), fileConfig.path);
      
      if (!fs.existsSync(filePath)) {
        console.log(`   ⚠️  File not found: ${fileConfig.path} (skipping)`);
        filesSkipped++;
        continue;
      }

      try {
        let content = fs.readFileSync(filePath, 'utf-8');
        let fileChanged = false;

        for (const pattern of fileConfig.patterns) {
          const newValue = typeof pattern.new === 'function' ? pattern.new() : pattern.new;
          if (pattern.old.test(content)) {
            content = content.replace(pattern.old, newValue);
            fileChanged = true;
          }
        }

        if (fileChanged) {
          fs.writeFileSync(filePath, content, 'utf-8');
          console.log(`   ✅ Updated: ${fileConfig.path}`);
          filesUpdated++;
        } else {
          console.log(`   ⏭️  No changes needed: ${fileConfig.path}`);
        }
      } catch (error) {
        console.log(`   ❌ Error updating ${fileConfig.path}: ${error.message}`);
      }
    }

    console.log(`\n✅ Files update completed!`);
    console.log(`   Updated: ${filesUpdated} files`);
    if (filesSkipped > 0) {
      console.log(`   Skipped: ${filesSkipped} files (not found)`);
    }

    // Step 4: Summary
    console.log('\n✨ Admin credentials update completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Email: ${NEW_ADMIN_EMAIL}`);
    if (UPDATE_PASSWORD) {
      console.log(`   Password: ${NEW_ADMIN_PASSWORD}`);
    } else {
      console.log(`   Password: (unchanged)`);
    }
    console.log(`   Name: ${ADMIN_NAME}`);
    console.log('\n💡 You can now login with the new credentials!');
    console.log(`   📧 Email: ${NEW_ADMIN_EMAIL}`);
    if (UPDATE_PASSWORD) {
      console.log(`   🔑 Password: ${NEW_ADMIN_PASSWORD}`);
    }

  } catch (error) {
    console.error('❌ Error updating admin credentials:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateAdminCredentials()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

