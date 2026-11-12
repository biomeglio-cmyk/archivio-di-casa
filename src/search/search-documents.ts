import type { DocumentListItem } from '@/db/types';
import { findMatch, normalizeText, snippetAround, type MatchRange } from '@/search/text-match';

export type SearchHit = {
  document: DocumentListItem;
  titleMatch: MatchRange | null; // to show the matched word in bold
  note: { text: string; match: MatchRange } | null; // snippet, only for "found in the notes"
};

export type SearchResults = {
  documents: SearchHit[]; // match in title, number, Tipo, category or person
  inNotes: SearchHit[]; // match only in the notes
};

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
      findMatch(document.docType, q) ||
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
