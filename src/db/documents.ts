import type { SQLiteDatabase } from 'expo-sqlite';

import { removeCalendarEvent, syncDocumentEvent } from '@/calendar/calendar-sync';
import { CATEGORY_JOIN_COLUMNS, mapCategory } from '@/db/categories';
import { rescheduleReminders } from '@/notifications/reminders';
import type {
  CoverMode,
  DocumentDetail,
  DocumentFile,
  DocumentFileRecord,
  DocumentListItem,
  DocumentRecord,
  DocumentVersion,
  FileSide,
} from '@/db/types';
import { deletePassword } from '@/security/password-vault';
import { deleteStoredFile, storePendingFile } from '@/storage/document-files';
import type { PendingFile } from '@/storage/pending-files';
import { isRepeatUnit, type Repeat } from '@/utils/recurrence';

type DocumentWithCategoryRecord = DocumentRecord & Record<string, unknown>;

// Order of the photos of a document: the card or the front first, then the back, the barcode last
// Photos in page order (front 1, back 2, then the other scanned pages); the barcode last.
// The fallback on side is only a safety net: every photo saved since V6 has a page.
const FILE_ORDER = `CASE WHEN f.side = 'barcode' THEN 1000 ELSE COALESCE(f.page, CASE f.side WHEN 'back' THEN 2 ELSE 1 END) END`;

function mapDocument(row: DocumentWithCategoryRecord): DocumentListItem {
  return {
    id: row.id,
    title: row.title,
    categoryId: row.category_id,
    personId: row.person_id,
    number: row.number,
    expiresAt: row.expires_at,
    reminderDays: row.reminder_days,
    notes: row.notes,
    calendarEventId: row.calendar_event_id,
    isPinned: row.is_pinned === 1,
    pinOrder: row.pin_order,
    barcodeValue: row.barcode_value,
    barcodeType: row.barcode_type,
    cardColor: row.card_color,
    username: row.username ?? null,
    coverMode: row.cover_mode ?? null,
    coverColor: row.cover_color ?? null,
    deletedAt: row.deleted_at ?? null,
    repeat: row.repeat_every && isRepeatUnit(row.repeat_unit) ? { every: row.repeat_every, unit: row.repeat_unit } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: mapCategory(row, 'c_'),
    imageCount: Number(row.image_count ?? 0),
    firstImagePath: (row.first_image_path as string | null | undefined) ?? null,
    personName: (row.person_name as string | null | undefined) ?? null,
  };
}

// Only documents that are not in the "Cestino": every list of the app starts from here
const LIVE = 'd.deleted_at IS NULL';

// Every document with its category, filtered by a condition.
// `condition` is always a constant written here; values go through `?` parameters, never concatenated.
async function listDocumentsWhere(
  db: SQLiteDatabase,
  condition: string,
  params: (string | number)[],
  orderBy = 'd.expires_at IS NULL, d.expires_at, d.title',
): Promise<DocumentListItem[]> {
  const rows = await db.getAllAsync<DocumentWithCategoryRecord>(
    `SELECT d.*, ${CATEGORY_JOIN_COLUMNS},
            (SELECT COUNT(*) FROM document_files f
             WHERE f.document_id = d.id AND f.kind = 'image' AND f.version_id IS NULL) AS image_count,
            (SELECT f.path FROM document_files f
             WHERE f.document_id = d.id AND f.kind = 'image' AND f.side IS NOT 'barcode' AND f.version_id IS NULL
             ORDER BY ${FILE_ORDER}, f.id LIMIT 1) AS first_image_path,
            pp.name AS person_name
     FROM documents d
     JOIN categories c ON c.id = d.category_id
     LEFT JOIN people pp ON pp.id = d.person_id
     WHERE ${condition}
     ORDER BY ${orderBy}`,
    params,
  );
  return rows.map(mapDocument);
}

// Every document with category and person, for the search in Home (filtered in JS)
export function listAllDocuments(db: SQLiteDatabase): Promise<DocumentListItem[]> {
  return listDocumentsWhere(db, LIVE, []);
}

export function listDocumentsWithExpiry(db: SQLiteDatabase): Promise<DocumentListItem[]> {
  return listDocumentsWhere(db, `${LIVE} AND d.expires_at IS NOT NULL`, []);
}

// Fallback after the saved position (always set since V11): the old order, by deadline then title
const BY_DEADLINE = 'd.expires_at IS NULL, d.expires_at, d.title';

