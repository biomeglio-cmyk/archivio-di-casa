import { router } from 'expo-router';
import { FlatList } from 'react-native';

import { CategoryTile } from '@/components/category-tile';
import { DashedAddTile } from '@/components/dashed-add-tile';
import { listCategoriesWithCounts } from '@/db/categories';
import type { CategoryWithCount } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { TILE_COLUMNS, tileGridStyles, useTileSize } from '@/hooks/use-tile-size';

// The grid items: every category, then the dashed "Nuova categoria" tile
type GridItem = { kind: 'category'; category: CategoryWithCount } | { kind: 'new' };

// "/archive": two-column grid of categories, plus the dashed "Nuova categoria" tile
export default function ArchiveScreen() {
  const size = useTileSize();
  const { data: categories } = useDbQuery(listCategoriesWithCounts, []);

  // "Nuova categoria" appears together with the categories, so it doesn't flash alone while loading
  const items: GridItem[] = categories
    ? [...categories.map((category) => ({ kind: 'category' as const, category })), { kind: 'new' }]
    : [];

  return (
    <FlatList
      data={items}
      numColumns={TILE_COLUMNS}
      keyExtractor={(item) => (item.kind === 'category' ? String(item.category.id) : 'new')}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={tileGridStyles.content}
      columnWrapperStyle={tileGridStyles.row}
      renderItem={({ item }) =>
        item.kind === 'category' ? (
          <CategoryTile category={item.category} documentCount={item.category.documentCount} size={size} />
        ) : (
          <DashedAddTile label="Nuova categoria" size={size} onPress={() => router.push('/category-form')} />
        )
      }
    />
  );
}
