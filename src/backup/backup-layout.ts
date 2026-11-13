import Storage from 'expo-sqlite/kv-store';

import { t } from '@/i18n';

// What is inside the archive of a .sottomano file:
//   manifest.json      what and when (BackupManifest)
//   sottomano.db       the database (documents, people, categories, deadlines…)
//   documents/…        photos and PDFs of the documents
//   people/…           photos of the people
//   secrets.json       passwords of the "Password" documents (from the iOS Keychain), by document id
// The settings (notifications, calendar, Face ID lock) stay on each phone.
export const MANIFEST_ENTRY = 'manifest.json';
export const BACKUP_DB_ENTRY = 'sottomano.db';
export const SECRETS_ENTRY = 'secrets.json';

// secrets.json: { "<document id>": "<password>" }. Only inside the encrypted archive.
export type BackupSecrets = Record<string, string>;
export const BACKUP_FOLDERS = ['documents', 'people'] as const;

export type BackupManifest = {
  app: 'sottomano';
  createdAt: string; // ISO date
  schemaVersion: number; // database version (PRAGMA user_version) of the app that made it
  fileCount: number;
};

// Only these names are accepted when restoring: nothing can be written outside its folder
export function isAllowedEntry(name: string): boolean {
  if (name === MANIFEST_ENTRY || name === BACKUP_DB_ENTRY || name === SECRETS_ENTRY) return true;
  const [folder, file, ...rest] = name.split('/');
  return (
    rest.length === 0 &&
    (BACKUP_FOLDERS as readonly string[]).includes(folder) &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(file ?? '')
  );
}

// "Ultimo backup", shown on the Backup screen
const LAST_BACKUP_KEY = 'backup.lastCreatedAt';

export function getLastBackupDate(): Date | null {
  try {
    const saved = Storage.getItemSync(LAST_BACKUP_KEY);
    return saved ? new Date(saved) : null;
  } catch {
    return null;
  }
}

export function saveLastBackupDate(date: Date): void {
  Storage.setItemSync(LAST_BACKUP_KEY, date.toISOString());
}

// "Ricordami di fare il backup" (Backup screen): every week, every month (default) or never.
// A backup is "due" when there is none, or the last one is older than that (Home notice,
// orange dot in the Menu, the Backup notification).
export type BackupFrequency = 'week' | 'month' | 'never';
export const BACKUP_FREQUENCIES: BackupFrequency[] = ['week', 'month', 'never'];

// "Ogni settimana" / "Ogni mese" / "Mai", in the active language
export function backupFrequencyLabel(frequency: BackupFrequency): string {
  return t(`backupLayout.frequency.${frequency}`);
}
const FREQUENCY_KEY = 'backup.reminderFrequency';
const DAY_MS = 24 * 60 * 60 * 1000;

export function getBackupFrequency(): BackupFrequency {
  try {
    const saved = Storage.getItemSync(FREQUENCY_KEY);
    return saved === 'week' || saved === 'never' ? saved : 'month';
  } catch {
    return 'month';
  }
}

export function saveBackupFrequency(frequency: BackupFrequency): void {
  Storage.setItemSync(FREQUENCY_KEY, frequency);
}

// Days between reminders, or null for "Mai"
export function backupReminderDays(frequency: BackupFrequency = getBackupFrequency()): number | null {
  return frequency === 'week' ? 7 : frequency === 'month' ? 30 : null;
}

export function daysSinceLastBackup(now: number): number | null {
  const last = getLastBackupDate();
  return last ? Math.floor((now - last.getTime()) / DAY_MS) : null;
}

export function isBackupDue(now: number): boolean {
  const interval = backupReminderDays();
  if (interval === null) return false;
  const days = daysSinceLastBackup(now);
  return days === null || days > interval;
}

// The backup kept on the phone (Backup screen, "Backup completato")
export type SavedBackup = { uri: string; name: string; documents: number; bytes: number; createdAt: string };
const SAVED_KEY = 'backup.saved';

export function getSavedBackup(): SavedBackup | null {
  try {
    const saved = Storage.getItemSync(SAVED_KEY);
    return saved ? (JSON.parse(saved) as SavedBackup) : null;
  } catch {
    return null;
  }
}

export function setSavedBackup(backup: SavedBackup): void {
  Storage.setItemSync(SAVED_KEY, JSON.stringify(backup));
}
