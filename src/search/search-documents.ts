import type { DocumentListItem } from '@/db/types';
import { findMatch, normalizeText, snippetAround, type MatchRange } from '@/search/text-match';

export type SearchHit = {
  document: DocumentListItem;
  titleMatch: MatchRange | null; // to show the matched word in bold
  note: { text: string; match: MatchRange } | null; // snippet, only for "found in the notes"
};

export type SearchResults = {
  documents: SearchHit[]; // match in title, number, category or person
  inNotes: SearchHit[]; // match only in the notes
};

export type SearchFilter = { kind: 'all' } | { kind: 'category'; id: number } | { kind: 'person'; id: number };

// Searches the documents (already read from SQLite) for the query, ignoring case and accents
export function searchDocuments(all: DocumentListItem[], query: string): SearchResults {
  const q = normalizeText(query.trim());
  const results: SearchResults = { documents: [], inNotes: [] };
  if (!q) return results;

  for (const document of all) {
    const titleMatch = findMatch(document.title, q);
    const elsewhere =
      titleMatch ||
      findMatch(document.number, q) ||
      findMatch(document.barcodeValue, q) ||
      findMatch(document.category.name, q) ||
      findMatch(document.personName, q);
    if (elsewhere) {
      results.documents.push({ document, titleMatch, note: null });
      continue;
    }
    const noteMatch = findMatch(document.notes, q);
    if (noteMatch && document.notes) {
      results.inNotes.push({ document, titleMatch: null, note: snippetAround(document.notes, noteMatch) });
    }
  }
  return results;
}

export function applyFilter(hits: SearchHit[], filter: SearchFilter): SearchHit[] {
  if (filter.kind === 'category') return hits.filter((h) => h.document.categoryId === filter.id);
  if (filter.kind === 'person') return hits.filter((h) => h.document.personId === filter.id);
  return hits;
}

export type FilterChip = { key: string; label: string; filter: SearchFilter };

// "Tutti" + the categories and people that appear in the current results
export function chipsFor(results: SearchResults): FilterChip[] {
  const chips: FilterChip[] = [{ key: 'all', label: 'Tutti', filter: { kind: 'all' } }];
  const seen = new Set<string>();
  for (const { document } of [...results.documents, ...results.inNotes]) {
    const categoryKey = `c${document.categoryId}`;
    if (!seen.has(categoryKey)) {
      seen.add(categoryKey);
      chips.push({ key: categoryKey, label: document.category.name, filter: { kind: 'category', id: document.categoryId } });
    }
  }
  for (const { document } of [...results.documents, ...results.inNotes]) {
    if (document.personId === null || !document.personName) continue;
    const personKey = `p${document.personId}`;
    if (!seen.has(personKey)) {
      seen.add(personKey);
      chips.push({ key: personKey, label: document.personName, filter: { kind: 'person', id: document.personId } });
    }
  }
  return chips;
}
