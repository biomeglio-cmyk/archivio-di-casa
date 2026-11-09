import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { Category } from '@/constants/categories';

type Props = {
  category: Category;
  documentCount: number;
  size: { width: number; height: number }; // decided by the grid, so all tiles match
};

// Pastel tile of the archive grid: lighter at the top, darker at the bottom
export function CategoryTile({ category, documentCount, size }: Props) {
  const { colors } = category;

  return (
    <Link href={{ pathname: '/category/[id]', params: { id: category.id } }} asChild>
      <Pressable style={({ pressed }) => [size, pressed && styles.pressed]}>
        <LinearGradient colors={[colors.top, colors.bottom]} style={styles.tile}>
          <SymbolView name={category.symbol} tintColor={colors.text} size={28} />
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {category.name}
          </Text>
          <Text style={[styles.count, { color: colors.text }]} numberOfLines={1}>
            {documentCount === 1 ? '1 documento' : `${documentCount} documenti`}
          </Text>
        </LinearGradient>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
  },
  tile: {
    flex: 1,
    padding: 14,
    borderRadius: 20,
    borderCurve: 'continuous',
  },
  name: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: 700,
    marginTop: 'auto', // pushes name and count to the bottom of the tile
  },
  count: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 500,
    opacity: 0.75,
  },
});
