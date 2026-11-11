import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

import { CategoryTile } from '@/components/category-tile';
import { SearchBar } from '@/components/search-bar';
import { SearchResultsList } from '@/components/search-results';
import { SortableTileGrid } from '@/components/sortable-tile-grid';
import { TabHeader } from '@/components/tab-header';
import { TileScrollView } from '@/components/tile-grid';
import { listCategoriesWithCounts, saveCategoryOrder } from '@/db/categories';
import { listAllDocuments } from '@/db/documents';
import { useDbQuery } from '@/hooks/use-db-query';
import { hasSeenOnboarding } from '@/onboarding/onboarding-flag';
import { searchDocuments, type SearchFilter } from '@/search/search-documents';

const AFTER_SPLASH_MS = 1100; // the opening screen lasts about one second
const SEARCH_DEBOUNCE_MS = 200;

// "/" route, the app opens here: logo + "Sottomano" + Menu, the search bar (both fixed), then the
// two-column grid of categories with the dashed "Nuova categoria" tile, or the search results while searching
export default function ArchiveScreen() {
  const db = useSQLiteContext();
  const scrollRef = useAnimatedRef<Animated.ScrollView>(); // the page scrolls while a category is dragged
  const { data: categories } = useDbQuery(listCategoriesWithCounts, []);
  const { data: allDocuments } = useDbQuery(listAllDocuments, []);

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

  // First launch only: show the "Consigli iniziali" once the opening screen has faded
  useEffect(() => {
    if (hasSeenOnboarding()) return;
    const timer = setTimeout(() => router.push('/onboarding'), AFTER_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    // Gesture root for the drag and drop of the categories
    <GestureHandlerRootView style={styles.screen}>
      {/* Fixed top: the shared tab header, then the search field. It stays mounted while the grid
          below is swapped for the results, so the keyboard stays open. */}
      <TabHeader title="Sottomano" />
      <View style={styles.top}>
        <SearchBar
          value={query}
          placeholder="Cerca nei documenti"
          onChangeText={(text) => {
            setQuery(text);
            setFilter({ kind: 'all' }); // new search, all results
          }}
        />
      </View>

      {searching && results ? (
        <SearchResultsList query={searched} results={results} filter={filter} onFilterChange={setFilter} />
      ) : (
        <TileScrollView ref={scrollRef} keyboardShouldPersistTaps="handled">
          {categories && (
            <SortableTileGrid
              items={categories}
              keyFor={(category) => category.id}
              labelFor={(category) =>
                `${category.name}, ${category.documentCount === 1 ? '1 documento' : `${category.documentCount} documenti`}`
              }
              renderTile={(category) => <CategoryTile category={category} documentCount={category.documentCount} />}
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
        </TileScrollView>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  // The search bar under the shared header; the grid's own top padding (16) gives the same air below
  top: {
    paddingHorizontal: 16,
  },
});
