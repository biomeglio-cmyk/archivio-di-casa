import type { SFSymbol } from 'expo-symbols';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category, CategoryRecord, CategoryWithCount } from '@/db/types';

// Converts a SQL row (snake_case) into the app shape (camelCase).
// `prefix` lets document queries reuse it for JOINed columns named like c_name, c_symbol…
export function mapCategory(row: Record<string, unknown>, prefix = ''): Category {
  const r = (column: string) => row[prefix + column];
  return {
    id: r('id') as number,
    name: r('name') as string,
    symbol: r('symbol') as SFSymbol,
    examples: (r('examples') as string | null) ?? null,
    colors: {
      top: r('color_top') as string,
      bottom: r('color_bottom') as string,
      text: r('color_text') as string,
    },
    isBuiltin: r('is_builtin') === 1,
  };
}

// Columns to SELECT when JOINing categories as "c" into another query
export const CATEGORY_JOIN_COLUMNS = `
  c.id AS c_id, c.name AS c_name, c.symbol AS c_symbol, c.examples AS c_examples,
  c.color_top AS c_color_top, c.color_bottom AS c_color_bottom, c.color_text AS c_color_text,
  c.is_builtin AS c_is_builtin`;

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
