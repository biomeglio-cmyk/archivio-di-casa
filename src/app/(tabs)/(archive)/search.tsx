import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, ChipGroup } from '@/components/chip';
import { Text, TextInput } from '@/components/text';
import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { CardSurface, Colors, Spacing, softTint, onSoftTint } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { listCategoriesWithCounts } from '@/db/categories';
import { listAllDocuments } from '@/db/documents';
import { useDbQuery } from '@/hooks/use-db-query';
import { usePressed } from '@/hooks/use-pressed';
import { SEARCH_FILTERS, searchEverything, type SearchFilterKey, type SearchResult } from '@/search/search-all';
import { highlight, type MatchRange } from '@/search/text-match';
import { categoryShadowRgb } from '@/utils/colors';

const DEBOUNCE_MS = 150;
const LENS = '#6D5CE6';
const MARK_BACKGROUND = softTint('#E8E5FD', '139, 108, 240');
const MARK_TEXT = onSoftTint('#3A2BC8', '#C9C2FF');

// "Ricerca" (docs/design/Ricerca.dc.html), opened by the field in Home: the field (lilac, ringed)
// with "Annulla", the filters Tutto / Documenti / Tessere / Scadenze, "N RISULTATI" and the results
// while typing (46pt square in the category colors, the name with the found part highlighted, a
// grey line), or "Nessun risultato". It searches names, folders, Tipo, numbers, people, notes,
// cards and deadlines.
export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { data: documents } = useDbQuery(listAllDocuments, []);
  const { data: categories } = useDbQuery(listCategoriesWithCounts, []);
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [filter, setFilter] = useState<SearchFilterKey>('all');

  useEffect(() => {
    const timer = setTimeout(() => setSearched(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const all = searchEverything(documents ?? [], categories ?? [], searched);
  const results = filter === 'all' ? all : all.filter((r) => r.kind === filter);
  const typed = searched.trim().length > 0;

  return (
    <ScrollView
      style={styles.screen}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}>
      <View style={styles.bar}>
        <View style={styles.field}>
          <SymbolView name="magnifyingglass" tintColor={LENS} size={20} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cerca un documento"
            placeholderTextColor={Colors.current.textSecondary}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Cerca tra i documenti"
            style={styles.input}
          />
        </View>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.cancel}>Annulla</Text>
        </Pressable>
      </View>

      <View style={styles.filters} accessibilityLabel="Filtra">
        <ChipGroup>
          {SEARCH_FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </ChipGroup>
      </View>

      {typed ? (
        <>
          <Text style={styles.count} accessibilityLiveRegion="polite">
            {results.length === 1 ? '1 risultato' : `${results.length} risultati`}
          </Text>
          <View style={styles.list}>
            {results.map((result) => (
              <ResultRow key={result.key} result={result} />
            ))}
            {results.length === 0 && (
              <View style={styles.none}>
                <Text style={styles.noneTitle}>Nessun risultato</Text>
                <Text style={styles.noneText}>Prova con un’altra parola, per esempio il nome di un negozio.</Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <Text style={styles.hint}>
          Cerca nei nomi, nelle cartelle, nei tipi, nelle note, nelle tessere e nelle scadenze.
        </Text>
      )}
    </ScrollView>
  );
}

function ResultRow({ result }: { result: SearchResult }) {
  const { pressed, handlers } = usePressed();
  return (
    <Pressable
      {...handlers}
      onPress={() => router.push(result.href)}
      accessibilityRole="button"
      accessibilityLabel={`${result.title}, ${result.subtitle}`}
      style={[styles.row, pressed && styles.pressed]}>
      <LinearGradient
        colors={[result.colors.top, result.colors.bottom]}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={[styles.square, { boxShadow: `0 6px 12px rgba(${categoryShadowRgb(result.colors)}, 0.22)` }]}>
        <SymbolView name={result.symbol} tintColor={result.colors.text} size={22} />
      </LinearGradient>
      <View style={styles.texts}>
        <Marked text={result.title} match={result.titleMatch} style={styles.title} />
        <Marked text={result.subtitle} match={result.subtitleMatch} style={styles.subtitle} />
      </View>
    </Pressable>
  );
}

// Text with the found part on a soft lilac mark, bold indigo
function Marked({ text, match, style }: { text: string; match: MatchRange | null; style: object }) {
  return (
    <Text style={style} numberOfLines={2}>
      {highlight(text, match).map((segment, index) =>
        segment.bold ? (
          <Text key={index} style={styles.mark}>
            {segment.text}
          </Text>
        ) : (
          segment.text
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.current.background,
  },
  page: {
    paddingHorizontal: Spacing.side,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  field: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 26,
    backgroundColor: Colors.current.lilac,
    boxShadow: '0 0 0 2px #C9C2FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: Colors.current.text,
  },
  cancel: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: Colors.current.accent,
  },
  filters: {
    marginTop: 16,
  },
  count: {
    marginTop: 18,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: Colors.current.textSecondary,
  },
  list: {
    marginTop: 12,
    gap: 10,
  },
  row: {
    ...CardSurface,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pressed: {
    opacity: 0.7,
  },
  square: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: Colors.current.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
  },
  mark: {
    backgroundColor: MARK_BACKGROUND,
    color: MARK_TEXT,
    fontFamily: FONTS.bold,
  },
  none: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: Colors.current.paleLilac,
    alignItems: 'center',
  },
  noneTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
  },
  noneText: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
    textAlign: 'center',
  },
  hint: {
    marginTop: 24,
    marginHorizontal: 4,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
    textAlign: 'center',
  },
});
