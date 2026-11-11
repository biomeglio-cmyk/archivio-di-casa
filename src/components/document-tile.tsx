import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BRAND_COLOR, DANGER_COLOR, FONTS } from '@/constants/brand';
import type { DocumentListItem } from '@/db/types';
import { usePressed } from '@/hooks/use-pressed';
import type { TileSize } from '@/hooks/use-tile-size';
import { resolveDocumentFile } from '@/storage/document-files';
import { describeDistance, formatShortDate } from '@/utils/dates';
import { daysUntil } from '@/utils/deadlines';

type Props = {
  document: DocumentListItem; // includes its category and its first photo
  size: TileSize; // width from the grid, minimum height (taller with large text)
  href: Href; // each tab has its own copy of the document screen
  // "Seleziona" mode: tick circle in the top-right corner; tapping toggles instead of opening
  selection?: { selected: boolean; disabled: boolean; onToggle: () => void };
};

// Document tile, same size as the archive tiles: pastel gradient of its category, the photo
// thumbnail (or the category icon), the title on up to 2 lines and the expiry.
export function DocumentTile({ document, size, href, selection }: Props) {
  const { category } = document;
  const { colors } = category;
  const { pressed, handlers } = usePressed();
  const days = document.expiresAt ? daysUntil(document.expiresAt) : null;
  const expired = days !== null && days < 0;

  return (
    <Pressable
      {...handlers}
      onPress={() => (selection ? selection.onToggle() : router.push(href))}
      disabled={selection?.disabled}
      accessibilityRole={selection ? 'checkbox' : 'button'}
      accessibilityState={selection ? { checked: selection.selected, disabled: selection.disabled } : undefined}
      accessibilityLabel={document.title}
      style={[size, pressed && styles.pressed, selection?.disabled && styles.disabled]}>
      <LinearGradient colors={[colors.top, colors.bottom]} style={styles.tile}>
        {document.firstImagePath ? (
          <Image
            source={{ uri: resolveDocumentFile(document.firstImagePath).uri }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={styles.iconArea}>
            <SymbolView name={category.symbol} tintColor={colors.text} size={28} />
          </View>
        )}

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {document.title}
        </Text>
        {/* Two short lines, "gio 12 nov" and "tra 2 giorni", so nothing gets cut with large text */}
        {/* Only a real deadline is shown; without one, nothing */}
        {document.expiresAt && days !== null && (
          <View style={styles.expiry}>
            <Text style={[styles.expiryText, { color: expired ? DANGER_COLOR : colors.text }]}>
              {formatShortDate(document.expiresAt)}
            </Text>
            <Text style={[styles.expiryText, { color: expired ? DANGER_COLOR : colors.text }]}>
              {describeDistance(days)}
            </Text>
          </View>
        )}

        {selection && (
          <View style={styles.check}>
            <SymbolView
              name={selection.selected ? 'checkmark.circle.fill' : 'circle'}
              tintColor={selection.selected ? BRAND_COLOR : colors.text}
              size={24}
            />
          </View>
        )}
      </LinearGradient>
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
  expiryText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 500,
    opacity: 0.85,
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // readable over the photo
  },
});
