import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryTile } from '@/components/category-tile';
import { DashedAddTile } from '@/components/dashed-add-tile';
import { PinnedStrip } from '@/components/pinned-strip';
import { SearchBar } from '@/components/search-bar';
import { SearchResultsList } from '@/components/search-results';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR, FONTS } from '@/constants/brand';
import { listCategoriesWithCounts } from '@/db/categories';
import { listAllDocuments } from '@/db/documents';
import type { CategoryWithCount } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { TILE_COLUMNS, tileGridStyles, useTileSize } from '@/hooks/use-tile-size';
import { hasSeenOnboarding } from '@/onboarding/onboarding-flag';
import { searchDocuments, type SearchFilter } from '@/search/search-documents';
import { usePreferences } from '@/settings/preferences';

const AFTER_SPLASH_MS = 1100; // the opening screen lasts about one second
const SEARCH_DEBOUNCE_MS = 200;

// The grid items: every category, then the dashed "Nuova categoria" tile
type GridItem = { kind: 'category'; category: CategoryWithCount } | { kind: 'new' };

// "/" route, the app opens here: brand header and search bar (fixed), then "Sottomano" and the
// two-column grid of categories with the dashed "Nuova categoria" tile, or the search results while searching
export default function ArchiveScreen() {
  const size = useTileSize();
  const insets = useSafeAreaInsets();
  const { data: categories } = useDbQuery(listCategoriesWithCounts, []);
  const { data: allDocuments } = useDbQuery(listAllDocuments, []);
  const { showPinned } = usePreferences(); // "Mostra Sottomano in Archivio" in Impostazioni

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

  // "Nuova categoria" appears together with the categories, so it doesn't flash alone while loading
  const items: GridItem[] = categories
    ? [...categories.map((category) => ({ kind: 'category' as const, category })), { kind: 'new' }]
    : [];
  const total = categories?.reduce((sum, c) => sum + c.documentCount, 0) ?? 0;

  // First launch only: show the "Consigli iniziali" once the opening screen has faded
  useEffect(() => {
    if (hasSeenOnboarding()) return;
    const timer = setTimeout(() => router.push('/onboarding'), AFTER_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.screen}>
      {/* Fixed top: no navigation bar here, so the safe area is added by hand. The search field
          stays mounted while the grid below is swapped for the results, so the keyboard stays open. */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image source={require('@/assets/images/logo-icon.png')} style={styles.logo} contentFit="cover" />
            <ThemedText style={styles.name}>sottomano</ThemedText>
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Impostazioni"
              hitSlop={8}
              style={styles.gear}>
              <SymbolView name="gearshape" tintColor={BRAND_COLOR} size={24} />
            </Pressable>
          </View>
          <ThemedText themeColor="textSecondary">
            Archivio · {total === 1 ? '1 documento' : `${total} documenti`}
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
        <FlatList
          data={items}
          numColumns={TILE_COLUMNS}
          keyExtractor={(item) => (item.kind === 'category' ? String(item.category.id) : 'new')}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic" // keeps the last row above the tab bar
          contentContainerStyle={tileGridStyles.content}
          columnWrapperStyle={tileGridStyles.row}
          ListHeaderComponent={showPinned ? <PinnedStrip /> : undefined}
          renderItem={({ item }) =>
            item.kind === 'category' ? (
              <CategoryTile category={item.category} documentCount={item.category.documentCount} size={size} />
            ) : (
              <DashedAddTile label="Nuova categoria" size={size} onPress={() => router.push('/category-form')} />
            )
          }
        />
      )}
    </View>
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
  gear: {
    marginLeft: 'auto', // pushed to the right edge
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONTS.titleBold,
  },
});
