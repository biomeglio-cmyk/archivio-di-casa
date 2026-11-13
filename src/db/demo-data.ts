import type { SQLiteDatabase } from 'expo-sqlite';

import { t } from '@/i18n';

// Demo people and documents, inserted by migration V2 ONLY in development (__DEV__).
// Names, titles and notes are written in the active language at insert time (t() under
// demoData.*); the categories are matched by their stored built-in name, which stays Italian.

type DemoPerson = 'step' | 'mom' | 'dad';
const DEMO_PEOPLE: DemoPerson[] = ['step', 'mom', 'dad'];

type DemoDocument = {
  key: string; // demoData.documents.<key>: the title
  category: string; // built-in category name, as stored in the database
  person?: DemoPerson;
  expiresInDays?: number; // relative to the first launch, so every section has something
  hasNotes?: boolean; // demoData.notes.<key>
};

// Category names below are database values, not shown text (hence i18n-ignore)
const DEMO_DOCUMENTS: DemoDocument[] = [
  { key: 'idCard', category: 'Identità', person: 'step', expiresInDays: 3 }, // i18n-ignore
  { key: 'drivingLicence', category: 'Identità', person: 'dad', expiresInDays: 20 }, // i18n-ignore
  { key: 'passport', category: 'Identità', person: 'mom', expiresInDays: 240 }, // i18n-ignore
  { key: 'electricityBill', category: 'Utenze', expiresInDays: 5, hasNotes: true }, // i18n-ignore
  { key: 'carInsurance', category: 'Assicurazioni', person: 'dad', expiresInDays: 14 }, // i18n-ignore
  { key: 'carTax', category: 'Auto e veicoli', person: 'dad', expiresInDays: 45 }, // i18n-ignore
  { key: 'washingMachineWarranty', category: 'Garanzie e scontrini', expiresInDays: 400 }, // i18n-ignore
  { key: 'gymCard', category: 'Tessere e card', person: 'step', expiresInDays: 26 }, // i18n-ignore
  { key: 'rentalContract', category: 'Casa' }, // i18n-ignore
  { key: 'pharmacyReceipt', category: 'Spese per il 730', person: 'mom' }, // i18n-ignore
  { key: 'reportCard', category: 'Scuola e famiglia', person: 'step' }, // i18n-ignore
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
  const personIds = new Map<DemoPerson, number>();
  for (const person of DEMO_PEOPLE) {
    const result = await db.runAsync('INSERT INTO people (name) VALUES (?)', t(`demoData.people.${person}`));
    personIds.set(person, result.lastInsertRowId);
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
      t(`demoData.documents.${doc.key}`),
      categoryId,
      doc.person ? (personIds.get(doc.person) ?? null) : null,
      doc.expiresInDays !== undefined ? daysFromToday(doc.expiresInDays) : null,
      doc.hasNotes ? t(`demoData.notes.${doc.key}`) : null,
    );
  }
}
