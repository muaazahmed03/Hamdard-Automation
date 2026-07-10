import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'system-settings.json');

export const DEFAULT_ACCESS_PASSES = {
  ADMIN: 'ADMIN@2024',
  COMMITTEE_HEAD: 'COMMITTEE@2024',
  TEACHER: 'TEACHER@2024',
} as const;

export type AccessPassRole = keyof typeof DEFAULT_ACCESS_PASSES;

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readSettingsFile(): Record<string, unknown> {
  ensureDataDir();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('Error reading settings for access passes:', error);
  }
  return {};
}

function writeSettingsFile(settings: Record<string, unknown>) {
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export function getAccessPasses(): Record<AccessPassRole, string> {
  const settings = readSettingsFile();
  const stored = (settings.security as { accessPasses?: Partial<Record<AccessPassRole, string>> } | undefined)
    ?.accessPasses;

  return {
    ADMIN: stored?.ADMIN || DEFAULT_ACCESS_PASSES.ADMIN,
    COMMITTEE_HEAD: stored?.COMMITTEE_HEAD || DEFAULT_ACCESS_PASSES.COMMITTEE_HEAD,
    TEACHER: stored?.TEACHER || DEFAULT_ACCESS_PASSES.TEACHER,
  };
}

export function updateAccessPasses(
  updates: Partial<Record<AccessPassRole, string>>,
): Record<AccessPassRole, string> {
  const settings = readSettingsFile();
  const currentSecurity = (settings.security as Record<string, unknown>) || {};
  const currentPasses = getAccessPasses();
  const nextPasses = { ...currentPasses, ...updates };

  writeSettingsFile({
    ...settings,
    security: {
      ...currentSecurity,
      accessPasses: nextPasses,
    },
  });

  return nextPasses;
}

export function isValidAccessPass(role: string, accessPass: string): boolean {
  if (!(role in DEFAULT_ACCESS_PASSES)) {
    return false;
  }
  const passes = getAccessPasses();
  return passes[role as AccessPassRole] === accessPass;
}
