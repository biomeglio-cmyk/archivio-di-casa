import type { SFSymbol } from 'expo-symbols';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category, CategoryColors, CategoryRecord, CategoryWithCount } from '@/db/types';
import { BUILTIN_DEFAULTS } from '@/db/builtin-categories';
import { builtinColorsFor } from '@/settings/palette';

// Converts a SQL row (snake_case) into the app shape (camelCase).
// `prefix` lets document queries reuse it for JOINed columns named like c_name, c_symbol…
// Built-in categories take their colors from the palette chosen in "Aspetto" (unless the user
// picked a color for one); custom ones keep the color saved in the database.
export function mapCategory(row: Record<string, unknown>, prefix = ''): Category {
  const r = (column: string) => row[prefix + column];
  const isBuiltin = r('is_builtin') === 1;
  const builtinKey = isBuiltin ? ((r('builtin_key') as string | null) ?? null) : null;
  const followsPalette = builtinKey !== null && r('custom_colors') !== 1;
  return {
    id: r('id') as number,
    name: r('name') as string,
    symbol: r('symbol') as SFSymbol,
    examples: (r('examples') as string | null) ?? null,
    colors: (followsPalette ? builtinColorsFor(builtinKey) : null) ?? {
      top: r('color_top') as string,
      bottom: r('color_bottom') as string,
      text: r('color_text') as string,
    },
    isBuiltin,
    builtinKey,
    followsPalette,
    isCards: r('kind') === 'cards',
    isPassword: r('kind') === 'password',
    personId: (r('person_id') as number | null | undefined) ?? null,
  };
}

// Columns to SELECT when JOINing categories as "c" into another query
export const CATEGORY_JOIN_COLUMNS = `
  c.id AS c_id, c.name AS c_name, c.symbol AS c_symbol, c.examples AS c_examples,
  c.color_top AS c_color_top, c.color_bottom AS c_color_bottom, c.color_text AS c_color_text,
  c.is_builtin AS c_is_builtin, c.kind AS c_kind, c.builtin_key AS c_builtin_key,
  c.custom_colors AS c_custom_colors, c.person_id AS c_person_id`;

export async function listCategories(db: SQLiteDatabase): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRecord>('SELECT * FROM categories WHERE hidden = 0 ORDER BY sort_order, name');
  return rows.map((row) => mapCategory(row));
}

export async function listCategoriesWithCounts(db: SQLiteDatabase): Promise<CategoryWithCount[]> {
  const rows = await db.getAllAsync<CategoryRecord & { document_count: number }>(`
    SELECT c.*, COUNT(d.id) AS document_count
    FROM categories c
    LEFT JOIN documents d ON d.category_id = c.id AND d.deleted_at IS NULL
    WHERE c.hidden = 0
    GROUP BY c.id
    ORDER BY c.sort_order, c.name`);
  return rows.map((row) => ({ ...mapCategory(row), documentCount: row.document_count }));
}

export async function getCategory(db: SQLiteDatabase, id: number): Promise<Category | null> {
  const row = await db.getFirstAsync<CategoryRecord>('SELECT * FROM categories WHERE id = ? AND hidden = 0', id);
  return row ? mapCategory(row) : null;
}

export type CategoryInput = {
  name: string;
  symbol: SFSymbol;
  colors: CategoryColors;
  followPalette?: boolean; // built-in only: use the colors of "Aspetto" instead of `colors`
  personId?: number | null; // "Per chi è"; absent = unchanged
};

// New custom categories go after all the others
export async function insertCategory(db: SQLiteDatabase, input: CategoryInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO categories (name, symbol, color_top, color_bottom, color_text, is_builtin, sort_order, person_id)
     VALUES (?, ?, ?, ?, ?, 0, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM categories), ?)`,
    input.name.trim(),
    input.symbol,
    input.colors.top,
    input.colors.bottom,
    input.colors.text,
    input.personId ?? null,
  );
  return result.lastInsertRowId;
}

// Name, icon and color, for built-in and custom categories alike. A built-in keeps its
// builtin_key and kind, so its rules (card size, wallet, password fields) still apply.
export async function updateCategory(db: SQLiteDatabase, id: number, input: CategoryInput): Promise<void> {
  await db.runAsync(
    `UPDATE categories
     SET name = ?, symbol = ?, color_top = ?, color_bottom = ?, color_text = ?,
         custom_colors = CASE WHEN is_builtin = 1 AND ? = 1 THEN 0 ELSE 1 END,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
    input.name.trim(),
    input.symbol,
    input.colors.top,
    input.colors.bottom,
    input.colors.text,
    input.followPalette ? 1 : 0,
    id,
  );
  if (input.personId !== undefined) {
    await db.runAsync('UPDATE categories SET person_id = ? WHERE id = ?', input.personId, id);
  }
}

// "Altro": the fallback category, never deletable (documents of a deleted category move here)
export const OTHER_KEY = 'folder';

export function isOtherCategory(category: Pick<Category, 'builtinKey'>): boolean {
  return category.builtinKey === OTHER_KEY;
}

export async function otherCategoryId(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM categories WHERE builtin_key = ?', OTHER_KEY);
  if (!row) throw new Error('La categoria "Altro" non esiste.');
  return row.id;
}

