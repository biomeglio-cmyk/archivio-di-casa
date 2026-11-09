import type { SQLiteDatabase } from 'expo-sqlite';

import type { Person, PersonRecord, PersonWithCount } from '@/db/types';
import { deletePersonPhoto } from '@/storage/person-photos';

function mapPerson(row: PersonRecord): Person {
  return { id: row.id, name: row.name, photoPath: row.photo_path };
}

export async function listPeople(db: SQLiteDatabase): Promise<Person[]> {
  const rows = await db.getAllAsync<PersonRecord>('SELECT id, name, photo_path FROM people ORDER BY created_at, id');
  return rows.map(mapPerson);
}

export async function listPeopleWithCounts(db: SQLiteDatabase): Promise<PersonWithCount[]> {
  const rows = await db.getAllAsync<PersonRecord & { document_count: number }>(`
    SELECT p.id, p.name, p.photo_path, COUNT(d.id) AS document_count
    FROM people p
    LEFT JOIN documents d ON d.person_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at, p.id`);
  return rows.map((row) => ({ ...mapPerson(row), documentCount: row.document_count }));
}

export async function getPerson(db: SQLiteDatabase, id: number): Promise<Person | null> {
  const row = await db.getFirstAsync<PersonRecord>('SELECT id, name, photo_path FROM people WHERE id = ?', id);
  return row ? mapPerson(row) : null;
}

// Returns the id of the new person
export async function insertPerson(db: SQLiteDatabase, name: string, photoPath: string | null = null): Promise<number> {
  const result = await db.runAsync('INSERT INTO people (name, photo_path) VALUES (?, ?)', name.trim(), photoPath);
  return result.lastInsertRowId;
}

export async function updatePerson(db: SQLiteDatabase, id: number, name: string, photoPath: string | null): Promise<void> {
  await db.runAsync(
    "UPDATE people SET name = ?, photo_path = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    name.trim(),
    photoPath,
    id,
  );
}

// Their documents stay: person_id becomes NULL thanks to ON DELETE SET NULL (foreign keys are ON).
// The photo file is removed from the phone after the row is gone.
export async function deletePerson(db: SQLiteDatabase, id: number): Promise<void> {
  const row = await db.getFirstAsync<{ photo_path: string | null }>('SELECT photo_path FROM people WHERE id = ?', id);
  await db.runAsync('DELETE FROM people WHERE id = ?', id);
  if (row?.photo_path) deletePersonPhoto(row.photo_path);
}
