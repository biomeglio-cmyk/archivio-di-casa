// Case- and accent-insensitive matching that keeps track of positions in the original text,
// so the matched word can be shown in bold. Emoji are left untouched: they display and match.

const COMBINING_MARKS = /[̀-ͯ]/g;

// "Città" → "citta". Applied to both the query and the text.
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
}

// Normalizes `text` one character at a time (Array.from keeps emoji in one piece) and remembers,
// for every normalized code unit, where it came from in the original string
function normalizeWithMap(text: string): { normalized: string; origin: number[] } {
  let normalized = '';
  const origin: number[] = [];
  let index = 0;
  for (const char of Array.from(text)) {
    const piece = normalizeText(char);
    for (let i = 0; i < piece.length; i++) origin.push(index);
    normalized += piece;
    index += char.length;
  }
  origin.push(index); // end position
  return { normalized, origin };
}

export type MatchRange = { start: number; end: number }; // in the original text

export function findMatch(text: string | null | undefined, normalizedQuery: string): MatchRange | null {
  if (!text || !normalizedQuery) return null;
  const { normalized, origin } = normalizeWithMap(text);
  const at = normalized.indexOf(normalizedQuery);
  if (at < 0) return null;
  const start = origin[at];
  const last = origin[at + normalizedQuery.length - 1];
  // End after the whole original character of the last matched unit (accents, emoji)
  const end = origin.find((position) => position > last) ?? text.length;
  return { start, end };
}

export type Segment = { text: string; bold: boolean };

// "…the text around the match…", at most `radius` characters on each side
export function snippetAround(text: string, match: MatchRange, radius = 30): { text: string; match: MatchRange } {
  const from = Math.max(0, match.start - radius);
  const to = Math.min(text.length, match.end + radius);
  const prefix = from > 0 ? '…' : '';
  const suffix = to < text.length ? '…' : '';
  return {
    text: `${prefix}${text.slice(from, to)}${suffix}`,
    match: { start: match.start - from + prefix.length, end: match.end - from + prefix.length },
  };
}

// The text split into plain and bold parts around the match
export function highlight(text: string, match: MatchRange | null): Segment[] {
  if (!match) return [{ text, bold: false }];
  return [
    { text: text.slice(0, match.start), bold: false },
    { text: text.slice(match.start, match.end), bold: true },
    { text: text.slice(match.end), bold: false },
  ].filter((segment) => segment.text.length > 0);
}