// A category grid, in the order chosen by dragging
export function listDocumentsByCategory(db: SQLiteDatabase, categoryId: number): Promise<DocumentListItem[]> {
  return listDocumentsWhere(db, `${LIVE} AND d.category_id = ?`, [categoryId], `d.category_order IS NULL, d.category_order, ${BY_DEADLINE}`);
}

// "Preferiti" on Home, in the order chosen by the user
export function listPinnedDocuments(db: SQLiteDatabase): Promise<DocumentListItem[]> {
  return listDocumentsWhere(db, `${LIVE} AND d.is_pinned = 1`, [], 'd.pin_order, d.id');
}

// A person grid, in the order chosen by dragging
export function listDocumentsByPerson(db: SQLiteDatabase, personId: number): Promise<DocumentListItem[]> {
  return listDocumentsWhere(db, `${LIVE} AND d.person_id = ?`, [personId], `d.person_order IS NULL, d.person_order, ${BY_DEADLINE}`);
}

// After a drag in a category or person grid: the documents of that grid, in their new order
export async function saveDocumentOrder(
  db: SQLiteDatabase,
  grid: 'category' | 'person',
  orderedIds: number[],
): Promise<void> {
  // Constant column names, never from the caller's text
  const sql =
    grid === 'category'
      ? 'UPDATE documents SET category_order = ? WHERE id = ?'
      : 'UPDATE documents SET person_order = ? WHERE id = ?';
  await db.withTransactionAsync(async () => {
    for (const [index, id] of orderedIds.entries()) await db.runAsync(sql, index, id);
  });
}

export async function getDocumentDetail(db: SQLiteDatabase, id: number): Promise<DocumentDetail | null> {
  const row = await db.getFirstAsync<DocumentWithCategoryRecord & { p_name: string | null; p_photo_path: string | null }>(
    `SELECT d.*, ${CATEGORY_JOIN_COLUMNS}, p.name AS p_name, p.photo_path AS p_photo_path
     FROM documents d
     JOIN categories c ON c.id = d.category_id
     LEFT JOIN people p ON p.id = d.person_id
     WHERE d.id = ? AND d.deleted_at IS NULL`,
    id,
  );
  if (!row) return null;
  const document = mapDocument(row);
  const person =
    row.person_id !== null && row.p_name !== null
      ? { id: row.person_id, name: row.p_name, photoPath: row.p_photo_path }
      : null;
  return { ...document, person };
}

// What the form edits (the same shape for a new document and for an existing one)
export type DocumentInput = {
  title: string;
  categoryId: number;
  personId: number | null;
  number: string | null;
  expiresAt: string | null; // 'YYYY-MM-DD'
  reminderDays: number | null; // only meaningful with an expiry date
  notes: string | null;
  username?: string | null; // only for "Password" documents
  coverMode?: CoverMode | null; // "Copertina"; null/absent = automatic
  coverColor?: string | null; // null = the category color
  repeat?: Repeat | null; // "Si ripete"; null/absent = "Mai" (only meaningful with a deadline)
};

// Empty strings become NULL, and no reminder without an expiry date
function normalize(doc: DocumentInput) {
  const text = (value: string | null) => (value && value.trim() ? value.trim() : null);
  return {
    title: doc.title.trim(),
    number: text(doc.number),
    notes: text(doc.notes),
    username: text(doc.username ?? null),
    reminderDays: doc.expiresAt ? doc.reminderDays : null,
    repeat: doc.expiresAt && doc.repeat ? doc.repeat : null,
  };
}

// Page of a new photo: the scanned page, or 1 for a front and 2 for a back; null for PDFs and barcodes
function pageOf(file: PendingFile): number | null {
  if (file.kind !== 'image' || file.side === 'barcode') return null;
  return file.page ?? (file.side === 'back' ? 2 : 1);
}

function insertFileRow(db: SQLiteDatabase, documentId: number, path: string, file: PendingFile) {
  return db.runAsync(
    'INSERT INTO document_files (document_id, path, side, kind, page) VALUES (?, ?, ?, ?, ?)',
    documentId,
    path,
    file.side,
    file.kind,
    pageOf(file),
  );
}

