import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { CategoryTile } from '@/components/category-tile';
import { DashedAddTile } from '@/components/dashed-add-tile';
import { ThemedText } from '@/components/themed-text';
import { FONTS } from '@/constants/brand';
import { listCategoriesWithCounts } from '@/db/categories';
import type { CategoryWithCount } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { TILE_COLUMNS, tileGridStyles, useTileSize } from '@/hooks/use-tile-size';

// The grid items: every category, then the dashed "Nuova categoria" tile
type GridItem = { kind: 'category'; category: CategoryWithCount } | { kind: 'new' };

// "/" route, the app opens here: brand header, then the two-column grid of categories
// and the dashed "Nuova categoria" tile
export default function ArchiveScreen() {
  const size = useTileSize();
  const { data: categories } = useDbQuery(listCategoriesWithCounts, []);

  // "Nuova categoria" appears together with the categories, so it doesn't flash alone while loading
  const items: GridItem[] = categories
    ? [...categories.map((category) => ({ kind: 'category' as const, category })), { kind: 'new' }]
    : [];
  const total = categories?.reduce((sum, c) => sum + c.documentCount, 0) ?? 0;

  return (
    <FlatList
      data={items}
      numColumns={TILE_COLUMNS}
      keyExtractor={(item) => (item.kind === 'category' ? String(item.category.id) : 'new')}
      // No navigation bar here: "automatic" keeps the header below the status bar
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={tileGridStyles.content}
      columnWrapperStyle={tileGridStyles.row}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image source={require('@/assets/images/logo-icon.png')} style={styles.logo} contentFit="cover" />
            <ThemedText style={styles.name}>sottomano</ThemedText>
          </View>
          <ThemedText themeColor="textSecondary">
            Archivio · {total === 1 ? '1 documento' : `${total} documenti`}
          </ThemedText>
        </View>
      }
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

const styles = StyleSheet.create({
  header: {
    gap: 4,
    paddingTop: 8,
    paddingBottom: 4,
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
  name: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONTS.titleBold,
  },
});
