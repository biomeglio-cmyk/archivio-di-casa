import { addDaysIso, mondayOfIso, parseISODate, toISODate } from '@/utils/dates';

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days from today to the given ISO date (negative = in the past)
export function daysUntil(iso: string, today: Date = new Date()): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parseISODate(iso).getTime() - start.getTime()) / DAY_MS);
}

export type DeadlineSectionKey = 'overdue' | 'week' | 'month' | 'later';

export type DeadlineSection<T> = {
  key: DeadlineSectionKey;
  title: string; // "Da sistemare · 2", "Questa settimana · 3", "Questo mese", "Più avanti"
  data: T[]; // `data` is the name SectionList expects
};

type WithExpiry = { expiresAt: string | null };

// Every document with an expiry, in calendar sections, each sorted by date:
// - "Da sistemare": already expired (always first)
// - "Questa settimana": from today to Sunday
// - "Questo mese": after this week, up to the last day of the month
// - "Più avanti": the rest
// Empty sections are left out.
export function groupDeadlines<T extends WithExpiry>(documents: T[], now: Date = new Date()): DeadlineSection<T>[] {
  const todayIso = toISODate(now);
  const sundayIso = addDaysIso(mondayOfIso(todayIso), 6);
  const monthEndIso = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)); // day 0 = last of this month

  const overdue: T[] = [];
  const week: T[] = [];
  const month: T[] = [];
  const later: T[] = [];

  const sorted = documents
    .filter((d): d is T & { expiresAt: string } => d.expiresAt !== null)
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)); // ISO strings sort like dates

  for (const doc of sorted) {
    if (doc.expiresAt < todayIso) overdue.push(doc);
    else if (doc.expiresAt <= sundayIso) week.push(doc);
    else if (doc.expiresAt <= monthEndIso) month.push(doc);
    else later.push(doc);
  }

  const sections: DeadlineSection<T>[] = [
    { key: 'overdue', title: `Da sistemare · ${overdue.length}`, data: overdue },
    { key: 'week', title: `Questa settimana · ${week.length}`, data: week },
    { key: 'month', title: 'Questo mese', data: month },
    { key: 'later', title: 'Più avanti', data: later },
  ];
  return sections.filter((s) => s.data.length > 0);
}
