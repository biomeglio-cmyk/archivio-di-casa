import type { Href } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';

import type { CategoryColors, CategoryWithCount, DocumentListItem } from '@/db/types';
import { findMatch, normalizeText, snippetAround, type MatchRange } from '@/search/text-match';
import { describeDistance } from '@/utils/dates';
import { daysUntil } from '@/utils/deadlines';
import { dayAndMonth } from '@/utils/folder';

export type SearchKind = 'doc' | 'card' | 'deadline';
export type SearchFilterKey = 'all' | SearchKind;

export const SEARCH_FILTERS: { key: SearchFilterKey; label: string }[] = [
  { key: 'all', label: 'Tutto' },
  { key: 'doc', label: 'Documenti' },
  { key: 'card', label: 'Tessere' },
  { key: 'deadline', label: 'Scadenze' },
];

export type SearchResult = {
  key: string;
  kind: SearchKind; // a folder counts as "Documenti"
  title: string;
  titleMatch: MatchRange | null; // highlighted in the title
  subtitle: string;
  subtitleMatch: MatchRange | null; // when found in the notes: highlighted in the snippet
  symbol: SFSymbol;
  colors: CategoryColors;
  href: Href;
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// "Bollette · scade il 14 novembre", "Bollette · pagata", "Bollette · Luce"
function documentSubtitle(document: DocumentListItem): string {
  const detail =
    document.paymentStatus === 'paid'
      ? 'pagata'
      : document.expiresAt
        ? `scade il ${dayAndMonth(document.expiresAt)}`
        : (document.docType ?? document.personName);
  return [document.category.name, detail].filter(Boolean).join(' · ');
}

// Ricerca (docs/design/Ricerca.dc.html): while typing, in names, folders, Tipo, numbers, people,
// notes, cards and deadlines, ignoring case and accents. A document with a deadline is found
// twice: as a document and as a deadline ("Scadenze" filter). Notes: the snippet is highlighted.
export function searchEverything(
  documents: DocumentListItem[],
  categories: CategoryWithCount[],
  query: string,
): SearchResult[] {
  const q = normalizeText(query.trim());
  if (!q) return [];
  const results: SearchResult[] = [];

  for (const category of categories) {
    const match = findMatch(category.name, q);
    if (!match) continue;
    results.push({
      key: `c${category.id}`,
      kind: category.isCards ? 'card' : 'doc',
      title: category.name,
      titleMatch: match,
      subtitle: `Cartella · ${category.documentCount === 1 ? '1 documento' : `${category.documentCount} documenti`}`,
      subtitleMatch: null,
      symbol: 'folder',
      colors: category.colors,
      href: { pathname: '/category/[id]', params: { id: String(category.id) } },
    });
  }

  const deadlines: SearchResult[] = [];
  for (const document of documents) {
    const titleMatch = findMatch(document.title, q);
    const elsewhere =
      titleMatch ||
      findMatch(document.docType, q) ||
      findMatch(document.number, q) ||
      findMatch(document.barcodeValue, q) ||
      findMatch(document.category.name, q) ||
      findMatch(document.personName, q);
    const noteMatch = elsewhere ? null : findMatch(document.notes, q);
    if (!elsewhere && !noteMatch) continue;

    const note = noteMatch && document.notes ? snippetAround(document.notes, noteMatch) : null;
    const isCard = document.category.isCards;
    const subtitle = isCard
      ? ['Tessera', document.docType, document.personName].filter(Boolean).join(' · ')
      : documentSubtitle(document);
    const href: Href = { pathname: '/(tabs)/(archive)/document/[id]', params: { id: String(document.id) } };
    results.push({
      key: `d${document.id}`,
      kind: isCard ? 'card' : 'doc',
      title: document.title,
      titleMatch,
      subtitle: note ? note.text : subtitle,
      subtitleMatch: note ? note.match : null,
      symbol: isCard ? 'creditcard' : 'doc.text',
      colors: document.category.colors,
      href,
    });

    if (document.expiresAt) {
      deadlines.push({
        key: `s${document.id}`,
        kind: 'deadline',
        title: document.title,
        titleMatch,
        subtitle: `Scadenza · ${describeDistance(daysUntil(document.expiresAt))}`,
        subtitleMatch: null,
        symbol: 'calendar',
        colors: document.category.colors,
        href: { pathname: '/(tabs)/(archive)/document/[id]', params: { id: String(document.id) } },
      });
    }
  }
  // Deadlines after the documents
  return [...results, ...deadlines.map((d) => ({ ...d, subtitle: capitalize(d.subtitle) }))];
}
