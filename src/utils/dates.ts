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
