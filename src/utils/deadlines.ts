import type { FamilyDocument } from '@/data/documents';
import { parseISODate } from '@/utils/dates';

export type DeadlineSection = {
  title: string;
  documents: FamilyDocument[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days from today to the given ISO date (negative = already expired)
export function daysUntil(iso: string, today: Date = new Date()): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parseISODate(iso).getTime() - start.getTime()) / DAY_MS);
}

// Splits documents with an expiry date into three sections, sorted by date:
// - "Questa settimana": within 7 days (expired ones too, they are the most urgent)
// - "Questo mese": within 30 days
// - "Più avanti": everything else
// Documents without expiry are left out. Empty sections are dropped.
export function groupByDeadline(documents: FamilyDocument[], today: Date = new Date()): DeadlineSection[] {
  const withDate = documents
    .filter((d): d is FamilyDocument & { expiresAt: string } => Boolean(d.expiresAt))
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)); // ISO strings sort like dates

  const sections: DeadlineSection[] = [
    { title: 'Questa settimana', documents: [] },
    { title: 'Questo mese', documents: [] },
    { title: 'Più avanti', documents: [] },
  ];

  for (const doc of withDate) {
    const days = daysUntil(doc.expiresAt, today);
    const index = days <= 7 ? 0 : days <= 30 ? 1 : 2;
    sections[index].documents.push(doc);
  }

  return sections.filter((s) => s.documents.length > 0);
}
