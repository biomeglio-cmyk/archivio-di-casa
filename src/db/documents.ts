import type { SQLiteDatabase } from 'expo-sqlite';

import { removeCalendarEvent, syncDocumentEvent } from '@/calendar/calendar-sync';
import { CATEGORY_JOIN_COLUMNS, mapCategory } from '@/db/categories';
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: mapCategory(row, 'c_'),
    imageCount: Number(row.image_count ?? 0),
  };
}

// Every document with its category, filtered by an optional WHERE clause.
// `where` is always a constant written here; values go through `?` parameters, never concatenated.
async function listDocumentsWhere(
  db: SQLiteDatabase,
  where: string,
  params: (string | number)[],
): Promise<DocumentListItem[]> {
  const rows = await db.getAllAsync<DocumentWithCategoryRecord>(
    `SELECT d.*, ${CATEGORY_JOIN_COLUMNS},
            (SELECT COUNT(*) FROM document_files f WHERE f.document_id = d.id AND f.kind = 'image') AS image_count
     FROM documents d
     JOIN categories c ON c.id = d.category_id
     ${where}
     ORDER BY d.expires_at IS NULL, d.expires_at, d.title`,
    params,
  );
  return rows.map(mapDocument);
}

export function listDocumentsWithExpiry(db: SQLiteDatabase): Promise<DocumentListItem[]> {
  return listDocumentsWhere(db, 'WHERE d.expires_at IS NOT NULL', []);
}

export function listDocumentsByCategory(db: SQLiteDatabase, categoryId: number): Promise<DocumentListItem[]> {
  return listDocumentsWhere(db, 'WHERE d.category_id = ?', [categoryId]);
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
  return documentId;
}

// Files of a document: front before back, then the others
export async function listDocumentFiles(db: SQLiteDatabase, documentId: number): Promise<DocumentFile[]> {
  const rows = await db.getAllAsync<DocumentFileRecord>(
    `SELECT * FROM document_files WHERE document_id = ?
     ORDER BY CASE side WHEN 'front' THEN 0 WHEN 'back' THEN 1 ELSE 2 END, id`,
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
  const stored: { path: string; file: PendingFile }[] = [];
  try {
    for (const file of addedFiles) {
      stored.push({ path: await storePendingFile(file), file });
    }
    await db.withTransactionAsync(async () => {
      await updateDocument(db, id, input);
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
  // New title, expiry or reminder → update the calendar event (or remove it if the expiry is gone)
  await syncDocumentEvent(db, id);
}
