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

// In Italian the first day of the month is written "1º"
function dayNumber(date: Date): string {
  return date.getDate() === 1 ? '1º' : String(date.getDate());
}

// "lun 9 nov"; the year is added only when it isn't the current one: "mer 14 lug 2027"
export function formatShortDate(iso: string, today: Date = new Date()): string {
  const date = parseISODate(iso);
  const base = `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
  return date.getFullYear() === today.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

// "30 novembre", "1º dicembre" (+ year if it isn't the current one)
export function formatDayMonth(date: Date, today: Date = new Date()): string {
  const base = `${dayNumber(date)} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === today.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

// "9–15 novembre" or, across two months, "28 novembre – 4 dicembre"
export function formatDayRange(start: Date, end: Date, today: Date = new Date()): string {
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${dayNumber(start)}–${formatDayMonth(end, today)}`;
  }
  return `${formatDayMonth(start, today)} – ${formatDayMonth(end, today)}`;
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

// How far a date is: "oggi", "domani", "tra 3 giorni", "tra 2 mesi", "tra 1 anno",
// and for past dates "scaduto ieri", "scaduto da 2 giorni"…
export function describeDistance(days: number): string {
  const amount = Math.abs(days);
  let span: string;
  if (amount <= 45) span = plural(amount, 'giorno', 'giorni');
  else if (amount < 365) span = plural(Math.round(amount / 30.44), 'mese', 'mesi');
  else span = plural(Math.round(amount / 365.25), 'anno', 'anni');

  if (days === 0) return 'oggi';
  if (days === 1) return 'domani';
  if (days === -1) return 'scaduto ieri';
  return days > 0 ? `tra ${span}` : `scaduto da ${span}`;
}
