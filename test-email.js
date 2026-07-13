// Test script to verify email configuration
// Run with: node test-email.js

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(__dirname, '.env.local'));

async function testEmailConfig() {
  console.log('🔍 Testing email configuration...\n');

  const emailUser = (process.env.EMAIL_USER || 'ahmedshayan928@gmail.com').trim();
  const emailPassword = (process.env.EMAIL_PASSWORD || '').replace(/\s+/g, '').trim();

  if (!emailPassword) {
    console.error('❌ EMAIL_PASSWORD is not set in .env.local');
    return;
  }

  console.log('✅ Environment variables found');
  console.log(`📧 Email User: ${emailUser}`);
  console.log(`🔑 Password length: ${emailPassword.length} (Gmail App Password should be 16)\n`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });

  try {
    console.log('🔌 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    console.log('📨 Sending test email...');
    const info = await transporter.sendMail({
      from: emailUser,
      to: emailUser,
      subject: 'Test Email - FYP Management System',
      html: `
        <h2>✅ Email Configuration Successful!</h2>
        <p>Your email configuration is working correctly.</p>
        <p>Registration OTP emails should now deliver.</p>
      `,
      text: 'Email configuration test successful!',
    });

    console.log('✅ Test email sent successfully!');
    console.log(`📬 Message ID: ${info.messageId}`);
    console.log(`\n✨ Check inbox (and Spam) at: ${emailUser}\n`);
  } catch (error) {
    console.error('❌ Error testing email configuration:');
    console.error(error.message);

    if (String(error.message).includes('Invalid login')) {
      console.log('\n💡 Tip: Use a Gmail App Password (no spaces), not your regular password.');
      console.log('   See EMAIL_SETUP_GUIDE.md');
    }
  }
}

testEmailConfig();
