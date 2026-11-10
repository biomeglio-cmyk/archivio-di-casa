import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';

import { FONTS } from '@/constants/brand';
import type { Category } from '@/db/types';
import { usePressed } from '@/hooks/use-pressed';
import type { TileSize } from '@/hooks/use-tile-size';

type Props = {
  category: Category;
  documentCount: number;
  size: TileSize; // width from the grid, minimum height (taller with large text)
};

// Pastel tile of the archive grid: lighter at the top, darker at the bottom.
// Fixed width and minimum height on the outermost element; with large Dynamic Type the tile grows
// and the grid row stretches its neighbour to the same height.
export function CategoryTile({ category, documentCount, size }: Props) {
  const { colors } = category;
  const { pressed, handlers } = usePressed();

  return (
    <Pressable
      {...handlers}
      onPress={() => router.push({ pathname: '/category/[id]', params: { id: String(category.id) } })}
      accessibilityRole="button"
      style={[size, pressed && styles.pressed]}>
      <LinearGradient colors={[colors.top, colors.bottom]} style={styles.tile}>
        <SymbolView name={category.symbol} tintColor={colors.text} size={28} />
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {category.name}
        </Text>
        <Text style={[styles.count, { color: colors.text }]}>
          {documentCount === 1 ? '1 documento' : `${documentCount} documenti`}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
  },
  tile: {
    flex: 1, // fills the (possibly stretched) tile
    padding: 14,
    borderRadius: 20,
    borderCurve: 'continuous',
  },
  name: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: FONTS.titleSemiBold,
    marginTop: 'auto', // pushes name and count to the bottom of the tile
  },
  count: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 500,
    opacity: 0.75,
  },
});
