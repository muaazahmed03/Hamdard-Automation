import fs from 'fs';
import path from 'path';

const LOGIN_ATTEMPTS_FILE = path.join(process.cwd(), 'data', 'login-attempts.json');

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Get login attempts data
function getLoginAttempts(): Record<string, { attempts: number; lastAttempt: number; lockedUntil?: number }> {
  ensureDataDir();
  try {
    if (fs.existsSync(LOGIN_ATTEMPTS_FILE)) {
      const data = fs.readFileSync(LOGIN_ATTEMPTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading login attempts:', error);
  }
  return {};
}

// Save login attempts data
function saveLoginAttempts(data: Record<string, { attempts: number; lastAttempt: number; lockedUntil?: number }>) {
  ensureDataDir();
  try {
    fs.writeFileSync(LOGIN_ATTEMPTS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving login attempts:', error);
  }
}

// Get system settings
export function getSystemSettings() {
  try {
    const settingsFile = path.join(process.cwd(), 'data', 'system-settings.json');
    if (fs.existsSync(settingsFile)) {
      const data = fs.readFileSync(settingsFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading settings:', error);
  }
  return {
    general: { maintenanceMode: false, allowRegistration: true },
    security: {
      minPasswordLength: 8,
      sessionTimeout: 24,
      maxLoginAttempts: 5,
      requireEmailVerification: false,
      enableTwoFactor: false
    }
  };
}

// Validate password length
export function validatePassword(password: string): { valid: boolean; error?: string } {
  const settings = getSystemSettings();
  const minLength = settings.security?.minPasswordLength || 8;
  
  if (password.length < minLength) {
    return {
      valid: false,
      error: `Password must be at least ${minLength} characters long`
    };
  }
  
  return { valid: true };
}

// Check if user is locked out
export function checkLoginAttempts(email: string, maxAttempts: number = 5, userRole?: string): { 
  allowed: boolean; 
  error?: string; 
  remainingAttempts?: number;
  lockedUntil?: number;
} {
  // Admins have unlimited login attempts
  if (userRole === 'ADMIN') {
    return { allowed: true, remainingAttempts: 999 };
  }

  const attempts = getLoginAttempts();
  const userAttempts = attempts[email];
  
  if (!userAttempts) {
    return { allowed: true, remainingAttempts: maxAttempts };
  }
  
  // Check if user is locked
  if (userAttempts.lockedUntil && Date.now() < userAttempts.lockedUntil) {
    const minutesLeft = Math.ceil((userAttempts.lockedUntil - Date.now()) / 60000);
    return {
      allowed: false,
      error: `Account temporarily locked. Please try again after ${minutesLeft} minute(s).`,
      lockedUntil: userAttempts.lockedUntil
    };
  }
  
  // Reset if lock period has passed
  if (userAttempts.lockedUntil && Date.now() >= userAttempts.lockedUntil) {
    delete attempts[email];
    saveLoginAttempts(attempts);
    return { allowed: true, remainingAttempts: maxAttempts };
  }
  
  // Check if max attempts exceeded
  if (userAttempts.attempts >= maxAttempts) {
    // Lock for 15 minutes
    const lockedUntil = Date.now() + (15 * 60 * 1000);
    attempts[email] = {
      ...userAttempts,
      lockedUntil
    };
    saveLoginAttempts(attempts);
    return {
      allowed: false,
      error: `Maximum login attempts exceeded. Please try again after 15 minutes.`,
      lockedUntil
    };
  }
  
  return { 
    allowed: true, 
    remainingAttempts: maxAttempts - userAttempts.attempts 
  };
}

// Record failed login attempt
export function recordFailedLogin(email: string, userRole?: string): { 
  remainingAttempts: number;
  shouldLock: boolean;
  maxAttempts: number;
} {
  // Admins have unlimited login attempts
  if (userRole === 'ADMIN') {
    return {
      remainingAttempts: 999,
      shouldLock: false,
      maxAttempts: 999
    };
  }

  const settings = getSystemSettings();
  const maxAttempts = settings.security?.maxLoginAttempts || 5;
  const attempts = getLoginAttempts();
  
  if (!attempts[email]) {
    attempts[email] = { attempts: 1, lastAttempt: Date.now() };
  } else {
    attempts[email].attempts += 1;
    attempts[email].lastAttempt = Date.now();
  }
  
  saveLoginAttempts(attempts);
  
  const remainingAttempts = maxAttempts - attempts[email].attempts;
  const shouldLock = attempts[email].attempts >= maxAttempts;
  
  if (shouldLock) {
    const lockedUntil = Date.now() + (15 * 60 * 1000);
    attempts[email].lockedUntil = lockedUntil;
    saveLoginAttempts(attempts);
  }
  
  return {
    remainingAttempts: Math.max(0, remainingAttempts),
    shouldLock,
    maxAttempts
  };
}

// Clear login attempts on successful login
export function clearLoginAttempts(email: string) {
  const attempts = getLoginAttempts();
  if (attempts[email]) {
    delete attempts[email];
    saveLoginAttempts(attempts);
  }
}

// Check if session is expired
export function isSessionExpired(loginTime: number): boolean {
  const settings = getSystemSettings();
  const sessionTimeout = settings.security?.sessionTimeout || 24; // hours
  const sessionDuration = sessionTimeout * 60 * 60 * 1000; // convert to milliseconds
  
  return Date.now() - loginTime > sessionDuration;
}

// Generate session expiry time
export function getSessionExpiryTime(): number {
  const settings = getSystemSettings();
  const sessionTimeout = settings.security?.sessionTimeout || 24; // hours
  return Date.now() + (sessionTimeout * 60 * 60 * 1000);
}
