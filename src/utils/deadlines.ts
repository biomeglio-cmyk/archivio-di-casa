import { formatDayMonth, formatDayRange, parseISODate } from '@/utils/dates';

type WithExpiry = { expiresAt: string | null };

export type DeadlineSection<T> = {
  title: string; // "Questa settimana"
  range: string; // "9–15 novembre"
  documents: T[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// Whole days from today to the given ISO date (negative = already expired)
export function daysUntil(iso: string, today: Date = new Date()): number {
  return Math.round((parseISODate(iso).getTime() - startOfDay(today).getTime()) / DAY_MS);
}

// Splits documents with an expiry date into calendar sections, sorted by date:
// - "Questa settimana": up to Sunday of the current week (Monday–Sunday), expired ones included
// - "Questo mese": after this week, up to the last day of the month
// - "Più avanti": everything after
// Documents without expiry are left out. Empty sections are dropped.
export function groupByDeadline<T extends WithExpiry>(documents: T[], now: Date = new Date()): DeadlineSection<T>[] {
  const today = startOfDay(now);
  const mondayOffset = (today.getDay() + 6) % 7; // Monday = 0 … Sunday = 6
  const weekStart = addDays(today, -mondayOffset);
  const weekEnd = addDays(weekStart, 6);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0); // day 0 = last day of this month
  // When this week already reaches next month, "Questo mese" has no days left
  const laterStart = addDays(monthEnd > weekEnd ? monthEnd : weekEnd, 1);

  const week: DeadlineSection<T> = {
    title: 'Questa settimana',
    range: formatDayRange(weekStart, weekEnd, today),
    documents: [],
  };
  const month: DeadlineSection<T> = {
    title: 'Questo mese',
    range: `fino al ${formatDayMonth(monthEnd, today)}`,
    documents: [],
  };
  const later: DeadlineSection<T> = {
    title: 'Più avanti',
    range: `dal ${formatDayMonth(laterStart, today)}`,
    documents: [],
  };

  const withDate = documents
    .filter((d): d is T & { expiresAt: string } => d.expiresAt !== null)
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)); // ISO strings sort like dates

  for (const doc of withDate) {
    const date = parseISODate(doc.expiresAt);
    if (date <= weekEnd) week.documents.push(doc);
    else if (date <= monthEnd) month.documents.push(doc);
    else later.documents.push(doc);
  }

  return [week, month, later].filter((s) => s.documents.length > 0);
}
