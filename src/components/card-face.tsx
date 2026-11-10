import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { CARD_ASPECT_RATIO } from '@/capture/guide-frame';
import { FONTS } from '@/constants/brand';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import type { DocumentListItem } from '@/db/types';
import { resolveDocumentFile } from '@/storage/document-files';

type Props = {
  card: Pick<DocumentListItem, 'title' | 'firstImagePath' | 'cardColor' | 'personName'>;
  width: number;
  showPerson?: boolean; // person name in a small label in the bottom-left corner
  large?: boolean; // bigger title for the detail screen
};

// A card drawn with the proportions of a real one (85.6 × 54 mm): the photo of its front,
// or its color with the name in white when there is no photo
export function CardFace({ card, width, showPerson = false, large = false }: Props) {
  const height = Math.round(width / CARD_ASPECT_RATIO);

  return (
    <View style={[styles.card, { width, height, backgroundColor: card.cardColor ?? DEFAULT_CARD_COLOR }]}>
      {card.firstImagePath ? (
        <Image
          source={{ uri: resolveDocumentFile(card.firstImagePath).uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={120}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text
          style={[styles.title, large && styles.titleLarge]}
          numberOfLines={large ? 3 : 2}
          maxFontSizeMultiplier={1.4} // the card has a fixed shape: text grows a little, then stops
        >
          {card.title}
        </Text>
      )}
      {showPerson && card.personName && (
        <View style={styles.person}>
          <Text style={styles.personText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {card.personName}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderCurve: 'continuous',
    overflow: 'hidden',
    padding: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: FONTS.titleSemiBold,
  },
  titleLarge: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: FONTS.titleBold,
  },
  person: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    maxWidth: '80%',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.55)', // readable over any photo
  },
  personText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 600,
  },
});
