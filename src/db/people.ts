import type { SQLiteDatabase } from 'expo-sqlite';

import { isPersonRole } from '@/constants/person-roles';
import { moveToTrash } from '@/db/trash';
import type { Person, PersonRecord, PersonRole, PersonWithCount } from '@/db/types';
import { deletePersonPhoto } from '@/storage/person-photos';

function mapPerson(row: PersonRecord): Person {
  return { id: row.id, name: row.name, photoPath: row.photo_path, role: isPersonRole(row.role) ? row.role : null };
}

const COLUMNS = 'id, name, photo_path, role';
const ORDER = 'ORDER BY sort_order, created_at, id';

export async function listPeople(db: SQLiteDatabase): Promise<Person[]> {
  const rows = await db.getAllAsync<PersonRecord>(`SELECT ${COLUMNS} FROM people ${ORDER}`);
  return rows.map(mapPerson);
}

export async function listPeopleWithCounts(db: SQLiteDatabase): Promise<PersonWithCount[]> {
  // date('now', 'localtime') is today on the phone, as 'YYYY-MM-DD' like expires_at
  const rows = await db.getAllAsync<PersonRecord & { document_count: number; expiring_count: number }>(`
    SELECT p.id, p.name, p.photo_path, p.role, COUNT(d.id) AS document_count,
           SUM(CASE WHEN d.expires_at BETWEEN date('now', 'localtime') AND date('now', 'localtime', '+30 days')
                    THEN 1 ELSE 0 END) AS expiring_count
    FROM people p
    LEFT JOIN documents d ON d.person_id = p.id AND d.deleted_at IS NULL
    GROUP BY p.id
    ORDER BY p.sort_order, p.created_at, p.id`);
  return rows.map((row) => ({
    ...mapPerson(row),
    documentCount: row.document_count,
    expiringCount: row.expiring_count ?? 0, // SUM is NULL when the person has no documents
  }));
}

export async function getPerson(db: SQLiteDatabase, id: number): Promise<Person | null> {
  const row = await db.getFirstAsync<PersonRecord>(`SELECT ${COLUMNS} FROM people WHERE id = ?`, id);
  return row ? mapPerson(row) : null;
}

// Only one person is "Tu": choosing it for someone takes it from the one who had it
async function freeMe(db: SQLiteDatabase, role: PersonRole | null, exceptId: number | null) {
  if (role !== 'me') return;
  await db.runAsync("UPDATE people SET role = NULL WHERE role = 'me' AND id IS NOT ?", exceptId);
}

// Returns the id of the new person (last in Famiglia)
export async function insertPerson(
  db: SQLiteDatabase,
  name: string,
  photoPath: string | null = null,
  role: PersonRole | null = null,
): Promise<number> {
  await freeMe(db, role, null);
  const result = await db.runAsync(
    `INSERT INTO people (name, photo_path, role, sort_order)
     VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM people))`,
    name.trim(),
    photoPath,
    role,
  );
  return result.lastInsertRowId;
}

export async function updatePerson(
  db: SQLiteDatabase,
  id: number,
  name: string,
  photoPath: string | null,
  role: PersonRole | null,
): Promise<void> {
  await freeMe(db, role, id);
  await db.runAsync(
    "UPDATE people SET name = ?, photo_path = ?, role = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    name.trim(),
    photoPath,
    role,
    id,
  );
}

// "Cambia foto" on the Persona screen: only the photo
export async function setPersonPhoto(db: SQLiteDatabase, id: number, photoPath: string | null): Promise<void> {
  await db.runAsync(
    "UPDATE people SET photo_path = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    photoPath,
    id,
  );
}

// "Riordina" in Famiglia
export async function savePeopleOrder(db: SQLiteDatabase, orderedIds: number[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const [index, id] of orderedIds.entries()) {
      await db.runAsync('UPDATE people SET sort_order = ? WHERE id = ?', index, id);
    }
  });
}

export async function countDocumentsOfPerson(db: SQLiteDatabase, id: number): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM documents WHERE person_id = ? AND deleted_at IS NULL',
    id,
  );
  return row?.n ?? 0;
}

// "Cancella persona" (docs/design/CancellaPersona.dc.html):
// - 'family': their documents stay and pass to "Tutta la famiglia" (person_id NULL, by ON DELETE SET NULL)
// - 'trash': their documents go to the Cestino (recoverable for 30 days; passwords stay in the
//   Keychain until the Cestino deletes them for good), then the person goes
// The photo file is removed from the phone after the row is gone.
export async function deletePerson(db: SQLiteDatabase, id: number, documents: 'family' | 'trash' = 'family'): Promise<void> {
  if (documents === 'trash') {
    const rows = await db.getAllAsync<{ id: number }>(
      'SELECT id FROM documents WHERE person_id = ? AND deleted_at IS NULL',
      id,
    );
    await moveToTrash(db, rows.map((row) => row.id));
  }
  const row = await db.getFirstAsync<{ photo_path: string | null }>('SELECT photo_path FROM people WHERE id = ?', id);
  await db.runAsync('DELETE FROM people WHERE id = ?', id);
  if (row?.photo_path) deletePersonPhoto(row.photo_path);
}
