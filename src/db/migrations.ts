import type { SQLiteDatabase } from 'expo-sqlite';

import { BUILTIN_CATEGORIES, V7_NEW_CATEGORIES, V7_RENAMES } from '@/db/builtin-categories';
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
  {
    version: 3,
    name: 'person photo',
    up: async (db) => {
      // Relative to Paths.document, like document files (e.g. 'people/1731…-a1b2c3.jpg'); NULL = no photo
      await db.execAsync('ALTER TABLE people ADD COLUMN photo_path TEXT');
    },
  },
  {
    version: 4,
    name: 'calendar event of a document',
    up: async (db) => {
      // Identifier of the iOS Calendar event created for the expiry; NULL = no event
      await db.execAsync('ALTER TABLE documents ADD COLUMN calendar_event_id TEXT');
    },
  },
  {
    version: 5,
    name: 'cards, barcodes and "Sottomano" pins',
    up: async (db) => {
      await db.execAsync(`
        -- "Sottomano": pinned documents, shown in pin_order (smallest first)
        ALTER TABLE documents ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE documents ADD COLUMN pin_order INTEGER NOT NULL DEFAULT 0;
        -- Cards: the code read by the camera (or typed), its format (e.g. 'ean13'), and the
        -- background color used when the card has no photo of its front
        ALTER TABLE documents ADD COLUMN barcode_value TEXT;
        ALTER TABLE documents ADD COLUMN barcode_type TEXT;
        ALTER TABLE documents ADD COLUMN card_color TEXT;
        CREATE INDEX idx_documents_pinned ON documents(is_pinned, pin_order);

        -- A stable marker for special categories: the name can be renamed, the kind cannot.
        -- 'cards' = "Tessere e card" (the built-in category with the credit card symbol).
        ALTER TABLE categories ADD COLUMN kind TEXT;
        UPDATE categories SET kind = 'cards' WHERE is_builtin = 1 AND symbol = 'creditcard';

        -- SQLite can't change a CHECK constraint, so document_files is rebuilt with the new roles:
        -- 'card_front' (photo of a card) and 'barcode' (photo of its code, shown at the checkout).
        -- Same columns and rows; nothing else references this table.
        CREATE TABLE document_files_v5 (
          id          INTEGER PRIMARY KEY NOT NULL,
          document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
          path        TEXT NOT NULL,
          side        TEXT CHECK (side IN ('front', 'back', 'card_front', 'barcode')),
          kind        TEXT NOT NULL CHECK (kind IN ('image', 'pdf')),
          created_at  TEXT NOT NULL DEFAULT ${NOW}
        );
        INSERT INTO document_files_v5 (id, document_id, path, side, kind, created_at)
          SELECT id, document_id, path, side, kind, created_at FROM document_files;
        DROP TABLE document_files;
        ALTER TABLE document_files_v5 RENAME TO document_files;
        CREATE INDEX idx_document_files_document ON document_files(document_id);
      `);
    },
  },
  {
    version: 6,
    name: 'page order of scanned documents',
    up: async (db) => {
      await db.execAsync(`
        -- A scan can have any number of pages: page 1 is still the 'front', page 2 the 'back',
        -- page 3 and later have side NULL. "page" keeps them in order (NULL for PDFs and barcodes).
        ALTER TABLE document_files ADD COLUMN page INTEGER;
        UPDATE document_files SET page = 1 WHERE kind = 'image' AND side IN ('front', 'card_front');
        UPDATE document_files SET page = 2 WHERE kind = 'image' AND side = 'back';
      `);
    },
  },
  {
    version: 7,
    name: 'built-in categories renamed; Pet and Password added',
    up: async (db) => {
      // Renamed only if the user kept the original name (a built-in category can be renamed)
      for (const { symbol, from, to } of V7_RENAMES) {
        await db.runAsync('UPDATE categories SET name = ? WHERE is_builtin = 1 AND symbol = ? AND name = ?', to, symbol, from);
      }
      // Pet and Password go right before "Altro": everything from "Altro" on moves 2 places down
      const other = await db.getFirstAsync<{ sort_order: number }>(
        "SELECT sort_order FROM categories WHERE is_builtin = 1 AND symbol = 'folder'",
      );
      const last = await db.getFirstAsync<{ n: number | null }>('SELECT MAX(sort_order) AS n FROM categories');
      let position = other?.sort_order ?? (last?.n ?? -1) + 1;
      if (other) await db.runAsync('UPDATE categories SET sort_order = sort_order + 2 WHERE sort_order >= ?', other.sort_order);
      for (const category of V7_NEW_CATEGORIES) {
        const exists = await db.getFirstAsync('SELECT id FROM categories WHERE is_builtin = 1 AND symbol = ?', category.symbol);
        if (!exists) {
          await db.runAsync(
            `INSERT INTO categories (name, symbol, examples, color_top, color_bottom, color_text, is_builtin, sort_order, kind)
             VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            category.name,
            category.symbol,
            category.examples,
            category.colors.top,
            category.colors.bottom,
            category.colors.text,
            position,
            category.kind,
          );
        }
        position++;
      }
    },
  },
  {
    version: 8,
    name: 'username of a password document',
    up: async (db) => {
      // Only the user name: the password itself is never stored in SQLite (iOS Keychain)
      await db.execAsync('ALTER TABLE documents ADD COLUMN username TEXT');
    },
  },
  {
    version: 9,
    name: 'built-in categories editable and hideable',
    up: async (db) => {
      await db.execAsync(`
        -- Stable identity of a built-in category: its ORIGINAL icon. Icon and name can now be
        -- changed, the rules (card size, palette colors, "Altro") follow this key instead.
        ALTER TABLE categories ADD COLUMN builtin_key TEXT;
        UPDATE categories SET builtin_key = symbol WHERE is_builtin = 1;
        -- "Cancella" on a built-in category only hides it, so it can be restored
        ALTER TABLE categories ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
        -- 1 = the user picked a color: the palette of "Aspetto" no longer applies to it
        ALTER TABLE categories ADD COLUMN custom_colors INTEGER NOT NULL DEFAULT 0;
      `);
    },
  },
  {
    version: 10,
    name: 'cover of a document: photo or color',
    up: async (db) => {
      await db.execAsync(`
        -- NULL = automatic (the photo if there is one, else the color); 'photo' or 'color' = chosen
        ALTER TABLE documents ADD COLUMN cover_mode TEXT CHECK (cover_mode IN ('photo', 'color'));
        -- NULL = the category color (follows the palette); otherwise a color chosen by the user
        ALTER TABLE documents ADD COLUMN cover_color TEXT;
        -- Cards already had a color: it becomes their cover color, so nothing changes on screen
        UPDATE documents SET cover_color = card_color WHERE card_color IS NOT NULL;
      `);
    },
  },
  {
    version: 11,
    name: 'order of the documents in a category and in a person',
    up: async (db) => {
      await db.execAsync(`
        -- Position of the document in its category grid and in its person grid (drag and drop)
        ALTER TABLE documents ADD COLUMN category_order INTEGER;
        ALTER TABLE documents ADD COLUMN person_order INTEGER;
        -- Start from the order shown until now: by deadline (none last), then by title
        UPDATE documents SET category_order = (
          SELECT n FROM (
            SELECT id, ROW_NUMBER() OVER (
              PARTITION BY category_id ORDER BY expires_at IS NULL, expires_at, title, id) - 1 AS n
            FROM documents) r
          WHERE r.id = documents.id);
        UPDATE documents SET person_order = (
          SELECT n FROM (
            SELECT id, ROW_NUMBER() OVER (
              PARTITION BY person_id ORDER BY expires_at IS NULL, expires_at, title, id) - 1 AS n
            FROM documents WHERE person_id IS NOT NULL) r
          WHERE r.id = documents.id)
        WHERE person_id IS NOT NULL;

        -- A new document goes at the end of its category and of its person, and so does a
        -- document moved to another category or person (form, "Sposta in Altro", demo data...)
        CREATE TRIGGER documents_order_on_insert AFTER INSERT ON documents BEGIN
          UPDATE documents SET
            category_order = (SELECT COALESCE(MAX(category_order), -1) + 1 FROM documents
                              WHERE category_id = NEW.category_id AND id <> NEW.id),
            person_order = CASE WHEN NEW.person_id IS NULL THEN NULL ELSE
                             (SELECT COALESCE(MAX(person_order), -1) + 1 FROM documents
                              WHERE person_id = NEW.person_id AND id <> NEW.id) END
          WHERE id = NEW.id;
        END;
        CREATE TRIGGER documents_order_on_category AFTER UPDATE OF category_id ON documents
        WHEN NEW.category_id IS NOT OLD.category_id BEGIN
          UPDATE documents SET category_order = (SELECT COALESCE(MAX(category_order), -1) + 1 FROM documents
                                                 WHERE category_id = NEW.category_id AND id <> NEW.id)
          WHERE id = NEW.id;
        END;
        CREATE TRIGGER documents_order_on_person AFTER UPDATE OF person_id ON documents
        WHEN NEW.person_id IS NOT OLD.person_id BEGIN
          UPDATE documents SET person_order = CASE WHEN NEW.person_id IS NULL THEN NULL ELSE
                                                (SELECT COALESCE(MAX(person_order), -1) + 1 FROM documents
                                                 WHERE person_id = NEW.person_id AND id <> NEW.id) END
          WHERE id = NEW.id;
        END;
      `);
    },
  },
  {
    version: 12,
    name: 'trash: soft delete of documents',
    up: async (db) => {
      await db.execAsync(`
        -- NULL = a live document; otherwise when it was moved to the "Cestino" (ISO date and time).
        -- Trashed documents are hidden everywhere and deleted for good after 30 days.
        ALTER TABLE documents ADD COLUMN deleted_at TEXT;
        CREATE INDEX documents_deleted_at ON documents (deleted_at);
      `);
    },
  },
  {
    version: 13,
    name: 'recurring deadlines',
    up: async (db) => {
      await db.execAsync(`
        -- "Si ripete ogni <repeat_every> <repeat_unit>"; both NULL = "Mai"
        ALTER TABLE documents ADD COLUMN repeat_every INTEGER CHECK (repeat_every BETWEEN 1 AND 99);
        ALTER TABLE documents ADD COLUMN repeat_unit TEXT CHECK (repeat_unit IN ('day', 'week', 'month', 'year'));
      `);
    },
  },
  {
    version: 14,
    name: 'previous versions of a document (Rinnovato)',
    up: async (db) => {
      await db.execAsync(`
        -- "Rinnovato" with a new scan: the pages until then become a previous version
        CREATE TABLE document_versions (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
          expires_at  TEXT,  -- the deadline the document had then
          archived_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );
        CREATE INDEX document_versions_document ON document_versions (document_id);
        -- NULL = a current page; otherwise the previous version it belongs to
        ALTER TABLE document_files ADD COLUMN version_id INTEGER REFERENCES document_versions(id) ON DELETE CASCADE;
      `);
    },
  },
  {
    version: 15,
    name: 'type, payment status and amount of a document',
    up: async (db) => {
      await db.execAsync(`
        -- "Tipo": the sub-type inside its folder (Luce, Gas…), free text; NULL = none
        ALTER TABLE documents ADD COLUMN doc_type TEXT;
        -- "Da pagare" / "Pagata"; NULL = no status (most documents)
        ALTER TABLE documents ADD COLUMN payment_status TEXT CHECK (payment_status IN ('due', 'paid'));
        -- The day it was marked "Pagata" ('YYYY-MM-DD'), for "Pagata il 5 novembre"
        ALTER TABLE documents ADD COLUMN paid_at TEXT;
        -- "Importo" in euro cents (84,20 € = 8420), so sums are exact; NULL = no amount
        ALTER TABLE documents ADD COLUMN amount_cents INTEGER CHECK (amount_cents >= 0);
        CREATE INDEX documents_doc_type ON documents (category_id, doc_type);
      `);
    },
  },
  {
    version: 16,
    name: 'role and order of the family members',
    up: async (db) => {
      await db.execAsync(`
        -- "Chi è": who the person is for the owner of the phone; 'me' = "Tu"; NULL = not said
        ALTER TABLE people ADD COLUMN role TEXT CHECK (role IN ('me', 'partner', 'child', 'parent', 'sibling', 'other'));
        -- Only one person can be "Tu"
        CREATE UNIQUE INDEX people_one_me ON people (role) WHERE role = 'me';
        -- Order of Famiglia ("Riordina"); the people so far keep the order they were added in
        ALTER TABLE people ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
        UPDATE people SET sort_order = (SELECT COUNT(*) FROM people AS earlier
          WHERE earlier.created_at < people.created_at
             OR (earlier.created_at = people.created_at AND earlier.id < people.id));
      `);
    },
  },
];

// The database version this app writes (a backup with a higher one comes from a newer app)
export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

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