// Saves the document and its files; returns the id of the new document.
// 1. copy the files into documents/ (outside the transaction: copying can be slow)
// 2. insert the document and its document_files rows in ONE transaction (all or nothing)
// 3. if the database part fails, delete the copied files so nothing is left behind
export async function insertDocument(
  db: SQLiteDatabase,
  doc: DocumentInput,
  files: PendingFile[] = [],
): Promise<number> {
  const stored: { path: string; file: PendingFile }[] = [];
  let documentId = 0;
  try {
    for (const file of files) {
      stored.push({ path: await storePendingFile(file), file });
    }

    await db.withTransactionAsync(async () => {
      const clean = normalize(doc);
      const result = await db.runAsync(
        `INSERT INTO documents (title, category_id, person_id, number, expires_at, reminder_days, notes, username,
                                cover_mode, cover_color, repeat_every, repeat_unit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        clean.title,
        doc.categoryId,
        doc.personId,
        clean.number,
        doc.expiresAt,
        clean.reminderDays,
        clean.notes,
        clean.username,
        doc.coverMode ?? null,
        doc.coverColor ?? null,
        clean.repeat?.every ?? null,
        clean.repeat?.unit ?? null,
      );
      documentId = result.lastInsertRowId;

      for (const { path, file } of stored) {
        await insertFileRow(db, documentId, path, file);
      }
    });
  } catch (error) {
    stored.forEach(({ path }) => deleteStoredFile(path));
    throw error;
  }
  // Calendar event of the expiry, if sync is on (after the save: it never makes the save fail)
  await syncDocumentEvent(db, documentId);
  await rescheduleReminders(db);
  return documentId;
}

// Current files of a document: the photos in page order (front, back, other pages), then the
// barcode, then PDFs. Pages of previous versions are left out (listVersionFiles).
export async function listDocumentFiles(db: SQLiteDatabase, documentId: number): Promise<DocumentFile[]> {
  const rows = await db.getAllAsync<DocumentFileRecord>(
    `SELECT * FROM document_files f WHERE f.document_id = ? AND f.version_id IS NULL
     ORDER BY CASE WHEN f.kind = 'pdf' THEN 2000 ELSE ${FILE_ORDER} END, f.id`,
    documentId,
  );
  return rows.map(mapFile);
}

// The pages of one previous version, in the same order
export async function listVersionFiles(db: SQLiteDatabase, versionId: number): Promise<DocumentFile[]> {
  const rows = await db.getAllAsync<DocumentFileRecord>(
    `SELECT * FROM document_files f WHERE f.version_id = ?
     ORDER BY CASE WHEN f.kind = 'pdf' THEN 2000 ELSE ${FILE_ORDER} END, f.id`,
    versionId,
  );
  return rows.map(mapFile);
}

// "Versioni precedenti" of a document, the most recent first
export async function listDocumentVersions(db: SQLiteDatabase, documentId: number): Promise<DocumentVersion[]> {
  const rows = await db.getAllAsync<{
    id: number;
    document_id: number;
    expires_at: string | null;
    archived_at: string;
    page_count: number;
  }>(
    `SELECT v.*, (SELECT COUNT(*) FROM document_files f WHERE f.version_id = v.id) AS page_count
     FROM document_versions v WHERE v.document_id = ? ORDER BY v.archived_at DESC, v.id DESC`,
    documentId,
  );
  return rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
    expiresAt: row.expires_at,
    archivedAt: row.archived_at,
    pageCount: row.page_count,
  }));
}

export async function getDocumentVersion(db: SQLiteDatabase, versionId: number): Promise<DocumentVersion | null> {
  const row = await db.getFirstAsync<{ id: number; document_id: number; expires_at: string | null; archived_at: string }>(
    'SELECT * FROM document_versions WHERE id = ?',
    versionId,
  );
  return row
    ? { id: row.id, documentId: row.document_id, expiresAt: row.expires_at, archivedAt: row.archived_at, pageCount: 0 }
    : null;
}

// "Rinnovato": the deadline moves to `newExpiry`. With a new scan, the current pages first become
// a "Versione precedente" (with the old deadline), then the new pages are the current ones.
// Same safety rules as insertDocument. Calendar event, reminders and badge follow.
export async function renewDocument(
  db: SQLiteDatabase,
  id: number,
  newExpiry: string,
  newPages: PendingFile[] | null,
): Promise<void> {
  const stored: { path: string; file: PendingFile }[] = [];
  try {
    for (const file of newPages ?? []) {
      stored.push({ path: await storePendingFile(file), file });
    }
    await db.withTransactionAsync(async () => {
      if (stored.length > 0) {
        const current = await db.getFirstAsync<{ expires_at: string | null }>('SELECT expires_at FROM documents WHERE id = ?', id);
        const version = await db.runAsync(
          'INSERT INTO document_versions (document_id, expires_at) VALUES (?, ?)',
          id,
          current?.expires_at ?? null,
        );
        await db.runAsync(
          'UPDATE document_files SET version_id = ? WHERE document_id = ? AND version_id IS NULL',
          version.lastInsertRowId,
          id,
        );
        for (const { path, file } of stored) await insertFileRow(db, id, path, file);
      }
      await db.runAsync(
        `UPDATE documents SET expires_at = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
        newExpiry,
        id,
      );
    });
  } catch (error) {
    stored.forEach(({ path }) => deleteStoredFile(path));
    throw error;
  }
  await syncDocumentEvent(db, id);
  await rescheduleReminders(db);
}

