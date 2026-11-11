import Storage from 'expo-sqlite/kv-store';

// What is inside the archive of a .sottomano file:
//   manifest.json      what and when (BackupManifest)
//   sottomano.db       the database (documents, people, categories, deadlines…)
//   documents/…        photos and PDFs of the documents
//   people/…           photos of the people
// The settings (notifications, calendar, Face ID lock) stay on each phone.
export const MANIFEST_ENTRY = 'manifest.json';
export const BACKUP_DB_ENTRY = 'sottomano.db';
export const BACKUP_FOLDERS = ['documents', 'people'] as const;

export type BackupManifest = {
  app: 'sottomano';
  createdAt: string; // ISO date
  schemaVersion: number; // database version (PRAGMA user_version) of the app that made it
  fileCount: number;
};

// Only these names are accepted when restoring: nothing can be written outside its folder
export function isAllowedEntry(name: string): boolean {
  if (name === MANIFEST_ENTRY || name === BACKUP_DB_ENTRY) return true;
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
