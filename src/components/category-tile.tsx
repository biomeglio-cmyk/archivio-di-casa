import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { TileTitle } from '@/components/tile-title';
import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { type Palette, Radius, tintedShadow } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import type { Category } from '@/db/types';
import { t } from '@/i18n';
import { categoryShadowRgb } from '@/utils/colors';
import { useThemedStyles } from '@/hooks/use-theme';

type Props = {
  category: Category;
  documentCount: number;
};

export const CATEGORY_TILE_HEIGHT = 132; // Home squares of the guide

// "12 documenti", "1 documento"; "5 tessere" for "Tessere e card" (VoiceOver label of the tile)
export function describeCategoryCount(category: Pick<Category, 'isCards'>, count: number): string {
  // Called at render time by the screens, which re-render when the language changes
  if (category.isCards) return t('categoryTile.cards', { count });
  return t('common.documents', { count });
}

// Square of a category in Home (docs/design/Main.dc.html): 135° gradient in the palette colors
// with a shadow of its own color; icon 28 at the top-left with the number of documents next to
// it (17/600, nothing when empty), name 17/600 at the bottom (never broken inside a word).
// The look only: the sortable grid around it handles tap (open) and drag (reorder).
export function CategoryTile({ category, documentCount }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = category;

  return (
    <LinearGradient
      colors={[colors.top, colors.bottom]}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={[styles.tile, { boxShadow: tintedShadow(categoryShadowRgb(colors)) }]}>
      <View style={styles.top}>
        <SymbolView name={category.symbol} tintColor={colors.text} size={28} />
        {/* The number only when there is something; VoiceOver reads "N documenti" from the grid label */}
        {documentCount > 0 && (
          <Text
            style={[styles.count, { color: colors.text }]}
            numberOfLines={1}
            maxFontSizeMultiplier={2}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            {documentCount}
          </Text>
        )}
      </View>
      <TileTitle style={[styles.name, { color: colors.text }]}>{category.name}</TileTitle>
    </LinearGradient>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  tile: {
    flex: 1, // fills the grid cell
    padding: 16,
    justifyContent: 'space-between',
    borderRadius: Radius.card,
    borderCurve: 'continuous',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 17,
    lineHeight: 21,
    fontFamily: FONTS.semiBold,
  },
  count: {
    fontSize: 17,
    lineHeight: 28, // the height of the icon, so the number sits centered on its line
    fontFamily: FONTS.semiBold,
    fontVariant: ['tabular-nums'],
  },
});
