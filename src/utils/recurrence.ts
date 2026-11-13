import { t } from '@/i18n';
import { parseISODate, toISODate } from '@/utils/dates';

// "Si ripete": a deadline that comes back every N days, weeks, months or years
export type RepeatUnit = 'day' | 'week' | 'month' | 'year';
export type Repeat = { every: number; unit: RepeatUnit }; // every: 1…99

export const REPEAT_UNITS: RepeatUnit[] = ['day', 'week', 'month', 'year'];
export const MAX_REPEAT = 99;

// "giorni", "settimane"… (the unit names in the form)
export function unitName(unit: RepeatUnit, every: number): string {
  return t(`recurrence.unit.${unit}`, { count: every });
}

// "6 mesi", "1 settimana" (the "Ogni" choices)
export function unitCount(unit: RepeatUnit, every: number): string {
  return t(`recurrence.count.${unit}`, { count: every });
}

// "Ogni 6 mesi", "Ogni anno", "Ogni settimana"
export function describeEvery({ every, unit }: Repeat): string {
  return t(`recurrence.every.${unit}`, { count: every });
}

// "Si ripete ogni 6 mesi", "Si ripete ogni anno", "Si ripete ogni settimana"
export function describeRepeat({ every, unit }: Repeat): string {
  return t(`recurrence.repeats.${unit}`, { count: every });
}

// The occurrence `count` steps after `anchor`, always computed FROM THE ANCHOR, so the day of the
// month never drifts: 31 Jan + 1 month = 28/29 Feb (last day), + 2 months = 31 Mar.
export function occurrence(anchorIso: string, { every, unit }: Repeat, count: number): string {
  const anchor = parseISODate(anchorIso);
  const steps = every * count;
  if (unit === 'day' || unit === 'week') {
    const date = new Date(anchor);
    date.setDate(date.getDate() + steps * (unit === 'week' ? 7 : 1));
    return toISODate(date);
  }
  const months = unit === 'month' ? steps : steps * 12;
  const year = anchor.getFullYear();
  const month = anchor.getMonth() + months;
  const lastDay = new Date(year, month + 1, 0).getDate(); // day 0 of the next month
  return toISODate(new Date(year, month, Math.min(anchor.getDate(), lastDay)));
}

// "Rinnovato" on a recurring deadline: the first occurrence after the old deadline that is not in
// the past (today counts), skipping the ones missed meanwhile
export function nextOccurrence(oldDeadlineIso: string, repeat: Repeat, today: Date = new Date()): string {
  const todayIso = toISODate(today);
  for (let count = 1; ; count++) {
    const next = occurrence(oldDeadlineIso, repeat, count);
    if (next >= todayIso) return next;
  }
}

export function isRepeatUnit(value: unknown): value is RepeatUnit {
  return typeof value === 'string' && (REPEAT_UNITS as string[]).includes(value);
}
