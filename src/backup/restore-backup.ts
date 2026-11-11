import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { backupDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { BackupError, HEADER_SIZE, decryptChunks, deriveKey, parseHeader } from '@/backup/backup-crypto';
import { BACKUP_DB_ENTRY, BACKUP_FOLDERS, MANIFEST_ENTRY, isAllowedEntry, type BackupManifest } from '@/backup/backup-layout';
import { extractEntry, listEntries } from '@/backup/zip-reader';
import { LATEST_SCHEMA_VERSION, migrateDbIfNeeded } from '@/db/migrations';

export type RestoreProgress = { phase: 'key' | 'decrypt' | 'extract'; done: number; total: number };

// A backup decrypted and checked, waiting for the user's "Ripristina"
export type PreparedRestore = {
  manifest: BackupManifest;
  documentCount: number;
};

// Same volume as documents/ and people/, so the final swap is a quick rename
const workDirectory = () => new Directory(Paths.document, 'restore-work');
const oldDirectory = () => new Directory(Paths.document, 'restore-old');
const zipFile = () => new File(Paths.cache, 'restore.zip');

function removeIfExists(item: File | Directory) {
  try {
    if (item.exists) item.delete();
  } catch {
    // best effort: a leftover temporary folder is removed on the next attempt
  }
}

export function discardPreparedRestore(): void {
  removeIfExists(workDirectory());
  removeIfExists(zipFile());
}

// The copy of the chosen .sottomano file that the document picker put in the cache
export function discardPickedFile(uri: string): void {
  if (uri.startsWith(Paths.cache.uri)) removeIfExists(new File(uri));
}

// At app start: removes what an interrupted backup or restore (app closed halfway) left behind.
// restore-work is kept if restore-old exists too: then the swap itself was interrupted, and
// deleting either folder could lose photos, so both stay for a manual fix.
export function cleanupBackupLeftovers(): void {
  removeIfExists(new Directory(Paths.cache, 'backup-work'));
  removeIfExists(zipFile());
  try {
    for (const item of Paths.cache.list()) {
      if (item instanceof File && item.name.endsWith('.sottomano')) removeIfExists(item);
    }
  } catch {
    // nothing else to do
  }
  if (!oldDirectory().exists) removeIfExists(workDirectory());
}

// Step 1, touches NOTHING of the current data: decrypt the file into a temporary zip, extract it
// into restore-work/, then open the restored database to check it. Wrong password → BackupError.
export async function prepareRestore(
  uri: string,
  password: string,
  onProgress: (progress: RestoreProgress) => void,
): Promise<PreparedRestore> {
  discardPreparedRestore();
  const work = workDirectory();
  const zip = zipFile();

  try {
    const source = new File(uri);
    const input = source.open(FileMode.ReadOnly);
    try {
      const header = parseHeader(input.readBytesSync(HEADER_SIZE));
      onProgress({ phase: 'key', done: 0, total: 1 });
      const key = await deriveKey(password, header);

      zip.create();
      const output = zip.open(FileMode.ReadWrite);
      try {
        await decryptChunks(input, output, key, header, (done, total) => onProgress({ phase: 'decrypt', done, total }));
      } finally {
        output.close();
      }
    } finally {
      input.close();
    }

    // Extract, accepting only the names we write ourselves
    const damaged = new BackupError('damaged', 'Il contenuto del backup non è valido.');
    work.create({ intermediates: true });
    for (const folder of BACKUP_FOLDERS) new Directory(work, folder).create();
    const archive = zip.open(FileMode.ReadOnly);
    let manifest: BackupManifest | null = null;
    try {
      let entries;
      try {
        entries = listEntries(archive);
      } catch {
        throw damaged;
      }
      if (!entries.every((entry) => isAllowedEntry(entry.name))) throw damaged;
      if (!entries.some((entry) => entry.name === BACKUP_DB_ENTRY)) throw damaged;
      const total = entries.reduce((sum, entry) => sum + entry.size, 0);
      let done = 0;
      for (const entry of entries) {
        const target = new File(work, entry.name);
        target.create();
        const out = target.open(FileMode.ReadWrite);
        try {
          await extractEntry(archive, entry, out, (count) => {
            done += count;
            onProgress({ phase: 'extract', done, total });
          });
        } finally {
          out.close();
        }
      }
      const manifestFile = new File(work, MANIFEST_ENTRY);
      if (manifestFile.exists) {
        manifest = JSON.parse(manifestFile.textSync()) as BackupManifest;
        manifestFile.delete();
      }
    } finally {
      archive.close();
      removeIfExists(zip);
    }
    if (manifest?.app !== 'sottomano') throw damaged;

    // The restored database must be readable, not newer than this app, and have documents
    const restored = await openDatabaseAsync(BACKUP_DB_ENTRY, undefined, work.uri);
    let documentCount = 0;
    try {
      const check = await restored.getFirstAsync<{ quick_check: string }>('PRAGMA quick_check');
      if (check?.quick_check !== 'ok') throw damaged;
      const version = (await restored.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
      if (version > LATEST_SCHEMA_VERSION) {
        throw new BackupError('newer-app', 'Questo backup viene da una versione più recente di Sottomano. Aggiorna l\'app e riprova.');
      }
      const row = await restored.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM documents');
      documentCount = row?.n ?? 0;
    } catch (error) {
      throw error instanceof BackupError ? error : damaged;
    } finally {
      await restored.closeAsync();
    }

    return { manifest, documentCount };
  } catch (error) {
    discardPreparedRestore();
    throw error;
  }
}

// Step 2, after the confirmation: swap the folders, then copy the restored database INTO the open
// one (SQLite backup API: all pages in one transaction, the app's connection stays valid), then
// run the migrations if the backup is older. If anything fails, the old folders are put back.
export async function applyRestore(db: SQLiteDatabase): Promise<void> {
  const work = workDirectory();
  const old = oldDirectory();
  removeIfExists(old);
  old.create({ intermediates: true });

  const movedAway: string[] = [];
  const movedIn: string[] = [];
  try {
    for (const folder of BACKUP_FOLDERS) {
      const current = new Directory(Paths.document, folder);
      if (current.exists) {
        current.moveSync(new Directory(old, folder));
        movedAway.push(folder);
      }
    }
    for (const folder of BACKUP_FOLDERS) {
      new Directory(work, folder).moveSync(new Directory(Paths.document, folder));
      movedIn.push(folder);
    }

    const restored = await openDatabaseAsync(BACKUP_DB_ENTRY, undefined, work.uri);
    try {
      await backupDatabaseAsync({ sourceDatabase: restored, destDatabase: db });
    } finally {
      await restored.closeAsync();
    }
  } catch (error) {
    // Put everything back as it was
    for (const folder of movedIn) removeIfExists(new Directory(Paths.document, folder));
    for (const folder of movedAway) new Directory(old, folder).moveSync(new Directory(Paths.document, folder));
    removeIfExists(old);
    discardPreparedRestore();
    throw error;
  }

  await db.execAsync('PRAGMA foreign_keys = ON');
  await migrateDbIfNeeded(db);
  removeIfExists(old);
  discardPreparedRestore();
}
