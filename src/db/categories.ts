import type { SFSymbol } from 'expo-symbols';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category, CategoryColors, CategoryRecord, CategoryWithCount } from '@/db/types';
import { builtinColorsFor } from '@/settings/palette';

// Converts a SQL row (snake_case) into the app shape (camelCase).
// `prefix` lets document queries reuse it for JOINed columns named like c_name, c_symbol…
// Built-in categories take their colors from the palette chosen in "Aspetto"; custom ones keep
// the color saved in the database.
export function mapCategory(row: Record<string, unknown>, prefix = ''): Category {
  const r = (column: string) => row[prefix + column];
  const symbol = r('symbol') as SFSymbol;
  const isBuiltin = r('is_builtin') === 1;
  return {
    id: r('id') as number,
    name: r('name') as string,
    symbol,
    examples: (r('examples') as string | null) ?? null,
    colors: (isBuiltin ? builtinColorsFor(symbol) : null) ?? {
      top: r('color_top') as string,
      bottom: r('color_bottom') as string,
      text: r('color_text') as string,
    },
    isBuiltin,
    isCards: r('kind') === 'cards',
    isPassword: r('kind') === 'password',
  };
}

// Columns to SELECT when JOINing categories as "c" into another query
export const CATEGORY_JOIN_COLUMNS = `
  c.id AS c_id, c.name AS c_name, c.symbol AS c_symbol, c.examples AS c_examples,
  c.color_top AS c_color_top, c.color_bottom AS c_color_bottom, c.color_text AS c_color_text,
  c.is_builtin AS c_is_builtin, c.kind AS c_kind`;

export async function listCategories(db: SQLiteDatabase): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRecord>('SELECT * FROM categories ORDER BY sort_order, name');
  return rows.map((row) => mapCategory(row));
}

export async function listCategoriesWithCounts(db: SQLiteDatabase): Promise<CategoryWithCount[]> {
  const rows = await db.getAllAsync<CategoryRecord & { document_count: number }>(`
    SELECT c.*, COUNT(d.id) AS document_count
    FROM categories c
    LEFT JOIN documents d ON d.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order, c.name`);
  return rows.map((row) => ({ ...mapCategory(row), documentCount: row.document_count }));
}

export async function getCategory(db: SQLiteDatabase, id: number): Promise<Category | null> {
  const row = await db.getFirstAsync<CategoryRecord>('SELECT * FROM categories WHERE id = ?', id);
  return row ? mapCategory(row) : null;
}

export type CategoryInput = {
  name: string;
  symbol: SFSymbol;
  colors: CategoryColors;
};

// New custom categories go after all the others
export async function insertCategory(db: SQLiteDatabase, input: CategoryInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO categories (name, symbol, color_top, color_bottom, color_text, is_builtin, sort_order)
     VALUES (?, ?, ?, ?, ?, 0, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM categories))`,
    input.name.trim(),
    input.symbol,
    input.colors.top,
    input.colors.bottom,
    input.colors.text,
  );
  return result.lastInsertRowId;
}

// Built-in categories can only be renamed; custom ones can also change icon and color
export async function updateCategory(db: SQLiteDatabase, id: number, input: CategoryInput): Promise<void> {
  await db.runAsync(
    `UPDATE categories
     SET name = ?,
         symbol = CASE WHEN is_builtin = 1 THEN symbol ELSE ? END,
         color_top = CASE WHEN is_builtin = 1 THEN color_top ELSE ? END,
         color_bottom = CASE WHEN is_builtin = 1 THEN color_bottom ELSE ? END,
         color_text = CASE WHEN is_builtin = 1 THEN color_text ELSE ? END,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
    input.name.trim(),
    input.symbol,
    input.colors.top,
    input.colors.bottom,
    input.colors.text,
    id,
  );
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

export async function countDocumentsInCategory(db: SQLiteDatabase, id: number): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM documents WHERE category_id = ?', id);
  return row?.count ?? 0;
}

// Only custom categories without documents. The database enforces it too:
// documents.category_id has ON DELETE RESTRICT.
export async function deleteCategory(db: SQLiteDatabase, id: number): Promise<void> {
  const result = await db.runAsync('DELETE FROM categories WHERE id = ? AND is_builtin = 0', id);
  if (result.changes === 0) {
    throw new Error('Le categorie di base non si possono eliminare.');
  }
}

// The "Tessere e card" category (marked kind = 'cards' by migration V5)
export async function getCardsCategory(db: SQLiteDatabase): Promise<Category | null> {
  const row = await db.getFirstAsync<CategoryRecord>("SELECT * FROM categories WHERE kind = 'cards' LIMIT 1");
  return row ? mapCategory(row) : null;
}
