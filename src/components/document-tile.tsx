import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { FavoriteTileFace } from '@/components/home-sections';
import { BRAND_COLOR } from '@/constants/brand';
import type { DocumentListItem } from '@/db/types';
import { usePressed } from '@/hooks/use-pressed';
import type { TileSize } from '@/hooks/use-tile-size';
import { t } from '@/i18n';
import { daysUntil } from '@/utils/deadlines';
import { type Palette } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const UNSELECTED_TINT = '#8E8E93';

// What VoiceOver says for a tile, in reading order: "Bolletta luce, Scade tra 3 giorni, Da pagare"
// (the status is only drawn, or not drawn at all, on the tile)
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

// THE document tile of every grid (Home favorites, Preferiti, a category, a person): the shared
// favorite tile of the design (FavoriteTileFace: 196 high, padding 16, radius 22, icon 28 or the
// cover photo, name 17/600, "Scade …" or the category 13/400, the colors of the active palette).
// Here with the tick of "Seleziona" on top when selecting. The look only: it fills its cell;
// DocumentTile below (or the sortable grid) handles the tap.
export function DocumentTileFace({ document, selected }: FaceProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.face}>
      <FavoriteTileFace document={document} style={styles.fill} />
      {selected !== undefined && (
        <View style={styles.check}>
          <SymbolView
            name={selected ? 'checkmark.circle.fill' : 'circle'}
            tintColor={selected ? BRAND_COLOR(theme) : UNSELECTED_TINT} // grey on the white chip, on any palette
            size={24}
          />
        </View>
      )}
    </View>
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
  face: {
    flexGrow: 1, // fills the (possibly stretched) cell
  },
  fill: {
    flexGrow: 1,
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // readable over the photo or a color
  },
});
