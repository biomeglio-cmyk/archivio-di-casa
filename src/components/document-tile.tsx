import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TileTitle } from '@/components/tile-title';
import { BRAND_COLOR, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { previewGradient, previewSymbol } from '@/constants/password-options';
import { FONTS } from '@/constants/typography';
import { DeadlineChip } from '@/components/deadline-chip';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import type { DocumentListItem } from '@/db/types';
import { usePressed } from '@/hooks/use-pressed';
import type { TileSize } from '@/hooks/use-tile-size';
import { resolveDocumentFile } from '@/storage/document-files';
import { t } from '@/i18n';
import { daysUntil } from '@/utils/deadlines';
import { textOn, tileFrame } from '@/utils/colors';
import { type Palette } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const UNSELECTED_TINT = '#8E8E93';

// What VoiceOver says for a tile, in reading order: "Bolletta luce, Scade tra 3 giorni, Da pagare"
// (the deadline chip and the status are only drawn, or not drawn at all, on the tile)
export function documentTileLabel(document: DocumentListItem): string {
  const parts: string[] = [document.title];
  if (document.expiresAt) {
    const days = daysUntil(document.expiresAt);
    parts.push(
      days < 0 ? t('deadlineChip.overdue') : days === 0 ? t('deadlineChip.dueToday') : t('deadlineChip.dueIn', { count: days }),
    );
  }
  if (document.paymentStatus) parts.push(document.paymentStatus === 'due' ? t('statusBadge.due') : t('statusBadge.paid'));
  return parts.join(', ');
}

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
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { category } = document;
  // A Password entry: the tile is its "Anteprima" (its image, or its color with its icon)
  if (document.password) return <PasswordTileFace document={document} info={document.password} selected={selected} />;
  const showPhoto = document.firstImagePath !== null && document.coverMode !== 'color';
  // Colore: a picked color (cards always have one), else the category gradient
  const solid = showPhoto
    ? null
    : (document.coverColor ?? (category.isCards ? (document.cardColor ?? DEFAULT_CARD_COLOR) : null));
  // White on a picked color, dark on a very light one ("Il tuo colore" can be pale)
  const textColor = solid ? textOn(solid) : category.colors.text;

  const content: ReactNode = (
    <>
      {showPhoto && document.firstImagePath ? (
        <Image
          source={{ uri: resolveDocumentFile(document.firstImagePath).uri }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={120}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={styles.iconArea}>
          <SymbolView name={category.symbol} tintColor={textColor} size={28} accessibilityElementsHidden />
        </View>
      )}

      <TileTitle style={[styles.title, { color: textColor }]}>{document.title}</TileTitle>
      {/* The deadline as a bell chip, only when there is one */}
      <View style={styles.expiry}>
        <DeadlineChip expiresAt={document.expiresAt} neutralColor={textColor} />
      </View>

      {selected !== undefined && (
        <View style={styles.check}>
          <SymbolView
            name={selected ? 'checkmark.circle.fill' : 'circle'}
            tintColor={selected ? BRAND_COLOR(theme) : UNSELECTED_TINT} // grey on the white chip, on any palette
            size={24}
          />
        </View>
      )}
    </>
  );

  return solid ? (
    <View style={[styles.tile, { backgroundColor: solid }]}>{content}</View>
  ) : (
    <LinearGradient colors={[category.colors.top, category.colors.bottom]} style={[styles.tile, tileFrame(category.colors)]}>
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
  const styles = useThemedStyles(makeStyles);
  const { pressed, handlers } = usePressed();

  return (
    <Pressable
      {...handlers}
      onPress={() => (selection ? selection.onToggle() : router.push(href))}
      disabled={selection?.disabled}
      accessibilityRole={selection ? 'checkbox' : 'button'}
      accessibilityState={selection ? { checked: selection.selected, disabled: selection.disabled } : undefined}
      accessibilityLabel={documentTileLabel(document)}
      style={[size, pressed && styles.pressed, selection?.disabled && styles.disabled]}>
      <DocumentTileFace document={document} selected={selection?.selected} />
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
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
    fontFamily: FONTS.semiBold,
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

// The tile of a Password entry: its image full-bleed, or its preview color with its icon; the name
function PasswordTileFace({ document, info, selected }: FaceProps & { info: NonNullable<DocumentListItem['password']> }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [top, bottom] = previewGradient(info.preview); // already readable under white (WCAG AA)
  const image = info.preview.imagePath ? resolveDocumentFile(info.preview.imagePath).uri : null;
  const content = (
    <>
      {image ? (
        <Image source={{ uri: image }} style={styles.thumbnail} contentFit="cover" transition={120} accessibilityIgnoresInvertColors />
      ) : (
        <View style={styles.iconArea}>
          <SymbolView name={previewSymbol(info.preview, info.type)} tintColor="#FFFFFF" size={28} />
        </View>
      )}
      <TileTitle style={[styles.title, { color: '#FFFFFF' }]}>{document.title}</TileTitle>
      {selected !== undefined && (
        <View style={styles.check}>
          <SymbolView name={selected ? 'checkmark.circle.fill' : 'circle'} tintColor={selected ? BRAND_COLOR(theme) : UNSELECTED_TINT} size={24} />
        </View>
      )}
    </>
  );
  return (
    <LinearGradient colors={[top, bottom]} start={GRADIENT_START} end={GRADIENT_END} style={styles.tile}>
      {content}
    </LinearGradient>
  );
}
