import type { SQLiteDatabase } from 'expo-sqlite';

import type { Person, PersonRecord, PersonWithCount } from '@/db/types';

export async function listPeople(db: SQLiteDatabase): Promise<Person[]> {
  return db.getAllAsync<PersonRecord>('SELECT id, name FROM people ORDER BY created_at, id');
}

export async function listPeopleWithCounts(db: SQLiteDatabase): Promise<PersonWithCount[]> {
  const rows = await db.getAllAsync<PersonRecord & { document_count: number }>(`
    SELECT p.id, p.name, COUNT(d.id) AS document_count
    FROM people p
    LEFT JOIN documents d ON d.person_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at, p.id`);
  return rows.map((row) => ({ id: row.id, name: row.name, documentCount: row.document_count }));
}

export async function getPerson(db: SQLiteDatabase, id: number): Promise<Person | null> {
  return db.getFirstAsync<PersonRecord>('SELECT id, name FROM people WHERE id = ?', id);
}

// Returns the id of the new person
export async function insertPerson(db: SQLiteDatabase, name: string): Promise<number> {
  const result = await db.runAsync('INSERT INTO people (name) VALUES (?)', name.trim());
  return result.lastInsertRowId;
}
