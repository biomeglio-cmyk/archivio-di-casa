import { parseISODate, toISODate } from '@/utils/dates';

// "Si ripete": a deadline that comes back every N days, weeks, months or years
export type RepeatUnit = 'day' | 'week' | 'month' | 'year';
export type Repeat = { every: number; unit: RepeatUnit }; // every: 1…99

export const REPEAT_UNITS: RepeatUnit[] = ['day', 'week', 'month', 'year'];
export const MAX_REPEAT = 99;

const NAMES: Record<RepeatUnit, { one: string; many: string }> = {
  day: { one: 'giorno', many: 'giorni' },
  week: { one: 'settimana', many: 'settimane' },
  month: { one: 'mese', many: 'mesi' },
  year: { one: 'anno', many: 'anni' },
};

// "giorni", "settimane"… (the unit names in the form)
export function unitName(unit: RepeatUnit, every: number): string {
  return every === 1 ? NAMES[unit].one : NAMES[unit].many;
}

// "Si ripete ogni 6 mesi", "Si ripete ogni anno", "Si ripete ogni settimana"
export function describeRepeat({ every, unit }: Repeat): string {
  if (every === 1) return unit === 'week' ? 'Si ripete ogni settimana' : `Si ripete ogni ${NAMES[unit].one}`;
  return `Si ripete ogni ${every} ${NAMES[unit].many}`;
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
