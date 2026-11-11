import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { TileTitle } from '@/components/tile-title';
import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { Radius, tintedShadow } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import type { Category } from '@/db/types';
import { categoryShadowRgb } from '@/utils/colors';

type Props = {
  category: Category;
  documentCount: number;
};

// Tile of a category in Home: 135° gradient in the palette colors (white text and icon in the
// "Sottomano" palette) with a shadow of its own color. Icon top-left, number of documents
// top-right, name bottom-left.
// The look only: the sortable grid around it handles tap (open) and drag (reorder).
export function CategoryTile({ category, documentCount }: Props) {
  const { colors } = category;

  return (
    <LinearGradient
      colors={[colors.top, colors.bottom]}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={[styles.tile, { boxShadow: tintedShadow(categoryShadowRgb(colors)) }]}>
      <View style={styles.topRow}>
        <SymbolView name={category.symbol} tintColor={colors.text} size={28} />
        <Text style={[styles.count, { color: colors.text }]} accessibilityElementsHidden>
          {documentCount}
        </Text>
      </View>
      <TileTitle style={[styles.name, { color: colors.text }]} containerStyle={styles.nameBox}>
        {category.name}
      </TileTitle>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1, // fills the grid cell
    padding: 16,
    borderRadius: Radius.card,
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
    fontFamily: FONTS.semiBold,
  },
  nameBox: {
    marginTop: 'auto', // pushes the name to the bottom of the tile
  },
  count: {
    fontSize: 17,
    lineHeight: 28, // same height as the icon, so the number sits on its line
    fontFamily: FONTS.semiBold,
    fontVariant: ['tabular-nums'],
    opacity: 0.8,
  },
});
