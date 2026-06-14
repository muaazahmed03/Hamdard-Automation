import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'system-settings.json');

function getSettingsFromFile() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('Error reading settings file:', error);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { section, settings } = await request.json()

    // In a real application, you would save these to a database
    // For now, we'll just return success
    console.log(`Saving ${section} settings:`, settings)

    return NextResponse.json({ 
      message: 'Settings saved successfully',
      section,
      settings 
    })
  } catch (error) {
    console.error('Settings save error:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const fromFile = getSettingsFromFile();
    const settings = fromFile ?? {
      general: {
        systemName: 'FYP Automation System',
        universityName: 'Hamdard University',
        contactEmail: 'hasnainzaidi962@gmail.com',
        maintenanceMode: false,
        allowRegistration: true
      },
      security: {
        minPasswordLength: 8,
        sessionTimeout: 24,
        maxLoginAttempts: 5,
        requireEmailVerification: false,
        enableTwoFactor: false
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        deadlineReminders: true,
        approvalNotifications: true
      },
      backup: {
        automaticBackup: true,
        backupFrequency: 'daily',
        retentionDays: 30
      }
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 },
    );
  }
}