function mapFile(row: DocumentFileRecord): DocumentFile {
  return {
    id: row.id,
    documentId: row.document_id,
    path: row.path,
    side: row.side,
    kind: row.kind,
    page: row.page,
    createdAt: row.created_at,
  };
}

// Updates the document fields (files are handled separately)
export async function updateDocument(db: SQLiteDatabase, id: number, doc: DocumentInput): Promise<void> {
  const clean = normalize(doc);
  await db.runAsync(
    `UPDATE documents
     SET title = ?, category_id = ?, person_id = ?, number = ?, expires_at = ?, reminder_days = ?, notes = ?,
         username = ?, cover_mode = ?, cover_color = ?, repeat_every = ?, repeat_unit = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
    clean.title,
    doc.categoryId,
    doc.personId,
    clean.number,
    doc.expiresAt,
    clean.reminderDays,
    clean.notes,
    clean.username,
    doc.coverMode ?? null,
    doc.coverColor ?? null,
    clean.repeat?.every ?? null,
    clean.repeat?.unit ?? null,
    id,
  );
}

// The "Cestino", most recently deleted first
export function listTrashedDocuments(db: SQLiteDatabase): Promise<DocumentListItem[]> {
  return listDocumentsWhere(db, 'd.deleted_at IS NOT NULL', [], 'd.deleted_at DESC, d.id DESC');
}

// "Elimina definitivamente" (from the Cestino, or after 30 days there): the row goes, its
// document_files rows with it (ON DELETE CASCADE), then the photos/PDFs, its Keychain item and
// its calendar event. A normal "Elimina" only moves the document to the Cestino (db/trash.ts).
export async function deleteDocumentForever(db: SQLiteDatabase, id: number): Promise<void> {
  const files = await db.getAllAsync<{ path: string }>('SELECT path FROM document_files WHERE document_id = ?', id);
  const event = await db.getFirstAsync<{ calendar_event_id: string | null }>(
    'SELECT calendar_event_id FROM documents WHERE id = ?',
    id,
  );
  await db.runAsync('DELETE FROM documents WHERE id = ?', id);
  files.forEach((file) => deleteStoredFile(file.path));
  await deletePassword(id); // its Keychain item, if it was a "Password" document
  await removeCalendarEvent(event?.calendar_event_id ?? null);
  await rescheduleReminders(db);
}

// Saves the edit form: fields plus file changes (removed files, new or replacement files).
// Same safety rules as insertDocument; the old files are deleted from the phone only
// after the transaction succeeded, so a failure never loses a photo.
export async function saveDocumentEdits(
  db: SQLiteDatabase,
  id: number,
  input: DocumentInput,
  removedFiles: DocumentFile[],
  addedFiles: PendingFile[],
  movedFiles: { id: number; page: number; side: FileSide | null }[] = [], // saved pages in a new position
): Promise<void> {
  await changeFiles(db, id, removedFiles, addedFiles, async () => {
    await updateDocument(db, id, input);
    for (const file of movedFiles) {
      await db.runAsync('UPDATE document_files SET page = ?, side = ? WHERE id = ? AND document_id = ?', file.page, file.side, file.id, id);
    }
  });
  // New title, expiry or reminder → update the calendar event (or remove it if the expiry is gone)
  await syncDocumentEvent(db, id);
  await rescheduleReminders(db);
}

// Only the pages ("Aggiungi pagine" in the detail): new ones added, removed ones deleted, saved
// ones renumbered when they moved. Any number of pages.
export async function saveDocumentPages(
  db: SQLiteDatabase,
  id: number,
  removedFiles: DocumentFile[],
  addedFiles: PendingFile[],
  movedFiles: { id: number; page: number; side: FileSide | null }[],
): Promise<void> {
  await changeFiles(db, id, removedFiles, addedFiles, async () => {
    for (const file of movedFiles) {
      await db.runAsync('UPDATE document_files SET page = ?, side = ? WHERE id = ? AND document_id = ?', file.page, file.side, file.id, id);
    }
  });
}

// Copies the new files first, then changes the rows (and the fields, if `alsoInTransaction` is
// given) in one transaction; old files leave the phone only after it succeeded.
async function changeFiles(
  db: SQLiteDatabase,
  id: number,
  removedFiles: DocumentFile[],
  addedFiles: PendingFile[],
  alsoInTransaction?: () => Promise<void>,
): Promise<void> {
  const stored: { path: string; file: PendingFile }[] = [];
  try {
    for (const file of addedFiles) {
      stored.push({ path: await storePendingFile(file), file });
    }
    await db.withTransactionAsync(async () => {
      await alsoInTransaction?.();
      for (const file of removedFiles) {
        await db.runAsync('DELETE FROM document_files WHERE id = ?', file.id);
      }
      for (const { path, file } of stored) {
        await insertFileRow(db, id, path, file);
      }
    });
  } catch (error) {
    stored.forEach(({ path }) => deleteStoredFile(path));
    throw error;
  }
  removedFiles.forEach((file) => deleteStoredFile(file.path));
}

// ---- "Preferiti" (pins) ----

// Heart on/off. A new pin goes to the end of the row.
export async function setPinned(db: SQLiteDatabase, id: number, pinned: boolean): Promise<void> {
  await db.runAsync(
    `UPDATE documents
     SET is_pinned = ?,
         pin_order = CASE WHEN ? = 1 THEN (SELECT COALESCE(MAX(pin_order), -1) + 1 FROM documents WHERE is_pinned = 1)
                          ELSE 0 END
     WHERE id = ?`,
    pinned ? 1 : 0,
    pinned ? 1 : 0,
    id,
  );
}

// Saves the "Modifica" sheet: the kept documents in their new order, the others are unpinned
export async function savePinnedOrder(db: SQLiteDatabase, orderedIds: number[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE documents SET is_pinned = 0, pin_order = 0 WHERE is_pinned = 1');
    for (const [index, id] of orderedIds.entries()) {
      await db.runAsync('UPDATE documents SET is_pinned = 1, pin_order = ? WHERE id = ?', index, id);
    }
  });
}

// ---- Cards ----

// What the card form edits
export type CardInput = {
  title: string;
  categoryId: number; // the "Tessere e card" category
  personId: number | null;
  barcodeValue: string | null; // read by the camera or typed by hand
  barcodeType: string | null; // null when typed by hand
  cardColor: string;
  coverMode: CoverMode | null; // "Copertina"; null = automatic
};

// Saves a new card with its photos (card_front, barcode); same safety rules as insertDocument
export async function insertCard(db: SQLiteDatabase, card: CardInput, files: PendingFile[]): Promise<number> {
  const id = await insertDocument(
    db,
    { title: card.title, categoryId: card.categoryId, personId: card.personId, number: null, expiresAt: null, reminderDays: null, notes: null },
    files,
  );
  await updateCardFields(db, id, card);
  return id;
}

// Edits a card: fields, plus replaced photos
export async function saveCardEdits(
  db: SQLiteDatabase,
  id: number,
  card: CardInput,
  removedFiles: DocumentFile[],
  addedFiles: PendingFile[],
): Promise<void> {
  await changeFiles(db, id, removedFiles, addedFiles, () => updateCardFields(db, id, card));
}

async function updateCardFields(db: SQLiteDatabase, id: number, card: CardInput): Promise<void> {
  const code = card.barcodeValue?.trim() || null;
  await db.runAsync(
    `UPDATE documents
     SET title = ?, person_id = ?, barcode_value = ?, barcode_type = ?, card_color = ?,
         cover_mode = ?, cover_color = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
    card.title.trim(),
    card.personId,
    code,
    code ? card.barcodeType : null,
    card.cardColor,
    card.coverMode,
    card.cardColor, // a card's color IS its cover color
    id,
  );
}
