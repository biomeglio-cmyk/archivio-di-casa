import type { SQLiteDatabase } from 'expo-sqlite';

import { cleanupBackupLeftovers } from '@/backup/restore-backup';
import { migrateDbIfNeeded } from '@/db/migrations';
import { purgeOldTrash } from '@/db/trash';
import { adoptDefaultPaletteOnce } from '@/settings/palette';
import { ensureDocumentsDirectory, removeCardFrontCopies } from '@/storage/document-files';

export const DATABASE_NAME = 'sottomano.db';

// Runs once when the app opens the database, before any screen is shown (SQLiteProvider onInit)
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  // WAL: faster writes. Foreign keys are OFF by default in SQLite and must be enabled per connection.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrateDbIfNeeded(db);
  ensureDocumentsDirectory();
  cleanupBackupLeftovers();
  removeCardFrontCopies();
  await purgeOldTrash(db); // more than 30 days in the Cestino: deleted for good
  await adoptDefaultPaletteOnce(db); // once: Sottomano (the old default) → Pastello; other choices kept
}
