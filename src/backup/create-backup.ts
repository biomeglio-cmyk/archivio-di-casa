import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { backupDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { Zip, ZipPassThrough } from 'fflate';

import { EncryptingWriter, deriveKey, newHeader } from '@/backup/backup-crypto';
import {
  BACKUP_DB_ENTRY,
  BACKUP_FOLDERS,
  MANIFEST_ENTRY,
  SECRETS_ENTRY,
  type BackupManifest,
  type BackupSecrets,
} from '@/backup/backup-layout';
import { LATEST_SCHEMA_VERSION } from '@/db/migrations';
import { passwordDocumentIds, readPassword } from '@/security/password-vault';

export type BackupProgress = { phase: 'key' | 'archive'; done: number; total: number };

const SLICE = 1024 * 1024; // files are read 1 MB at a time: big photos never sit whole in memory

// Today as 2026-11-11, for the file name
function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// The files to back up: everything under documents/ and people/, with their path in the archive
function collectFiles(): { file: File; name: string }[] {
  const out: { file: File; name: string }[] = [];
  for (const folder of BACKUP_FOLDERS) {
    const directory = new Directory(Paths.document, folder);
    if (!directory.exists) continue;
    for (const item of directory.list()) {
      if (item instanceof File) out.push({ file: item, name: `${folder}/${item.name}` });
    }
  }
  return out;
}

// A consistent copy of the open database, with the SQLite backup API (WAL included)
async function snapshotDatabase(db: SQLiteDatabase, work: Directory): Promise<File> {
  await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
  const snapshot = await openDatabaseAsync('snapshot.db', undefined, work.uri);
  try {
    await backupDatabaseAsync({ sourceDatabase: db, destDatabase: snapshot });
  } finally {
    await snapshot.closeAsync();
  }
  return new File(work, 'snapshot.db');
}

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// "Crea backup": ONE encrypted file sottomano-backup-YYYY-MM-DD.sottomano in the cache, ready to
// share. Steps: key from the password, database snapshot, then a zip (database + manifest +
// files) streamed straight into the encrypting writer. The caller deletes the file after sharing.
export async function createBackup(
  db: SQLiteDatabase,
  password: string,
  onProgress: (progress: BackupProgress) => void,
): Promise<File> {
  const work = new Directory(Paths.cache, 'backup-work');
  if (work.exists) work.delete();
  work.create({ intermediates: true });

  const output = new File(Paths.cache, `sottomano-backup-${today()}.sottomano`);
  if (output.exists) output.delete();

  try {
    onProgress({ phase: 'key', done: 0, total: 1 });
    const header = newHeader();
    const key = await deriveKey(password, header);

    const dbFile = await snapshotDatabase(db, work);
    // The Keychain passwords travel only inside the encrypted archive
    const secrets: BackupSecrets = {};
    for (const id of await passwordDocumentIds(db)) {
      const password = await readPassword(id);
      if (password !== null) secrets[String(id)] = password;
    }
    const files = collectFiles();
    const manifest: BackupManifest = {
      app: 'sottomano',
      createdAt: new Date().toISOString(),
      schemaVersion: LATEST_SCHEMA_VERSION,
      fileCount: files.length,
    };
    const sources = [{ file: dbFile, name: BACKUP_DB_ENTRY }, ...files];
    const total = sources.reduce((sum, source) => sum + (source.file.size ?? 0), 0);
    let done = 0;
    onProgress({ phase: 'archive', done, total });

    output.create();
    const handle = output.open(FileMode.ReadWrite);
    try {
      const writer = new EncryptingWriter(handle, key, header);
      let zipError: Error | null = null;
      const zip = new Zip((error, chunk) => {
        if (error) zipError = error;
        else writer.push(chunk);
      });

      const manifestEntry = new ZipPassThrough(MANIFEST_ENTRY);
      zip.add(manifestEntry);
      manifestEntry.push(new TextEncoder().encode(JSON.stringify(manifest)), true);

      const secretsEntry = new ZipPassThrough(SECRETS_ENTRY);
      zip.add(secretsEntry);
      secretsEntry.push(new TextEncoder().encode(JSON.stringify(secrets)), true);

      for (const source of sources) {
        const entry = new ZipPassThrough(source.name);
        zip.add(entry);
        const input = source.file.open(FileMode.ReadOnly);
        try {
          const size = input.size ?? 0;
          if (size === 0) entry.push(new Uint8Array(0), true);
          let read = 0;
          while (read < size) {
            const bytes = await input.readBytes(Math.min(SLICE, size - read));
            if (bytes.length === 0) throw new Error(`File incompleto: ${source.name}`);
            read += bytes.length;
            entry.push(bytes, read >= size);
            if (zipError) throw zipError;
            await writer.flush();
            done += bytes.length;
            onProgress({ phase: 'archive', done, total });
            await yieldToUi();
          }
        } finally {
          input.close();
        }
      }

      zip.end();
      if (zipError) throw zipError;
      await writer.finish();
    } finally {
      handle.close();
    }
    return output;
  } catch (error) {
    if (output.exists) output.delete();
    throw error;
  } finally {
    if (work.exists) work.delete();
  }
}
