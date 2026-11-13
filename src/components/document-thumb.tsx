import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import type { DocumentListItem } from '@/db/types';
import { resolveDocumentFile } from '@/storage/document-files';
import { themedStyles } from '@/constants/theme';

const WIDTH = 86;
const HEIGHT = 54; // a card's proportions

// The small picture of a row of "Riordina" (86 × 54, corners 9): the photo (unless the cover is a
// color), the color of a card, or the category gradient with its icon
export function DocumentThumb({ document }: { document: DocumentListItem }) {
  const { category } = document;
  if (document.firstImagePath && document.coverMode !== 'color') {
    return (
      <Image
        source={{ uri: resolveDocumentFile(document.firstImagePath).uri }}
        style={styles.thumb}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
    );
  }
  const solid = document.coverColor ?? (category.isCards ? (document.cardColor ?? DEFAULT_CARD_COLOR) : null);
  if (solid) {
    return (
      <View style={[styles.thumb, styles.center, { backgroundColor: solid }]}>
        <SymbolView name={category.symbol} tintColor="#FFFFFF" size={20} />
      </View>
    );
  }
  return (
    <LinearGradient
      colors={[category.colors.top, category.colors.bottom]}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={[styles.thumb, styles.center]}>
      <SymbolView name={category.symbol} tintColor={category.colors.text} size={20} />
    </LinearGradient>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  thumb: {
    width: WIDTH,
    height: HEIGHT,
    borderRadius: 9,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
