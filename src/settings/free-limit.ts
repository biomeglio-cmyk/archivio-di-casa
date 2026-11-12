import type { SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';

// Free version (docs/design-guide.md, "Limite gratuito"): up to 7 elements in all, where an
// element is a document or a card ("Tessere e card" items are documents too). Categories,
// people and deadlines do not count; the Cestino does not count either (it frees a space).
// Nothing is blocked yet: the count is only shown (menu, Impostazioni, Sblocca).
export const FREE_LIMIT = 7;
export const UNLOCK_PRICE = '0,99 €';

const UNLOCKED_KEY = 'app.unlocked';

// Bought "Sblocca": always false until StoreKit is connected (it needs a development build)
export function isUnlocked(): boolean {
  try {
    return Storage.getItemSync(UNLOCKED_KEY) === '1';
  } catch {
    return false;
  }
}

export type FreeUsage = {
  used: number; // documents + cards
  limit: number;
  remaining: number; // never below 0
  share: number; // 0…1, for the progress bars
  unlocked: boolean;
};

export async function getFreeUsage(db: SQLiteDatabase): Promise<FreeUsage> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM documents WHERE deleted_at IS NULL');
  const used = row?.count ?? 0;
  return {
    used,
    limit: FREE_LIMIT,
    remaining: Math.max(0, FREE_LIMIT - used),
    share: Math.min(1, used / FREE_LIMIT),
    unlocked: isUnlocked(),
  };
}
