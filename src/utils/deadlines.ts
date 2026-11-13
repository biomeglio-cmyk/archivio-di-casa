import { monthName } from '@/i18n/format';
import { addDaysIso, capitalize, mondayOfIso, parseISODate, toISODate } from '@/utils/dates';

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days from today to the given ISO date (negative = in the past)
export function daysUntil(iso: string, today: Date = new Date()): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parseISODate(iso).getTime() - start.getTime()) / DAY_MS);
}

export type DeadlineSection<T> = {
  key: string; // 'overdue', 'week' or the month 'YYYY-MM'
  title: string; // "Da sistemare", "Questa settimana", "Dicembre", "Gennaio 2027"
  kind: 'overdue' | 'week' | 'month';
  data: T[];
};

type WithExpiry = { expiresAt: string | null };

// "Dicembre" in the current year, "Gennaio 2027" otherwise
export function monthSectionTitle(monthKey: string, now: Date = new Date()): string {
  const [year, month] = monthKey.split('-').map(Number);
  const name = capitalize(monthName(month - 1));
  return year === now.getFullYear() ? name : `${name} ${year}`;
}

// The deadlines of Scadenze (docs/design/Scadenze.dc.html), each list sorted by date:
// - "Da sistemare": already expired (our extra, always first)
// - "Questa settimana": from today to Sunday
// - then one section per month ("Novembre", "Dicembre", "Gennaio 2027"…)
// Empty sections are left out.
export function groupDeadlines<T extends WithExpiry>(documents: T[], now: Date = new Date()): DeadlineSection<T>[] {
  const todayIso = toISODate(now);
  const sundayIso = addDaysIso(mondayOfIso(todayIso), 6);

  const sorted = documents
    .filter((d): d is T & { expiresAt: string } => d.expiresAt !== null)
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt)); // ISO strings sort like dates

  const overdue: T[] = [];
  const week: T[] = [];
  const months = new Map<string, T[]>();
  for (const doc of sorted) {
    if (doc.expiresAt < todayIso) overdue.push(doc);
    else if (doc.expiresAt <= sundayIso) week.push(doc);
    else {
      const key = doc.expiresAt.slice(0, 7);
      months.set(key, [...(months.get(key) ?? []), doc]);
    }
  }

  const sections: DeadlineSection<T>[] = [];
  if (overdue.length) sections.push({ key: 'overdue', title: 'Da sistemare', kind: 'overdue', data: overdue });
  if (week.length) sections.push({ key: 'week', title: 'Questa settimana', kind: 'week', data: week });
  for (const [key, data] of months) {
    sections.push({ key, title: monthSectionTitle(key, now), kind: 'month', data });
  }
  return sections;
}

// "4 cose da fare nei prossimi mesi": the deadlines from today on
export function upcomingSummary(count: number): string {
  if (count === 0) return 'Niente in scadenza nei prossimi mesi';
  return count === 1 ? '1 cosa da fare nei prossimi mesi' : `${count} cose da fare nei prossimi mesi`;
}
