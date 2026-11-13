import type { SQLiteDatabase } from 'expo-sqlite';

import { countUrgentDeadlines } from '@/db/urgent-count';

export type MenuCounts = {
  documents: number; // everything in Home
  pinned: number; // Preferiti
  cardsCategoryId: number | null; // "Tessere e card" (found by kind, so a rename doesn't matter)
  cards: number;
  passwordCategoryId: number | null; // "Password" (by kind)
  trash: number; // documents in the Cestino
  urgent: number; // expired + expiring within 7 days (same number as the Scadenze tab badge)
  people: number;
};

// The numbers on the right of the Menu rows, in one query (plus the shared deadlines count)
export async function getMenuCounts(db: SQLiteDatabase): Promise<MenuCounts> {
  const row = await db.getFirstAsync<{
    documents: number;
    pinned: number;
    cards_category_id: number | null;
    cards: number;
    password_category_id: number | null;
    trash: number;
    people: number;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL) AS documents,
       (SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL AND is_pinned = 1) AS pinned,
       (SELECT id FROM categories WHERE kind = 'cards' AND hidden = 0 LIMIT 1) AS cards_category_id,
       (SELECT COUNT(*) FROM documents d JOIN categories c ON c.id = d.category_id WHERE c.kind = 'cards' AND d.deleted_at IS NULL) AS cards,
       (SELECT id FROM categories WHERE kind = 'password' AND hidden = 0 LIMIT 1) AS password_category_id,
       (SELECT COUNT(*) FROM documents WHERE deleted_at IS NOT NULL) AS trash,
       (SELECT COUNT(*) FROM people) AS people`,
  );
  return {
    documents: row?.documents ?? 0,
    pinned: row?.pinned ?? 0,
    cardsCategoryId: row?.cards_category_id ?? null,
    cards: row?.cards ?? 0,
    passwordCategoryId: row?.password_category_id ?? null,
    trash: row?.trash ?? 0,
    urgent: await countUrgentDeadlines(db),
    people: row?.people ?? 0,
  };
}
