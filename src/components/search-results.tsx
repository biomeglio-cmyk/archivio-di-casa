import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { BRAND_COLOR } from '@/constants/brand';
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

// Search results in Home: filter chips, then "DOCUMENTI · N" and "TROVATO NELLE NOTE · N"
// as iOS grouped blocks, with the matched word in bold
export function SearchResultsList({ query, results, filter, onFilterChange }: Props) {
  const theme = useTheme();
  const cardColor = theme.surface; // grouped blocks on the page background
  const chips = chipsFor(results);

  const documents = applyFilter(results.documents, filter);
  const inNotes = applyFilter(results.inNotes, filter);
  const sections: Section[] = [
    { key: 'documents' as const, title: `Documenti · ${documents.length}`, data: documents },
    { key: 'notes' as const, title: `Trovato nelle note · ${inNotes.length}`, data: inNotes },
  ].filter((s) => s.data.length > 0);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(hit) => String(hit.document.id)}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        chips.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            {chips.map((chip) => {
              const selected = sameFilter(chip.filter, filter);
              return (
                <Pressable
                  key={chip.key}
                  onPress={() => onFilterChange(chip.filter)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.chip, { backgroundColor: selected ? BRAND_COLOR : theme.lilac }]}>
                  <Text style={[styles.chipLabel, { color: selected ? '#FFFFFF' : theme.text }]}>{chip.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : undefined
      }
      renderSectionHeader={({ section }) => (
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{section.title}</Text>
      )}
      renderItem={({ item, index, section }) => (
        <ResultRow hit={item} cardColor={cardColor} first={index === 0} last={index === section.data.length - 1} />
      )}
      ListEmptyComponent={
        <Text style={[styles.empty, { color: theme.textSecondary }]}>Nessun risultato per «{query.trim()}»</Text>
      }
    />
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
        first && styles.first,
        last && styles.last,
      ]}>
      <View style={[styles.icon, { backgroundColor: category.colors.bottom }]}>
        <SymbolView name={category.symbol} tintColor={category.colors.text} size={15} />
      </View>
      <View style={[styles.body, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.backgroundSelected }]}>
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 48,
  },
  chips: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chipLabel: {
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 13,
    lineHeight: 18,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  first: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  last: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
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
