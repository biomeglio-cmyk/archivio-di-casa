import type { SQLiteDatabase } from 'expo-sqlite';

// Deadlines that need attention: already expired, or expiring within the next 7 days.
// Used by the badge on the Scadenze tab and by the number on the app icon.
// date('now', 'localtime') is today on the phone, as 'YYYY-MM-DD' like expires_at.
export async function countUrgentDeadlines(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM documents
     WHERE expires_at IS NOT NULL AND expires_at <= date('now', 'localtime', '+7 days')`,
  );
  return row?.count ?? 0;
}

