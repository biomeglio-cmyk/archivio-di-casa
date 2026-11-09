import type { SQLiteDatabase } from 'expo-sqlite';

import { CATEGORY_JOIN_COLUMNS, mapCategory } from '@/db/categories';
import type { DocumentDetail, DocumentListItem, DocumentRecord } from '@/db/types';

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: mapCategory(row, 'c_'),
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
    `SELECT d.*, ${CATEGORY_JOIN_COLUMNS}
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
  const row = await db.getFirstAsync<DocumentWithCategoryRecord & { p_name: string | null }>(
    `SELECT d.*, ${CATEGORY_JOIN_COLUMNS}, p.name AS p_name
     FROM documents d
     JOIN categories c ON c.id = d.category_id
     LEFT JOIN people p ON p.id = d.person_id
     WHERE d.id = ?`,
    id,
  );
  if (!row) return null;
  const document = mapDocument(row);
  const person = row.person_id !== null && row.p_name !== null ? { id: row.person_id, name: row.p_name } : null;
  return { ...document, person };
}

export type NewDocument = {
  title: string;
  categoryId: number;
  personId: number | null;
  expiresAt: string | null; // 'YYYY-MM-DD'
};

// Returns the id of the new document
export async function insertDocument(db: SQLiteDatabase, doc: NewDocument): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO documents (title, category_id, person_id, expires_at) VALUES (?, ?, ?, ?)',
    doc.title.trim(),
    doc.categoryId,
    doc.personId,
    doc.expiresAt,
  );
  return result.lastInsertRowId;
}
