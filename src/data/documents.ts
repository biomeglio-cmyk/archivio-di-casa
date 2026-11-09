// A document stored in the archive
export type FamilyDocument = {
  id: string;
  title: string;
  categoryId: string;      // matches Category.id in constants/categories.ts
  personId?: string;       // matches Person.id in data/people.ts (optional: some docs belong to the family)
  expiresAt?: string;      // ISO date (YYYY-MM-DD); missing = it never expires
  notes?: string;
};

// Returns the ISO date that is `days` days from today.
// Fake deadlines are relative to today, so the "this week / this month / later"
// sections always have something to show while we build the skeleton.
function daysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  // Build the string from local date parts (toISOString would use UTC and could shift the day)
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// Fake data for the app skeleton
export const DOCUMENTS: FamilyDocument[] = [
  { id: 'd1', title: "Carta d'identità", categoryId: 'identity', personId: 'step', expiresAt: daysFromToday(3) },
  { id: 'd2', title: 'Patente di guida', categoryId: 'identity', personId: 'papa', expiresAt: daysFromToday(20) },
  { id: 'd3', title: 'Passaporto', categoryId: 'identity', personId: 'mamma', expiresAt: daysFromToday(240) },
  { id: 'd4', title: 'Bolletta luce', categoryId: 'utilities', expiresAt: daysFromToday(5), notes: 'Addebito diretto in banca' },
  { id: 'd5', title: 'Assicurazione auto', categoryId: 'insurance', personId: 'papa', expiresAt: daysFromToday(14) },
  { id: 'd6', title: 'Bollo auto', categoryId: 'vehicles', personId: 'papa', expiresAt: daysFromToday(45) },
  { id: 'd7', title: 'Garanzia lavatrice', categoryId: 'warranties', expiresAt: daysFromToday(400) },
  { id: 'd8', title: 'Tessera palestra', categoryId: 'cards', personId: 'step', expiresAt: daysFromToday(26) },
  { id: 'd9', title: 'Contratto di affitto', categoryId: 'home' },
  { id: 'd10', title: 'Scontrino farmacia', categoryId: 'tax', personId: 'mamma' },
  { id: 'd11', title: 'Pagella', categoryId: 'school-family', personId: 'step' },
];

export function getDocument(id: string): FamilyDocument | undefined {
  return DOCUMENTS.find((d) => d.id === id);
}

export function getDocumentsByCategory(categoryId: string): FamilyDocument[] {
  return DOCUMENTS.filter((d) => d.categoryId === categoryId);
}

export function getDocumentsByPerson(personId: string): FamilyDocument[] {
  return DOCUMENTS.filter((d) => d.personId === personId);
}
