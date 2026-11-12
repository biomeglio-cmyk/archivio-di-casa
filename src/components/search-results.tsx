import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip, ChipGroup } from '@/components/chip';
import { IconSquare } from '@/components/icon-square';
import { Text } from '@/components/text';
import { cardRowEdge } from '@/constants/theme';
import { usePressed } from '@/hooks/use-pressed';
import { useTheme } from '@/hooks/use-theme';
import { applyFilter, chipsFor, type SearchFilter, type SearchHit, type SearchResults } from '@/search/search-documents';
import { highlight, type MatchRange } from '@/search/text-match';
import { formatShortDate } from '@/utils/dates';

type Props = {
  query: string;
  results: SearchResults;
  filter: SearchFilter;
  onFilterChange: (filter: SearchFilter) => void;
};

type Section = { key: 'documents' | 'notes'; title: string; data: SearchHit[] };

// Search results in Home, drawn inside the Home page (which scrolls): filter chips, then
// "DOCUMENTI · N" and "TROVATO NELLE NOTE · N" as white cards, with the matched word in bold
export function SearchResultsList({ query, results, filter, onFilterChange }: Props) {
  const theme = useTheme();
  const cardColor = theme.surface;
  const chips = chipsFor(results);

  const documents = applyFilter(results.documents, filter);
  const inNotes = applyFilter(results.inNotes, filter);
  const sections: Section[] = [
    { key: 'documents' as const, title: `Documenti · ${documents.length}`, data: documents },
    { key: 'notes' as const, title: `Trovato nelle note · ${inNotes.length}`, data: inNotes },
  ].filter((s) => s.data.length > 0);

  return (
    <View style={styles.content}>
      {chips.length > 1 && (
        <View style={styles.chips}>
          <ChipGroup>
            {chips.map((chip) => (
              <Chip
                key={chip.key}
                label={chip.label}
                selected={sameFilter(chip.filter, filter)}
                onPress={() => onFilterChange(chip.filter)}
              />
            ))}
          </ChipGroup>
        </View>
      )}
      {sections.length === 0 && (
        <Text style={[styles.empty, { color: theme.textSecondary }]}>Nessun risultato per «{query.trim()}»</Text>
      )}
      {sections.map((section) => (
        <View key={section.key}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]} accessibilityRole="header">
            {section.title}
          </Text>
          {section.data.map((hit, index) => (
            <ResultRow
              key={hit.document.id}
              hit={hit}
              cardColor={cardColor}
              first={index === 0}
              last={index === section.data.length - 1}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function sameFilter(a: SearchFilter, b: SearchFilter): boolean {
  if (a.kind === 'all' || b.kind === 'all') return a.kind === b.kind;
  return a.kind === b.kind && a.id === b.id;
}

// Text with one bold part
function Highlighted({ text, match, style, boldColor }: { text: string; match: MatchRange | null; style: object; boldColor: string }) {
  return (
    <Text style={style}>
      {highlight(text, match).map((segment, i) =>
        segment.bold ? (
          <Text key={i} style={[styles.bold, { color: boldColor }]}>
            {segment.text}
          </Text>
        ) : (
          segment.text
        ),
      )}
    </Text>
  );
}

function ResultRow({ hit, cardColor, first, last }: { hit: SearchHit; cardColor: string; first: boolean; last: boolean }) {
  const theme = useTheme();
  const { pressed, handlers } = usePressed();
  const { document } = hit;
  const { category } = document;
  // "Categoria · Persona · gio 12 nov"
  const details = [category.name, document.personName, document.expiresAt ? formatShortDate(document.expiresAt) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      {...handlers}
      onPress={() => router.push({ pathname: '/(tabs)/(archive)/document/[id]', params: { id: String(document.id) } })}
      accessibilityRole="button"
      style={[
        styles.row,
        { backgroundColor: pressed ? theme.backgroundSelected : cardColor },
        cardRowEdge(first, last),
      ]}>
      <IconSquare symbol={category.symbol} colors={category.colors} size={28} />
      <View style={[styles.body, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator }]}>
        <View style={styles.texts}>
          <Highlighted text={document.title} match={hit.titleMatch} style={[styles.title, { color: theme.text }]} boldColor={theme.text} />
          <Text style={[styles.details, { color: theme.textSecondary }]}>{details}</Text>
          {hit.note && (
            <Highlighted
              text={hit.note.text}
              match={hit.note.match}
              style={[styles.details, { color: theme.textSecondary }]}
              boldColor={theme.text}
            />
          )}
        </View>
        <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={13} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 16, // the page around it gives the side margins
  },
  chips: {
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 13,
    lineHeight: 18,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
    paddingVertical: 10,
    paddingRight: 16,
  },
  texts: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
  },
  details: {
    fontSize: 13,
    lineHeight: 18,
  },
  bold: {
    fontWeight: 700,
  },
  empty: {
    fontSize: 17,
    textAlign: 'center',
    paddingTop: 48,
  },
});
