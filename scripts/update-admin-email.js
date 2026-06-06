/**
 * One-time script: update super admin email in the database.
 * Run from fypFinal: node scripts/update-admin-email.js
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const OLD_EMAIL = 'ahmedshayan928@gmail.com';
const NEW_EMAIL = 'hasnainzaidi962@gmail.com';
const ADMIN_PASSWORD = 'admin12345';

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
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
