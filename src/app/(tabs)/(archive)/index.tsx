import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryTile } from '@/components/category-tile';
import { FavoritesSection, SectionHeader } from '@/components/favorites-section';
import { SearchBar } from '@/components/search-bar';
import { SearchResultsList } from '@/components/search-results';
import { ThemedText } from '@/components/themed-text';
import { TileGrid, TileScrollView } from '@/components/tile-grid';
import { FONTS } from '@/constants/brand';
import { listCategoriesWithCounts } from '@/db/categories';
import { listAllDocuments } from '@/db/documents';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { hasSeenOnboarding } from '@/onboarding/onboarding-flag';
import { searchDocuments, type SearchFilter } from '@/search/search-documents';
import { usePreferences } from '@/settings/preferences';

const AFTER_SPLASH_MS = 1100; // the opening screen lasts about one second
const SEARCH_DEBOUNCE_MS = 200;

// "/" route, the app opens here: brand header and search bar (fixed), then "Preferiti", "Categorie" and the
// two-column grid of categories with the dashed "Nuova categoria" tile, or the search results while searching
export default function ArchiveScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef<Animated.ScrollView>(); // Preferiti scroll the page while dragging
  const theme = useTheme();
  const { data: categories } = useDbQuery(listCategoriesWithCounts, []);
  const { data: allDocuments } = useDbQuery(listAllDocuments, []);
  const { showPinned } = usePreferences(); // "Mostra in Home" in the Preferiti screen

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

  const total = categories?.reduce((sum, c) => sum + c.documentCount, 0) ?? 0;

  // First launch only: show the "Consigli iniziali" once the opening screen has faded
  useEffect(() => {
    if (hasSeenOnboarding()) return;
    const timer = setTimeout(() => router.push('/onboarding'), AFTER_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    // Gesture root for the drag and drop of the Preferiti
    <GestureHandlerRootView style={styles.screen}>
      {/* Fixed top: no navigation bar here, so the safe area is added by hand. The search field
          stays mounted while the grid below is swapped for the results, so the keyboard stays open. */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image source={require('@/assets/images/logo-icon.png')} style={styles.logo} contentFit="cover" />
            <ThemedText style={styles.name}>Sottomano</ThemedText>
            <Pressable
              onPress={() => router.push('/menu')}
              accessibilityRole="button"
              accessibilityLabel="Menu"
              hitSlop={8}
              style={styles.menuButton}>
              {/* "Candy box": the grid icon in a round chip (white in light mode, dark grey in dark mode) */}
              <View style={[styles.menuChip, { backgroundColor: theme.surface }]}>
                <SymbolView name="circle.grid.3x3.fill" tintColor={theme.text} size={16} />
              </View>
            </Pressable>
          </View>
          <ThemedText themeColor="textSecondary">
            Home · {total === 1 ? '1 documento' : `${total} documenti`}
          </ThemedText>
        </View>
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
          {showPinned && <FavoritesSection scrollableRef={scrollRef} />}
          <SectionHeader title="Categorie" />
          <TileGrid
            items={categories}
            keyFor={(category) => category.id}
            add={{ label: 'Nuova categoria', onPress: () => router.push('/category-form') }}
            renderTile={(category, size) => (
              <CategoryTile category={category} documentCount={category.documentCount} size={size} />
            )}
          />
        </TileScrollView>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  top: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 10,
  },
  header: {
    gap: 4,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  menuChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButton: {
    marginLeft: 'auto', // pushed to the right edge
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 30,
    lineHeight: 38,
    fontFamily: FONTS.wordmark,
  },
});
