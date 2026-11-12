// Amounts in euro, kept as integer cents (84,20 € = 8420) so sums are exact

// "€ 84,20", "€ 1.250,00" (as in the design)
export function formatEuro(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  const grouped = String(euros).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `€ ${grouped},${rest}`;
}

// What the user typed ("84,2", "84.20", "€ 1.250", "1250,5") → cents; null when empty or not a number
export function parseEuro(text: string): number | null {
  const cleaned = text.replace(/[€\s]/g, '');
  if (!cleaned) return null;
  // The last , or . followed by 1–2 digits is the decimal separator; the others group thousands
  const match = /^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,](\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const euros = Number(match[1].replace(/[.,]/g, ''));
  const decimals = match[2] ? Number(match[2].padEnd(2, '0')) : 0;
  const cents = euros * 100 + decimals;
  return Number.isFinite(cents) ? cents : null;
}

// For the "Importo" field: "84,20" (no symbol)
export function centsToInput(cents: number | null): string {
  if (cents === null) return '';
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`;
}
