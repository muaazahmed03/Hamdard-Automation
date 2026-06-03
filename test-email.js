// Test script to verify email configuration
// Run with: node test-email.js

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailConfig() {
  console.log('🔍 Testing email configuration...\n');

  // Check environment variables
  if (!process.env.EMAIL_USER) {
    console.error('❌ EMAIL_USER is not set in .env file');
    return;
  }
  if (!process.env.EMAIL_PASSWORD) {
    console.error('❌ EMAIL_PASSWORD is not set in .env file');
    return;
  }

  console.log('✅ Environment variables found');
  console.log(`📧 Email User: ${process.env.EMAIL_USER}`);
  console.log(`🔑 Password: ${'*'.repeat(process.env.EMAIL_PASSWORD.length)}\n`);

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  try {
    console.log('🔌 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // Send test email
    console.log('📨 Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself for testing
      subject: 'Test Email - FYP Management System',
      html: `
        <h2>✅ Email Configuration Successful!</h2>
        <p>Your email configuration is working correctly.</p>
        <p>You can now use the password reset functionality.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          This is a test email from your FYP Management System.
        </p>
      `,
      text: 'Email configuration test successful! Your password reset functionality is ready to use.',
    });

    console.log('✅ Test email sent successfully!');
    console.log(`📬 Message ID: ${info.messageId}`);
    console.log(`\n✨ Check your inbox at: ${process.env.EMAIL_USER}\n`);
  } catch (error) {
    console.error('❌ Error testing email configuration:');
    console.error(error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Tip: Make sure you are using a Gmail App Password, not your regular password.');
      console.log('   See EMAIL_SETUP.md for instructions on generating an App Password.');
    }
  }
}

testEmailConfig();
