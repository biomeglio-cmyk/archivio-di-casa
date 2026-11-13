import type { Href } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';

import type { CategoryColors, CategoryWithCount, DocumentListItem } from '@/db/types';
import { t } from '@/i18n';
import { findMatch, normalizeText, snippetAround, type MatchRange } from '@/search/text-match';
import { describeDistance } from '@/utils/dates';
import { daysUntil } from '@/utils/deadlines';
import { dayAndMonth } from '@/utils/folder';

export type SearchKind = 'doc' | 'card' | 'deadline';
export type SearchFilterKey = 'all' | SearchKind;

// The chip labels are translated at render time: t(filter.labelKey)
export const SEARCH_FILTERS: { key: SearchFilterKey; labelKey: string }[] = [
  { key: 'all', labelKey: 'searchAll.filters.all' },
  { key: 'doc', labelKey: 'searchAll.filters.documents' },
  { key: 'card', labelKey: 'searchAll.filters.cards' },
  { key: 'deadline', labelKey: 'searchAll.filters.deadlines' },
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
      ? t('searchAll.paid')
      : document.expiresAt
        ? t('searchAll.expiresOn', { date: dayAndMonth(document.expiresAt) })
        : (document.docType ?? document.personName);
  return [document.category.name, detail].filter(Boolean).join(' · ');
}

// Ricerca (docs/design/Ricerca.dc.html): while typing, in names, folders, Tipo, numbers, people,
// notes, cards and deadlines, ignoring case and accents. A document with a deadline is found
// twice: as a document and as a deadline ("Scadenze" filter). Notes: the snippet is highlighted.
// Called at render time: the subtitles follow the current language.
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
      subtitle: t('searchAll.folderSubtitle', { count: category.documentCount }),
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
      ? [t('searchAll.card'), document.docType, document.personName].filter(Boolean).join(' · ')
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
        subtitle: t('searchAll.deadlineSubtitle', { distance: describeDistance(daysUntil(document.expiresAt)) }),
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
