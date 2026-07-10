/**
 * One-time script: update super admin email in DB + contact email in settings.
 * Run from fypFinal: node scripts/update-admin-email.js
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const OLD_EMAIL = 'ahmedshayan928@gmail.com';
const NEW_EMAIL = 'hasnainzaidi962@gmail.com';
const ADMIN_PASSWORD = 'admin12345';
const SETTINGS_FILE = path.join(process.cwd(), 'data', 'system-settings.json');

function updateContactEmailInSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      console.log('⚠ system-settings.json not found — skipped contact email update');
      return;
    }
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    if (!settings.general) {
      settings.general = {};
    }
    settings.general.contactEmail = NEW_EMAIL;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    console.log(`✓ Contact email in settings → ${NEW_EMAIL}`);
  } catch (e) {
    console.error('Failed to update system-settings.json:', e);
  }
}

async function main() {
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const existingNew = await prisma.user.findUnique({ where: { email: NEW_EMAIL } });

  if (existingNew) {
    await prisma.user.update({
      where: { email: NEW_EMAIL },
      data: {
        name: 'Admin (Super Admin)',
        password: hashedPassword,
        role: 'ADMIN',
        status: 'APPROVED',
        isActive: true,
      },
    });
    console.log(`✓ Admin already on ${NEW_EMAIL} — password reset to ${ADMIN_PASSWORD}`);
  } else {
    const oldAdmin = await prisma.user.findUnique({ where: { email: OLD_EMAIL } });
    if (oldAdmin) {
      await prisma.user.update({
        where: { id: oldAdmin.id },
        data: {
          email: NEW_EMAIL,
          name: 'Admin (Super Admin)',
          password: hashedPassword,
          role: 'ADMIN',
          status: 'APPROVED',
          isActive: true,
        },
      });
      console.log(`✓ Updated admin ${OLD_EMAIL} → ${NEW_EMAIL}`);
    } else {
      await prisma.user.create({
        data: {
          name: 'Admin (Super Admin)',
          email: NEW_EMAIL,
          password: hashedPassword,
          role: 'ADMIN',
          status: 'APPROVED',
          department: 'Computer Science',
          isActive: true,
        },
      });
      console.log(`✓ Created admin ${NEW_EMAIL} / ${ADMIN_PASSWORD}`);
    }
  }

  updateContactEmailInSettings();
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
