import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BRAND_COLOR, FONTS } from '@/constants/brand';
import { DeadlineChip } from '@/components/deadline-chip';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import type { DocumentListItem } from '@/db/types';
import { usePressed } from '@/hooks/use-pressed';
import type { TileSize } from '@/hooks/use-tile-size';
import { resolveDocumentFile } from '@/storage/document-files';

const UNSELECTED_TINT = '#8E8E93';

type FaceProps = {
  document: DocumentListItem; // includes its category and its first photo
  selected?: boolean; // "Seleziona": tick circle in the top-right corner
};

// THE document tile of every grid (Preferiti, a category, a person), same size as the archive
// tiles. Its "Copertina":
// - Foto: pastel gradient of its category, the photo thumbnail on top, the title;
// - Colore: no photo; the category gradient (or the color picked by the user, with white text)
//   and the category icon, the title.
// The deadline is a bell chip at the bottom, only when the document has one.
// The look only: it fills its cell; DocumentTile below (or the sortable grid) handles the tap.
export function DocumentTileFace({ document, selected }: FaceProps) {
  const { category } = document;
  const showPhoto = document.firstImagePath !== null && document.coverMode !== 'color';
  // Colore: a picked color (cards always have one), else the category gradient
  const solid = showPhoto
    ? null
    : (document.coverColor ?? (category.isCards ? (document.cardColor ?? DEFAULT_CARD_COLOR) : null));
  const textColor = solid ? '#FFFFFF' : category.colors.text;

  const content: ReactNode = (
    <>
      {showPhoto && document.firstImagePath ? (
        <Image
          source={{ uri: resolveDocumentFile(document.firstImagePath).uri }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <View style={styles.iconArea}>
          <SymbolView name={category.symbol} tintColor={textColor} size={28} />
        </View>
      )}

      <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
        {document.title}
      </Text>
      {/* The deadline as a bell chip, only when there is one */}
      <View style={styles.expiry}>
        <DeadlineChip expiresAt={document.expiresAt} neutralColor={textColor} />
      </View>

      {selected !== undefined && (
        <View style={styles.check}>
          <SymbolView
            name={selected ? 'checkmark.circle.fill' : 'circle'}
            tintColor={selected ? BRAND_COLOR : UNSELECTED_TINT} // grey on the white chip, on any palette
            size={24}
          />
        </View>
      )}
    </>
  );

  return solid ? (
    <View style={[styles.tile, { backgroundColor: solid }]}>{content}</View>
  ) : (
    <LinearGradient colors={[category.colors.top, category.colors.bottom]} style={styles.tile}>
      {content}
    </LinearGradient>
  );
}

type Props = {
  document: DocumentListItem;
  size: TileSize; // width from the grid, minimum height (taller with large text)
  href: Href; // each tab has its own copy of the document screen
  // "Seleziona" mode: tapping toggles instead of opening
  selection?: { selected: boolean; disabled: boolean; onToggle: () => void };
};

// DocumentTileFace in a TileGrid (category, person): tap opens the document, or toggles it
// while selecting
export function DocumentTile({ document, size, href, selection }: Props) {
  const { pressed, handlers } = usePressed();

  return (
    <Pressable
      {...handlers}
      onPress={() => (selection ? selection.onToggle() : router.push(href))}
      disabled={selection?.disabled}
      accessibilityRole={selection ? 'checkbox' : 'button'}
      accessibilityState={selection ? { checked: selection.selected, disabled: selection.disabled } : undefined}
      accessibilityLabel={document.title}
      style={[size, pressed && styles.pressed, selection?.disabled && styles.disabled]}>
      <DocumentTileFace document={document} selected={selection?.selected} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4, // documents without photos can't go into a combined PDF
  },
  tile: {
    flex: 1, // fills the (possibly stretched) tile
    padding: 10,
    gap: 4,
    borderRadius: 20,
    borderCurve: 'continuous',
  },
  thumbnail: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  iconArea: {
    height: 48,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    lineHeight: 17,
    fontFamily: FONTS.titleSemiBold,
  },
  expiry: {
    marginTop: 'auto', // always at the bottom of the tile
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // readable over the photo or a color
  },
});
