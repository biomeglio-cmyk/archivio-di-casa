import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

import { categoryQuickActions } from '@/actions/quick-actions';
import { BackupReminder } from '@/components/backup-reminder';
import { CATEGORY_TILE_HEIGHT, CategoryTile, describeCategoryCount } from '@/components/category-tile';
import { HomeHeader } from '@/components/home-header';
import { FavoriteTile, NextDeadlineCard } from '@/components/home-sections';
import { SearchBar } from '@/components/search-bar';
import { SearchResultsList } from '@/components/search-results';
import { SectionHeader } from '@/components/section-header';
import { SortableTileGrid } from '@/components/sortable-tile-grid';
import { Text } from '@/components/text';
import { TileScrollView } from '@/components/tile-grid';
import { Colors, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { listCategoriesWithCounts, saveCategoryOrder } from '@/db/categories';
import { listAllDocuments, listDocumentsWithExpiry, listPinnedDocuments } from '@/db/documents';
import type { DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { hasSeenOnboarding } from '@/onboarding/onboarding-flag';
import { searchDocuments, type SearchFilter } from '@/search/search-documents';
import { toISODate } from '@/utils/dates';

const AFTER_SPLASH_MS = 1100; // the opening screen lasts about one second
const SEARCH_DEBOUNCE_MS = 200;

// Under "SCADENZE": the first deadline from today on (none: the section is hidden)
function nextDeadline(documents: DocumentListItem[]): DocumentListItem | null {
  const today = toISODate(new Date());
  return documents.find((d) => d.expiresAt !== null && d.expiresAt >= today) ?? null;
}

// "/" route, the app opens here (docs/design/Main.dc.html). One scrolling page: ≡ menu, bell and
// logo; "Ciao!"; the search field; the backup notice; PREFERITI (the first 2), SCADENZE (the
// next one), ARCHIVIO (the categories, with drag and drop and the quick menu).
// While searching, the results take the place of the sections, under the same field (so the
// keyboard stays open).
export default function ArchiveScreen() {
  const db = useSQLiteContext();
  const scrollRef = useAnimatedRef<Animated.ScrollView>(); // the page scrolls while a category is dragged
  const { data: categories } = useDbQuery(listCategoriesWithCounts, []);
  const { data: allDocuments } = useDbQuery(listAllDocuments, []);
  const { data: pinned } = useDbQuery(listPinnedDocuments, []);
  const { data: withExpiry } = useDbQuery(listDocumentsWithExpiry, []);

  const [query, setQuery] = useState(''); // what is typed
  const [searched, setSearched] = useState(''); // what is searched, ~200 ms after the last key
  const [filter, setFilter] = useState<SearchFilter>({ kind: 'all' });

  // Debounce: search only when typing pauses
  useEffect(() => {
    const timer = setTimeout(() => setSearched(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const searching = searched.trim().length > 0 && query.trim().length > 0;
  const results = searching ? searchDocuments(allDocuments ?? [], searched) : null;
  const favorites = (pinned ?? []).slice(0, 2);
  const next = withExpiry ? nextDeadline(withExpiry) : null;

  // First launch only: show the "Consigli iniziali" once the opening screen has faded
  useEffect(() => {
    if (hasSeenOnboarding()) return;
    const timer = setTimeout(() => router.push('/onboarding'), AFTER_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    // Gesture root for the drag and drop of the categories
    <GestureHandlerRootView style={styles.screen}>
      <TileScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={searching ? 'on-drag' : 'none'}
        contentContainerStyle={styles.page}>
        <HomeHeader />
        <Text style={styles.hello} accessibilityRole="header">
          Ciao!
        </Text>
        <View style={styles.search}>
          <SearchBar
            value={query}
            placeholder="Cerca un documento"
            onChangeText={(text) => {
              setQuery(text);
              setFilter({ kind: 'all' }); // new search, all results
            }}
          />
        </View>

        {searching && results ? (
          <SearchResultsList query={searched} results={results} filter={filter} onFilterChange={setFilter} />
        ) : (
          <>
            <View style={styles.notice}>
              <BackupReminder />
            </View>

            {favorites.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Preferiti"
                  action={{
                    label: 'Vedi tutto',
                    accessibilityLabel: 'Vedi tutti i preferiti',
                    onPress: () => router.navigate('/(tabs)/(favorites)/favorites'),
                  }}
                />
                <View style={styles.favorites}>
                  {favorites.map((document) => (
                    <FavoriteTile key={document.id} document={document} />
                  ))}
                  {/* One favorite: it keeps half the width, like in a grid of two */}
                  {favorites.length === 1 && <View style={styles.flex} />}
                </View>
              </View>
            )}

            {next && (
              <View style={styles.section}>
                <SectionHeader
                  title="Scadenze"
                  action={{
                    label: 'Vedi tutto',
                    accessibilityLabel: 'Vedi tutte le scadenze',
                    onPress: () => router.navigate('/(tabs)/(deadlines)/deadlines'),
                  }}
                />
                <NextDeadlineCard document={next} />
              </View>
            )}

            <View style={styles.section}>
              <SectionHeader title="Archivio" />
              {categories && (
                <SortableTileGrid
                  items={categories}
                  keyFor={(category) => category.id}
                  labelFor={(category) => `${category.name}, ${describeCategoryCount(category, category.documentCount)}`}
                  tileHeight={CATEGORY_TILE_HEIGHT}
                  renderTile={(category) => <CategoryTile category={category} documentCount={category.documentCount} />}
                  actionsFor={(category) => categoryQuickActions(db, category)}
                  onOpen={(category) => router.push({ pathname: '/category/[id]', params: { id: String(category.id) } })}
                  onReorder={(ordered) =>
                    saveCategoryOrder(db, ordered.map((c) => c.id)).catch((error: unknown) =>
                      Alert.alert('Impossibile salvare l’ordine', error instanceof Error ? error.message : String(error)),
                    )
                  }
                  add={{ label: 'Nuova categoria', onPress: () => router.push('/category-form') }}
                  scrollableRef={scrollRef}
                />
              )}
            </View>
          </>
        )}
      </TileScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  // The page of the design: 22 at the sides, room for the tab bar at the bottom
  page: {
    paddingTop: 8,
    paddingBottom: Spacing.belowContent,
    gap: 0,
  },
  hello: {
    marginTop: 22,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONTS.bold,
    color: Colors.light.text,
  },
  search: {
    marginTop: 18,
  },
  notice: {
    marginTop: 16,
  },
  section: {
    marginTop: 26,
    gap: Spacing.titleToContent,
  },
  favorites: {
    flexDirection: 'row',
    gap: Spacing.tileGap,
  },
});
