import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text } from 'react-native';

import { FONTS } from '@/constants/brand';
import type { Category } from '@/db/types';

type Props = {
  category: Category;
  documentCount: number;
};

// Tile of a category in Home: gradient lighter at the top, darker at the bottom, in the palette
// colors. The look only: the sortable grid around it handles tap (open) and drag (reorder).
export function CategoryTile({ category, documentCount }: Props) {
  const { colors } = category;

  return (
    <LinearGradient colors={[colors.top, colors.bottom]} style={styles.tile}>
      <SymbolView name={category.symbol} tintColor={colors.text} size={28} />
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
        {category.name}
      </Text>
      <Text style={[styles.count, { color: colors.text }]}>
        {documentCount === 1 ? '1 documento' : `${documentCount} documenti`}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1, // fills the grid cell
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
