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

export const CATEGORY_TILE_HEIGHT = 132; // Home squares of the guide

// "12 documenti", "1 documento"; "5 tessere" for "Tessere e card"
export function describeCategoryCount(category: Pick<Category, 'isCards'>, count: number): string {
  if (category.isCards) return count === 1 ? '1 tessera' : `${count} tessere`;
  return count === 1 ? '1 documento' : `${count} documenti`;
}

// Square of a category in Home (docs/design/Main.dc.html): 135° gradient in the palette colors
// with a shadow of its own color; icon 28 at the top, name 17/600 (never broken inside a word)
// and "N documenti" 13/400 at the bottom.
// The look only: the sortable grid around it handles tap (open) and drag (reorder).
export function CategoryTile({ category, documentCount }: Props) {
  const { colors } = category;

  return (
    <LinearGradient
      colors={[colors.top, colors.bottom]}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={[styles.tile, { boxShadow: tintedShadow(categoryShadowRgb(colors)) }]}>
      <SymbolView name={category.symbol} tintColor={colors.text} size={28} />
      <View style={styles.bottom}>
        <TileTitle style={[styles.name, { color: colors.text }]}>{category.name}</TileTitle>
        <Text style={[styles.count, { color: colors.text }]} numberOfLines={1}>
          {describeCategoryCount(category, documentCount)}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1, // fills the grid cell
    padding: 16,
    justifyContent: 'space-between',
    borderRadius: Radius.card,
    borderCurve: 'continuous',
  },
  bottom: {
    gap: 1,
  },
  name: {
    fontSize: 17,
    lineHeight: 21,
    fontFamily: FONTS.semiBold,
  },
  count: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: FONTS.regular,
  },
});
