// Turns an ISO date string (YYYY-MM-DD) into a local Date at midnight.
// new Date('2026-11-09') would be read as UTC and could shift by one day.
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// "12 nov 2026"
export function formatDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Local Date → 'YYYY-MM-DD' (toISOString would use UTC and could shift the day)
export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// ---- Italian names (written out, so the format is identical on every device) ----

const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const MONTHS_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const MONTHS = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
];

// "lun 9 nov"; the year is added only when it isn't the current one: "mer 14 lug 2027"
export function formatShortDate(iso: string, today: Date = new Date()): string {
  const date = parseISODate(iso);
  const base = `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
  return date.getFullYear() === today.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

// "3 giorni", "2 mesi", "1 anno": days up to 45, then months, then years
function span(amount: number): string {
  if (amount <= 45) return plural(amount, 'giorno', 'giorni');
  if (amount < 365) return plural(Math.round(amount / 30.44), 'mese', 'mesi');
  return plural(Math.round(amount / 365.25), 'anno', 'anni');
}

// For a document's expiry: "oggi", "domani", "tra 3 giorni", "scaduto ieri", "scaduto da 2 giorni"
export function describeDistance(days: number): string {
  if (days === 0) return 'oggi';
  if (days === 1) return 'domani';
  if (days === -1) return 'scaduto ieri';
  return days > 0 ? `tra ${span(days)}` : `scaduto da ${span(-days)}`;
}

// For a calendar day: "oggi", "domani", "ieri", "tra 2 giorni", "3 giorni fa"
export function describeDayDistance(days: number): string {
  if (days === 0) return 'oggi';
  if (days === 1) return 'domani';
  if (days === -1) return 'ieri';
  return days > 0 ? `tra ${span(days)}` : `${span(-days)} fa`;
}

const WEEKDAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "Giovedì 12 novembre" (+ year if it isn't the current one)
export function formatLongDay(iso: string, today: Date = new Date()): string {
  const date = parseISODate(iso);
  const base = `${capitalize(WEEKDAYS[date.getDay()])} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === today.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

// "Novembre 2026"
export function formatMonthTitle(year: number, month: number): string {
  return `${capitalize(MONTHS[month])} ${year}`;
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

// "9–15 novembre", "30 novembre – 6 dicembre", and the year when it isn't the current one
export function formatWeekRange(mondayIso: string, today: Date = new Date()): string {
  const start = parseISODate(mondayIso);
  const end = parseISODate(addDaysIso(mondayIso, 6));
  const year = end.getFullYear() !== today.getFullYear() ? ` ${end.getFullYear()}` : '';
  const endText = `${end.getDate()} ${MONTHS[end.getMonth()]}${year}`;
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()}–${endText}`
    : `${start.getDate()} ${MONTHS[start.getMonth()]} – ${endText}`;
}
