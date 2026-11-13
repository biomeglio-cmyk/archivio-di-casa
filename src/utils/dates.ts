import { t } from '@/i18n';
import { composesDates, intlLocale, monthName, weekdayName } from '@/i18n/format';

// Turns an ISO date string (YYYY-MM-DD) into a local Date at midnight.
// new Date('2026-11-09') would be read as UTC and could shift by one day.
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// "12 nov 2026" / "12 Nov 2026"
export function formatDate(iso: string, month: 'short' | 'long' = 'short'): string {
  return parseISODate(iso).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month,
    year: 'numeric',
  });
}

// Local Date → 'YYYY-MM-DD' (toISOString would use UTC and could shift the day)
export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// ---- Names in the active language (Intl): see i18n/format.ts ----

// "9 novembre" / "9 November"
export function formatDayMonth(date: Date, width: 'long' | 'short' = 'long'): string {
  if (!composesDates()) return date.toLocaleDateString(intlLocale(), { day: 'numeric', month: width });
  return `${date.getDate()} ${monthName(date.getMonth(), width)}`;
}

// "lun 9 nov" / "Mon 9 Nov"; the year is added only when it isn't the current one: "mer 14 lug 2027"
export function formatShortDate(iso: string, today: Date = new Date()): string {
  const date = parseISODate(iso);
  const sameYear = date.getFullYear() === today.getFullYear();
  if (!composesDates()) {
    return date.toLocaleDateString(intlLocale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' }),
    });
  }
  const base = `${weekdayName(date.getDay(), 'short')} ${formatDayMonth(date, 'short')}`;
  return sameYear ? base : `${base} ${date.getFullYear()}`;
}

// Days up to 45, then months, then years: the unit and how many ("3 giorni", "2 mesi", "1 anno")
function span(days: number): { unit: 'Days' | 'Months' | 'Years'; count: number } {
  if (days <= 45) return { unit: 'Days', count: days };
  if (days < 365) return { unit: 'Months', count: Math.round(days / 30.44) };
  return { unit: 'Years', count: Math.round(days / 365.25) };
}

// Whole sentences per unit ("tra 3 giorni", "3 giorni fa"): the number and the noun take the case
// the sentence needs (German "in 3 Tagen", Czech "před 3 dny"…), so no fragment is glued in
function inSpan(days: number): string {
  const { unit, count } = span(days);
  return t(`dates.in${unit}`, { count });
}

// For a document's expiry: "oggi", "domani", "tra 3 giorni", "scaduto ieri", "scaduto da 2 giorni"
export function describeDistance(days: number): string {
  if (days === 0) return t('dates.today');
  if (days === 1) return t('dates.tomorrow');
  if (days === -1) return t('dates.expiredYesterday');
  if (days > 0) return inSpan(days);
  const { unit, count } = span(-days);
  return t(`dates.expired${unit}Ago`, { count });
}

// For a calendar day: "oggi", "domani", "ieri", "tra 2 giorni", "3 giorni fa"
export function describeDayDistance(days: number): string {
  if (days === 0) return t('dates.today');
  if (days === 1) return t('dates.tomorrow');
  if (days === -1) return t('dates.yesterday');
  if (days > 0) return inSpan(days);
  const { unit, count } = span(-days);
  return t(`dates.${unit.toLowerCase()}Ago`, { count });
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "Giovedì 12 novembre" / "Thursday 12 November" (+ year if it isn't the current one)
export function formatLongDay(iso: string, today: Date = new Date()): string {
  const date = parseISODate(iso);
  const sameYear = date.getFullYear() === today.getFullYear();
  if (!composesDates()) {
    return capitalize(
      date.toLocaleDateString(intlLocale(), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        ...(sameYear ? {} : { year: 'numeric' }),
      }),
    );
  }
  const base = `${capitalize(weekdayName(date.getDay()))} ${formatDayMonth(date)}`;
  return sameYear ? base : `${base} ${date.getFullYear()}`;
}

// "Novembre 2026" / "November 2026"
export function formatMonthTitle(year: number, month: number): string {
  if (!composesDates()) {
    return capitalize(new Date(year, month, 1).toLocaleDateString(intlLocale(), { month: 'long', year: 'numeric' }));
  }
  return `${capitalize(monthName(month))} ${year}`;
}

// 'YYYY-MM-DD' moved by n days (local calendar, so daylight saving changes don't matter)
export function addDaysIso(iso: string, days: number): string {
  const date = parseISODate(iso);
  return toISODate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

// Monday of the week that contains the given day
export function mondayOfIso(iso: string): string {
  const offset = (parseISODate(iso).getDay() + 6) % 7; // Monday = 0 … Sunday = 6
  return addDaysIso(iso, -offset);
}
