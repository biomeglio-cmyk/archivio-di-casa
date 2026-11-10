import type { SQLiteDatabase } from 'expo-sqlite';

import { removeCalendarEvent, syncDocumentEvent } from '@/calendar/calendar-sync';
import { CATEGORY_JOIN_COLUMNS, mapCategory } from '@/db/categories';
import { rescheduleReminders } from '@/notifications/reminders';
import type {
  DocumentDetail,
  DocumentFile,
  DocumentFileRecord,
  DocumentListItem,
  DocumentRecord,
} from '@/db/types';
import { deleteStoredFile, storePendingFile } from '@/storage/document-files';
import type { PendingFile } from '@/storage/pending-files';

type DocumentWithCategoryRecord = DocumentRecord & Record<string, unknown>;

// Order of the photos of a document: the card or the front first, then the back, the barcode last
const FILE_ORDER = `CASE f.side WHEN 'card_front' THEN 0 WHEN 'front' THEN 0 WHEN 'back' THEN 1 WHEN 'barcode' THEN 2 ELSE 1 END`;

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: mapCategory(row, 'c_'),
    imageCount: Number(row.image_count ?? 0),
    firstImagePath: (row.first_image_path as string | null | undefined) ?? null,
    personName: (row.person_name as string | null | undefined) ?? null,
  };
}

// Every document with its category, filtered by an optional WHERE clause.
// `where` is always a constant written here; values go through `?` parameters, never concatenated.
async function listDocumentsWhere(
  db: SQLiteDatabase,
  where: string,
  params: (string | number)[],
  orderBy = 'd.expires_at IS NULL, d.expires_at, d.title',
): Promise<DocumentListItem[]> {
  const rows = await db.getAllAsync<DocumentWithCategoryRecord>(
    `SELECT d.*, ${CATEGORY_JOIN_COLUMNS},
            (SELECT COUNT(*) FROM document_files f WHERE f.document_id = d.id AND f.kind = 'image') AS image_count,
            (SELECT f.path FROM document_files f
             WHERE f.document_id = d.id AND f.kind = 'image' AND f.side IS NOT 'barcode'
             ORDER BY ${FILE_ORDER}, f.id LIMIT 1) AS first_image_path,
            pp.name AS person_name
     FROM documents d
     JOIN categories c ON c.id = d.category_id
     LEFT JOIN people pp ON pp.id = d.person_id
     ${where}
     ORDER BY ${orderBy}`,
    params,
  );
  return rows.map(mapDocument);
}

// Every document with category and person, for the search in Archivio (filtered in JS)
export function listAllDocuments(db: SQLiteDatabase): Promise<DocumentListItem[]> {
  return listDocumentsWhere(db, '', []);
}

export function listDocumentsWithExpiry(db: SQLiteDatabase): Promise<DocumentListItem[]> {
  return listDocumentsWhere(db, 'WHERE d.expires_at IS NOT NULL', []);
}

export function listDocumentsByCategory(db: SQLiteDatabase, categoryId: number): Promise<DocumentListItem[]> {
  return listDocumentsWhere(db, 'WHERE d.category_id = ?', [categoryId]);
}

// "Preferiti" on Archivio, in the order chosen by the user
export function listPinnedDocuments(db: SQLiteDatabase): Promise<DocumentListItem[]> {
  return listDocumentsWhere(db, 'WHERE d.is_pinned = 1', [], 'd.pin_order, d.id');
}

export function listDocumentsByPerson(db: SQLiteDatabase, personId: number): Promise<DocumentListItem[]> {
  return listDocumentsWhere(db, 'WHERE d.person_id = ?', [personId]);
}

export async function getDocumentDetail(db: SQLiteDatabase, id: number): Promise<DocumentDetail | null> {
  const row = await db.getFirstAsync<DocumentWithCategoryRecord & { p_name: string | null; p_photo_path: string | null }>(
    `SELECT d.*, ${CATEGORY_JOIN_COLUMNS}, p.name AS p_name, p.photo_path AS p_photo_path
     FROM documents d
     JOIN categories c ON c.id = d.category_id
     LEFT JOIN people p ON p.id = d.person_id
     WHERE d.id = ?`,
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
};

// Empty strings become NULL, and no reminder without an expiry date
function normalize(doc: DocumentInput) {
  const text = (value: string | null) => (value && value.trim() ? value.trim() : null);
  return {
    title: doc.title.trim(),
    number: text(doc.number),
    notes: text(doc.notes),
    reminderDays: doc.expiresAt ? doc.reminderDays : null,
  };
}

function insertFileRow(db: SQLiteDatabase, documentId: number, path: string, file: PendingFile) {
  return db.runAsync(
    'INSERT INTO document_files (document_id, path, side, kind) VALUES (?, ?, ?, ?)',
    documentId,
    path,
    file.side,
    file.kind,
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
        `INSERT INTO documents (title, category_id, person_id, number, expires_at, reminder_days, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        clean.title,
        doc.categoryId,
        doc.personId,
        clean.number,
        doc.expiresAt,
        clean.reminderDays,
        clean.notes,
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

// Files of a document: front before back, then the others
export async function listDocumentFiles(db: SQLiteDatabase, documentId: number): Promise<DocumentFile[]> {
  const rows = await db.getAllAsync<DocumentFileRecord>(
    `SELECT * FROM document_files f WHERE f.document_id = ?
     ORDER BY CASE WHEN f.kind = 'pdf' THEN 3 ELSE ${FILE_ORDER} END, f.id`,
    documentId,
  );
  return rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
    path: row.path,
    side: row.side,
    kind: row.kind,
    createdAt: row.created_at,
  }));
}

// Updates the document fields (files are handled separately)
export async function updateDocument(db: SQLiteDatabase, id: number, doc: DocumentInput): Promise<void> {
  const clean = normalize(doc);
  await db.runAsync(
    `UPDATE documents
     SET title = ?, category_id = ?, person_id = ?, number = ?, expires_at = ?, reminder_days = ?, notes = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
    clean.title,
    doc.categoryId,
    doc.personId,
    clean.number,
    doc.expiresAt,
    clean.reminderDays,
    clean.notes,
    id,
  );
}

// Deletes the document; its document_files rows go with it (ON DELETE CASCADE),
// then the photos/PDFs are removed from the phone.
export async function deleteDocument(db: SQLiteDatabase, id: number): Promise<void> {
  const files = await db.getAllAsync<{ path: string }>('SELECT path FROM document_files WHERE document_id = ?', id);
  const event = await db.getFirstAsync<{ calendar_event_id: string | null }>(
    'SELECT calendar_event_id FROM documents WHERE id = ?',
    id,
  );
  await db.runAsync('DELETE FROM documents WHERE id = ?', id);
  files.forEach((file) => deleteStoredFile(file.path));
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
): Promise<void> {
  await changeFiles(db, id, removedFiles, addedFiles, () => updateDocument(db, id, input));
  // New title, expiry or reminder → update the calendar event (or remove it if the expiry is gone)
  await syncDocumentEvent(db, id);
  await rescheduleReminders(db);
}

// Only the files: attach new ones, replacing the given ones ("Aggiungi documento" in the detail)
export async function replaceDocumentFiles(
  db: SQLiteDatabase,
  id: number,
  removedFiles: DocumentFile[],
  addedFiles: PendingFile[],
): Promise<void> {
  await changeFiles(db, id, removedFiles, addedFiles);
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
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
    card.title.trim(),
    card.personId,
    code,
    code ? card.barcodeType : null,
    card.cardColor,
    id,
  );
}
