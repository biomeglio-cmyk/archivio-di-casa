import { Alert, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import { CategoryTile } from '@/components/category-tile';
import { NewCategoryTile } from '@/components/new-category-tile';
import { listCategoriesWithCounts } from '@/db/categories';
import { useDbQuery } from '@/hooks/use-db-query';

const PADDING = 16; // space between the grid and the screen edges
const GAP = 12; // space between tiles, both horizontal and vertical
const TILE_HEIGHT = 128;

// "/archive": two-column grid of categories, plus the dashed "Nuova categoria" tile
export default function ArchiveScreen() {
  // Every tile gets the same exact size: half of the usable width, minus half of the gap.
  // Math.floor avoids sub-pixel rounding that could push the second tile to a new row.
  const { width } = useWindowDimensions();
  const { data: categories } = useDbQuery(listCategoriesWithCounts, []);
  const tileSize = { width: Math.floor((width - PADDING * 2 - GAP) / 2), height: TILE_HEIGHT };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.grid}>
      {categories?.map((category) => (
        <CategoryTile
          key={category.id}
          category={category}
          documentCount={category.documentCount}
          size={tileSize}
        />
      ))}
      {/* Shown with the categories, so it doesn't flash alone while they load */}
      {categories && (
        <NewCategoryTile
          size={tileSize}
          onPress={() => Alert.alert('Nuova categoria', 'Disponibile più avanti.')}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    padding: PADDING,
  },
});
