import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { FONTS } from '@/constants/brand';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import type { DocumentListItem } from '@/db/types';
import { resolveDocumentFile } from '@/storage/document-files';

// One favorite, as big as a category tile: its photo filling the tile with the title on a dark
// bar, or (without photo) the card color / category gradient with icon and title.
// The look only: the sortable grid around it handles tap and drag.
export function FavoriteTile({ document }: { document: DocumentListItem }) {
  const { category } = document;

  if (document.firstImagePath) {
    return (
      <View style={[styles.tile, styles.photoTile]}>
        <Image
          source={{ uri: resolveDocumentFile(document.firstImagePath).uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={120}
          accessibilityIgnoresInvertColors
        />
        <View style={styles.bar}>
          <Text style={styles.barTitle} numberOfLines={2}>
            {document.title}
          </Text>
        </View>
      </View>
    );
  }
  if (category.isCards) {
    // A card without photo keeps its own color, as in "Tessere e card"
    return (
      <View style={[styles.tile, styles.padded, { backgroundColor: document.cardColor ?? DEFAULT_CARD_COLOR }]}>
        <SymbolView name={category.symbol} tintColor="#FFFFFF" size={28} />
        <Text style={[styles.title, { color: '#FFFFFF' }]} numberOfLines={3}>
          {document.title}
        </Text>
      </View>
    );
  }
  return (
    <LinearGradient colors={[category.colors.top, category.colors.bottom]} style={[styles.tile, styles.padded]}>
      <SymbolView name={category.symbol} tintColor={category.colors.text} size={28} />
      <Text style={[styles.title, { color: category.colors.text }]} numberOfLines={3}>
        {document.title}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1, // fills the grid cell
    borderRadius: 20,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  padded: {
    padding: 14,
  },
  photoTile: {
    justifyContent: 'flex-end',
  },
  bar: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)', // readable over any photo
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  barTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FONTS.titleSemiBold,
  },
  title: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: FONTS.titleSemiBold,
    marginTop: 'auto', // title at the bottom, as in the category tiles
  },
});
