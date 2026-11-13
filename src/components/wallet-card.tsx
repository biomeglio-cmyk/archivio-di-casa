import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import { FONTS } from '@/constants/typography';
import type { DocumentListItem } from '@/db/types';
import { resolveDocumentFile } from '@/storage/document-files';
import { isLightColor, mixWithWhite } from '@/utils/colors';

export const WALLET_CARD_HEIGHT = 214; // open card in Tessere
export const WALLET_CARD_PEEK = 86; // closed card: only its top shows

type Face = Pick<DocumentListItem, 'title' | 'firstImagePath' | 'cardColor' | 'coverMode' | 'docType' | 'barcodeValue'> & {
  holder?: string | null; // "Intestata a": the person
};

type Props = {
  card: Face;
  height?: number; // 214 in Tessere; smaller in Nuova tessera and Riordina
  scale?: number; // text size, 1 = Tessere
  usePhoto?: boolean; // false: always the color face (preview of "Colore")
};

// "0400221988 76" → "0400 2219 8876": digits in groups of four, like on the card
export function spacedNumber(value: string | null): string {
  if (!value) return '';
  const clean = value.replace(/\s+/g, '');
  return /^\d+$/.test(clean) ? (clean.match(/.{1,4}/g) ?? []).join(' ') : value;
}

// A card of the wallet (docs/design/Tessere.dc.html): its photo as the cover, edge to edge; or its
// color with two soft circles, the name 20/800, the Tipo on the right, the number at the bottom
// and the holder in capitals
export function WalletCardFace({ card, height = WALLET_CARD_HEIGHT, scale = 1, usePhoto = true }: Props) {
  if (usePhoto && card.firstImagePath && card.coverMode !== 'color') {
    return (
      <View style={[styles.face, { height }]}>
        <Image
          source={{ uri: resolveDocumentFile(card.firstImagePath).uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={120}
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }
  const color = card.cardColor ?? DEFAULT_CARD_COLOR;
  const size = (value: number) => Math.round(value * scale);
  const ink = isLightColor(color) ? { color: '#1C1E2E' } : null; // a pale "Il tuo colore": dark text
  return (
    <LinearGradient
      colors={[mixWithWhite(color, 0.18), color]}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={[styles.face, styles.colored, { height, padding: size(18) }]}>
      <View style={[styles.circle, styles.circleTop, circle(size(180)), { right: -size(40), top: -size(60) }]} />
      <View style={[styles.circle, styles.circleBottom, circle(size(140)), { right: size(40), bottom: -size(70) }]} />
      <View style={styles.top}>
        <Text style={[styles.brand, ink, { fontSize: size(20) }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {card.title || 'Nuova tessera'}
        </Text>
        {card.docType ? (
          <Text style={[styles.type, ink, { fontSize: size(12) }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {card.docType}
          </Text>
        ) : null}
      </View>
      <View style={styles.bottom}>
        {card.barcodeValue ? (
          <Text style={[styles.number, ink, { fontSize: size(14) }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {spacedNumber(card.barcodeValue)}
          </Text>
        ) : null}
        {card.holder ? (
          <Text style={[styles.holder, ink, { fontSize: size(12) }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {card.holder.toUpperCase()}
          </Text>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const circle = (diameter: number) => ({ width: diameter, height: diameter, borderRadius: diameter / 2 });

const styles = StyleSheet.create({
  face: {
    width: '100%',
    overflow: 'hidden',
  },
  colored: {
    justifyContent: 'space-between',
  },
  circle: {
    position: 'absolute',
  },
  circleTop: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  circleBottom: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  brand: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    letterSpacing: 0.4,
  },
  type: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: FONTS.semiBold,
  },
  bottom: {
    gap: 2,
  },
  number: {
    color: '#FFFFFF',
    fontFamily: FONTS.semiBold,
    letterSpacing: 2,
  },
  holder: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: FONTS.medium,
  },
});