// "Cancella" with documents, option 1: the documents move to "Altro". Returns their ids.
export async function moveDocumentsToOther(db: SQLiteDatabase, id: number): Promise<number[]> {
  const otherId = await otherCategoryId(db);
  if (otherId === id) throw new Error('La categoria "Altro" non si può eliminare.');
  const moved = await listDocumentIdsInCategory(db, id);
  // From "Password": the user names go too (no "Utente" field in "Altro")
  await db.runAsync(
    `UPDATE documents
     SET category_id = ?,
         username = CASE WHEN (SELECT kind FROM categories WHERE id = ?) = 'password' THEN NULL ELSE username END,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE category_id = ?`,
    otherId,
    id,
    id,
  );
  return moved;
}

// Removes an empty category: a built-in one is only hidden (restorable from "Aspetto"),
// a custom one is deleted. "Altro" never.
export async function deleteCategory(db: SQLiteDatabase, id: number): Promise<void> {
  const row = await db.getFirstAsync<{ is_builtin: number; builtin_key: string | null }>(
    'SELECT is_builtin, builtin_key FROM categories WHERE id = ?',
    id,
  );
  if (!row) return;
  if (row.builtin_key === OTHER_KEY) throw new Error('La categoria "Altro" non si può eliminare.');
  if (row.is_builtin === 1) {
    await db.runAsync('UPDATE categories SET hidden = 1 WHERE id = ?', id);
  } else {
    // Its documents in the Cestino move to "Altro" (still in the Cestino), so they can be restored.
    // documents.category_id has ON DELETE RESTRICT: this fails if live documents are still there.
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'UPDATE documents SET category_id = ? WHERE category_id = ? AND deleted_at IS NOT NULL',
        await otherCategoryId(db),
        id,
      );
      await db.runAsync('DELETE FROM categories WHERE id = ?', id);
    });
  }
}

// "Ripristina categorie predefinite" (Aspetto): the hidden built-in categories come back with
// their original name, icon and colors (palette), placed right before "Altro".
// Documents and custom categories are never touched. Returns how many came back.
export async function restoreBuiltinCategories(db: SQLiteDatabase): Promise<number> {
  const hidden = await db.getAllAsync<{ id: number; builtin_key: string }>(
    'SELECT id, builtin_key FROM categories WHERE is_builtin = 1 AND hidden = 1',
  );
  if (hidden.length === 0) return 0;
  const order = BUILTIN_DEFAULTS.map((d) => d.key);
  hidden.sort((a, b) => order.indexOf(a.builtin_key) - order.indexOf(b.builtin_key));

  await db.withTransactionAsync(async () => {
    const other = await db.getFirstAsync<{ sort_order: number }>(
      'SELECT sort_order FROM categories WHERE builtin_key = ?',
      OTHER_KEY,
    );
    const last = await db.getFirstAsync<{ n: number | null }>('SELECT MAX(sort_order) AS n FROM categories');
    let position = other?.sort_order ?? (last?.n ?? -1) + 1;
    if (other) {
      await db.runAsync('UPDATE categories SET sort_order = sort_order + ? WHERE sort_order >= ?', hidden.length, position);
    }
    for (const { id, builtin_key: key } of hidden) {
      const original = BUILTIN_DEFAULTS.find((d) => d.key === key);
      if (!original) continue;
      await db.runAsync(
        `UPDATE categories
         SET hidden = 0, name = ?, symbol = ?, color_top = ?, color_bottom = ?, color_text = ?, custom_colors = 0,
             sort_order = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?`,
        original.name,
        original.symbol,
        original.colors.top,
        original.colors.bottom,
        original.colors.text,
        position++,
        id,
      );
    }
  });
  return hidden.length;
}

// Whether documents of this category have "Utente" and "Password"
export async function isPasswordCategory(db: SQLiteDatabase, id: number): Promise<boolean> {
  const row = await db.getFirstAsync<{ kind: string | null }>('SELECT kind FROM categories WHERE id = ?', id);
  return row?.kind === 'password';
}

// Home: order chosen by dragging the tiles. It is the order of every category list in the app.
export async function saveCategoryOrder(db: SQLiteDatabase, orderedIds: number[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const [index, id] of orderedIds.entries()) {
      await db.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?', index, id);
    }
  });
}

export async function listDocumentIdsInCategory(db: SQLiteDatabase, id: number): Promise<number[]> {
  const rows = await db.getAllAsync<{ id: number }>(
    'SELECT id FROM documents WHERE category_id = ? AND deleted_at IS NULL',
    id,
  );
  return rows.map((row) => row.id);
}

export async function countDocumentsInCategory(db: SQLiteDatabase, id: number): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM documents WHERE category_id = ? AND deleted_at IS NULL',
    id,
  );
  return row?.count ?? 0;
}

// The "Tessere e card" category (marked kind = 'cards' by migration V5)
export async function getCardsCategory(db: SQLiteDatabase): Promise<Category | null> {
  const row = await db.getFirstAsync<CategoryRecord>("SELECT * FROM categories WHERE kind = 'cards' AND hidden = 0 LIMIT 1");
  return row ? mapCategory(row) : null;
}
