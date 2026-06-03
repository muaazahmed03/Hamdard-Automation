import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'system-settings.json');

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Default settings
const defaultSettings = {
  general: {
    systemName: 'FYP Automation System',
    universityName: 'Hamdard University',
    contactEmail: 'ahmedshayan928@gmail.com',
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
};

// Get settings
function getSettings() {
  ensureDataDir();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading settings:', error);
  }
  return defaultSettings;
}

// Save settings
function saveSettings(settings: any) {
  ensureDataDir();
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

// GET /api/settings - Get system settings
export async function GET(request: NextRequest) {
  try {
    const settings = getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error getting settings:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

// POST /api/settings - Update system settings (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const currentSettings = getSettings();
    
    // Merge new settings with existing ones
    const updatedSettings = {
      ...currentSettings,
      ...body
    };
    
    const saved = saveSettings(updatedSettings);
    
    if (saved) {
      return NextResponse.json({
        message: 'Settings updated successfully',
        settings: updatedSettings
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to save settings' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
