import { router } from 'expo-router';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

import { CategoryTile } from '@/components/category-tile';
import { NewCategoryTile } from '@/components/new-category-tile';
import { listCategoriesWithCounts } from '@/db/categories';
import type { CategoryWithCount } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';

const COLUMNS = 2;
const PADDING = 16; // space between the grid and the screen edges
const GAP = 12; // space between tiles, both horizontal and vertical
const TILE_HEIGHT = 128;

// The grid items: every category, then the dashed "Nuova categoria" tile
type GridItem = { kind: 'category'; category: CategoryWithCount } | { kind: 'new' };

// "/archive": two-column grid of categories, plus the dashed "Nuova categoria" tile
export default function ArchiveScreen() {
  const { width } = useWindowDimensions();
  const { data: categories } = useDbQuery(listCategoriesWithCounts, []);

  // Every cell has the same fixed size, computed from the screen width (never from the content):
  // (screen - side paddings - gap between the columns) / 2. Math.floor avoids sub-pixel overflow.
  const cell = { width: Math.floor((width - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS), height: TILE_HEIGHT };

  // "Nuova categoria" appears together with the categories, so it doesn't flash alone while loading
  const items: GridItem[] = categories
    ? [...categories.map((category) => ({ kind: 'category' as const, category })), { kind: 'new' }]
    : [];

  return (
    <FlatList
      data={items}
      numColumns={COLUMNS}
      keyExtractor={(item) => (item.kind === 'category' ? String(item.category.id) : 'new')}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      columnWrapperStyle={styles.row}
      renderItem={({ item }) => (
        // The cell owns the size: whatever the tile or its Link/menu wrappers render stays inside it
        <View style={cell}>
          {item.kind === 'category' ? (
            <CategoryTile category={item.category} documentCount={item.category.documentCount} size={cell} />
          ) : (
            <NewCategoryTile onPress={() => router.push('/category-form')} />
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: PADDING,
    gap: GAP, // vertical space between rows
  },
  row: {
    gap: GAP, // horizontal space between the two columns
  },
});
