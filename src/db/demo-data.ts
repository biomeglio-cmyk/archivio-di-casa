import type { SQLiteDatabase } from 'expo-sqlite';

// Demo people and documents, inserted by migration V2 ONLY in development (__DEV__).

const DEMO_PEOPLE = ['Step', 'Mamma', 'Papà'];

type DemoDocument = {
  title: string;
  category: string; // built-in category name
  person?: string; // demo person name
  expiresInDays?: number; // relative to the first launch, so every section has something
  notes?: string;
};

const DEMO_DOCUMENTS: DemoDocument[] = [
  { title: "Carta d'identità", category: 'Identità', person: 'Step', expiresInDays: 3 },
  { title: 'Patente di guida', category: 'Identità', person: 'Papà', expiresInDays: 20 },
  { title: 'Passaporto', category: 'Identità', person: 'Mamma', expiresInDays: 240 },
  { title: 'Bolletta luce', category: 'Utenze', expiresInDays: 5, notes: 'Addebito diretto in banca' },
  { title: 'Assicurazione auto', category: 'Assicurazioni', person: 'Papà', expiresInDays: 14 },
  { title: 'Bollo auto', category: 'Auto e veicoli', person: 'Papà', expiresInDays: 45 },
  { title: 'Garanzia lavatrice', category: 'Garanzie e scontrini', expiresInDays: 400 },
  { title: 'Tessera palestra', category: 'Tessere e card', person: 'Step', expiresInDays: 26 },
  { title: 'Contratto di affitto', category: 'Casa' },
  { title: 'Scontrino farmacia', category: 'Spese per il 730', person: 'Mamma' },
  { title: 'Pagella', category: 'Scuola e famiglia', person: 'Step' },
];

// 'YYYY-MM-DD' for today + days, built from local date parts (toISOString would use UTC)
function daysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export async function insertDemoData(db: SQLiteDatabase): Promise<void> {
  const personIds = new Map<string, number>();
  for (const name of DEMO_PEOPLE) {
    const result = await db.runAsync('INSERT INTO people (name) VALUES (?)', name);
    personIds.set(name, result.lastInsertRowId);
  }

  const categories = await db.getAllAsync<{ id: number; name: string }>(
    'SELECT id, name FROM categories WHERE is_builtin = 1',
  );
  const categoryIds = new Map(categories.map((c) => [c.name, c.id]));

  for (const doc of DEMO_DOCUMENTS) {
    const categoryId = categoryIds.get(doc.category);
    if (categoryId === undefined) {
      throw new Error(`Demo data: unknown category "${doc.category}"`);
    }
    await db.runAsync(
      'INSERT INTO documents (title, category_id, person_id, expires_at, notes) VALUES (?, ?, ?, ?, ?)',
      doc.title,
      categoryId,
      doc.person ? (personIds.get(doc.person) ?? null) : null,
      doc.expiresInDays !== undefined ? daysFromToday(doc.expiresInDays) : null,
      doc.notes ?? null,
    );
  }
}
