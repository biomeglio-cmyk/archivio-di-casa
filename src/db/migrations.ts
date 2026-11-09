import type { SQLiteDatabase } from 'expo-sqlite';

import { BUILTIN_CATEGORIES } from '@/db/builtin-categories';
import { insertDemoData } from '@/db/demo-data';

// Versioned migrations, Flyway style:
// - each migration has a version number and runs once, in order, inside a transaction;
// - the applied version is stored in the database file itself (PRAGMA user_version),
//   the equivalent of Flyway's flyway_schema_history table (but just one number, no checksum);
// - NEVER edit a migration that has already shipped: add a new one with the next version.

type Migration = {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
};

// ISO 8601 UTC timestamp, e.g. 2026-11-09T10:15:30.123Z
const NOW = "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))";

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'create schema and built-in categories',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE people (
          id         INTEGER PRIMARY KEY NOT NULL,
          name       TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT ${NOW},
          updated_at TEXT NOT NULL DEFAULT ${NOW}
        );

        CREATE TABLE categories (
          id           INTEGER PRIMARY KEY NOT NULL,
          name         TEXT NOT NULL,
          symbol       TEXT NOT NULL,
          examples     TEXT,
          color_top    TEXT NOT NULL,
          color_bottom TEXT NOT NULL,
          color_text   TEXT NOT NULL,
          is_builtin   INTEGER NOT NULL DEFAULT 0,
          sort_order   INTEGER NOT NULL,
          created_at   TEXT NOT NULL DEFAULT ${NOW},
          updated_at   TEXT NOT NULL DEFAULT ${NOW}
        );

        CREATE TABLE documents (
          id            INTEGER PRIMARY KEY NOT NULL,
          title         TEXT NOT NULL,
          category_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
          person_id     INTEGER REFERENCES people(id) ON DELETE SET NULL,
          number        TEXT,
          expires_at    TEXT,
          reminder_days INTEGER,
          notes         TEXT,
          created_at    TEXT NOT NULL DEFAULT ${NOW},
          updated_at    TEXT NOT NULL DEFAULT ${NOW}
        );
        CREATE INDEX idx_documents_category ON documents(category_id);
        CREATE INDEX idx_documents_person ON documents(person_id);
        CREATE INDEX idx_documents_expires ON documents(expires_at);

        CREATE TABLE document_files (
          id          INTEGER PRIMARY KEY NOT NULL,
          document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
          path        TEXT NOT NULL,
          side        TEXT CHECK (side IN ('front', 'back')),
          kind        TEXT NOT NULL CHECK (kind IN ('image', 'pdf')),
          created_at  TEXT NOT NULL DEFAULT ${NOW}
        );
        CREATE INDEX idx_document_files_document ON document_files(document_id);
      `);

      for (const [index, c] of BUILTIN_CATEGORIES.entries()) {
        await db.runAsync(
          `INSERT INTO categories (name, symbol, examples, color_top, color_bottom, color_text, is_builtin, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
          c.name,
          c.symbol,
          c.examples,
          c.colors.top,
          c.colors.bottom,
          c.colors.text,
          index,
        );
      }
    },
  },
  {
    version: 2,
    name: 'demo data (development only)',
    up: async (db) => {
      // The version is bumped in every build, so schema and version stay identical;
      // only development builds actually get the demo rows.
      if (__DEV__) {
        await insertDemoData(db);
      }
    },
  },
];

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;

    // All or nothing: if `up` fails, user_version is not bumped and the migration retries next launch
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}
