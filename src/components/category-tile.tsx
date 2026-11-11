import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { FONTS } from '@/constants/brand';
import type { Category } from '@/db/types';

type Props = {
  category: Category;
  documentCount: number;
};

// Tile of a category in Home: gradient lighter at the top, darker at the bottom, in the palette
// colors. Icon top-left, number of documents top-right, name bottom-left.
// The look only: the sortable grid around it handles tap (open) and drag (reorder).
export function CategoryTile({ category, documentCount }: Props) {
  const { colors } = category;

  return (
    <LinearGradient colors={[colors.top, colors.bottom]} style={styles.tile}>
      <View style={styles.topRow}>
        <SymbolView name={category.symbol} tintColor={colors.text} size={28} />
        <Text style={[styles.count, { color: colors.text }]} accessibilityElementsHidden>
          {documentCount}
        </Text>
      </View>
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
        {category.name}
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: FONTS.titleSemiBold,
    marginTop: 'auto', // pushes the name to the bottom of the tile
  },
  count: {
    fontSize: 17,
    lineHeight: 28, // same height as the icon, so the number sits on its line
    fontFamily: FONTS.titleSemiBold,
    fontVariant: ['tabular-nums'],
    opacity: 0.8,
  },
});
