import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BRAND_COLOR, DANGER_COLOR, FONTS } from '@/constants/brand';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import type { DocumentListItem } from '@/db/types';
import { usePressed } from '@/hooks/use-pressed';
import type { TileSize } from '@/hooks/use-tile-size';
import { resolveDocumentFile } from '@/storage/document-files';
import { describeDistance, formatShortDate } from '@/utils/dates';
import { daysUntil } from '@/utils/deadlines';

const EXPIRED_ON_DARK = '#FF9A9A'; // the danger red is too dark on the photo bar or a dark color

type CoverProps = {
  document: DocumentListItem;
  showPerson?: boolean; // "Tessere e card": whose card it is
  selection?: { selected: boolean }; // "Seleziona": tick circle in the top-right corner
};

// THE document tile of every grid (Preferiti, a category, a person, Tessere e card), drawn from
// the document's "Copertina":
// - Foto: its front photo full-bleed, the title (and deadline) on a dark bar at the bottom;
// - Colore: the category gradient with icon and title, or a color picked by the user (white text).
// The deadline line appears only when the document has one. The look only: it fills its cell;
// DocumentTile below (or the sortable grid) handles the tap.
export function DocumentCoverTile({ document, showPerson = false, selection }: CoverProps) {
  const { category } = document;
  // Foto when chosen (or automatic) and there is a photo; otherwise Colore
  const showPhoto = document.firstImagePath !== null && document.coverMode !== 'color';
  // A chosen color (cards always have one), else the category gradient
  const solid = document.coverColor ?? (category.isCards ? (document.cardColor ?? DEFAULT_CARD_COLOR) : null);
  const days = document.expiresAt ? daysUntil(document.expiresAt) : null;
  const deadline =
    document.expiresAt && days !== null
      ? { text: `${formatShortDate(document.expiresAt)} · ${describeDistance(days)}`, expired: days < 0 }
      : null;
  const person = showPerson ? document.personName : null;

  let tile: ReactNode;
  if (showPhoto && document.firstImagePath) {
    tile = (
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
          <Lines person={person} deadline={deadline} color="#FFFFFF" expiredColor={EXPIRED_ON_DARK} />
        </View>
      </View>
    );
  } else if (solid) {
    tile = (
      <View style={[styles.tile, styles.padded, { backgroundColor: solid }]}>
        <SymbolView name={category.symbol} tintColor="#FFFFFF" size={28} />
        <Text style={[styles.title, { color: '#FFFFFF' }]} numberOfLines={3}>
          {document.title}
        </Text>
        <Lines person={person} deadline={deadline} color="#FFFFFF" expiredColor={EXPIRED_ON_DARK} />
      </View>
    );
  } else {
    tile = (
      <LinearGradient colors={[category.colors.top, category.colors.bottom]} style={[styles.tile, styles.padded]}>
        <SymbolView name={category.symbol} tintColor={category.colors.text} size={28} />
        <Text style={[styles.title, { color: category.colors.text }]} numberOfLines={3}>
          {document.title}
        </Text>
        <Lines person={person} deadline={deadline} color={category.colors.text} expiredColor={DANGER_COLOR} />
      </LinearGradient>
    );
  }

  return (
    <View style={styles.cell}>
      {tile}
      {selection && (
        <View style={styles.check}>
          <SymbolView
            name={selection.selected ? 'checkmark.circle.fill' : 'circle'}
            tintColor={selection.selected ? BRAND_COLOR : '#8E8E93'}
            size={24}
          />
        </View>
      )}
    </View>
  );
}

// Under the title: the person (cards) and the deadline, only when there is one
function Lines({
  person,
  deadline,
  color,
  expiredColor,
}: {
  person: string | null;
  deadline: { text: string; expired: boolean } | null;
  color: string;
  expiredColor: string;
}) {
  if (!person && !deadline) return null;
  return (
    <>
      {person && (
        <Text style={[styles.line, { color }]} numberOfLines={1}>
          {person}
        </Text>
      )}
      {deadline && (
        <Text style={[styles.line, { color: deadline.expired ? expiredColor : color }]} numberOfLines={2}>
          {deadline.text}
        </Text>
      )}
    </>
  );
}

type TileProps = {
  document: DocumentListItem;
  size: TileSize; // from TileGrid: same width and minimum height as every tile
  href: Href; // each tab has its own copy of the document screen
  showPerson?: boolean;
  // "Seleziona" mode: tapping toggles instead of opening
  selection?: { selected: boolean; disabled: boolean; onToggle: () => void };
};

// DocumentCoverTile in a TileGrid (category, person, Tessere e card): tap opens the document,
// or toggles it while selecting
export function DocumentTile({ document, size, href, showPerson, selection }: TileProps) {
  const { pressed, handlers } = usePressed();
  const label = [document.title, showPerson ? document.personName : null].filter(Boolean).join(', ');

  return (
    <Pressable
      {...handlers}
      onPress={() => (selection ? selection.onToggle() : router.push(href))}
      disabled={selection?.disabled}
      accessibilityRole={selection ? 'checkbox' : 'button'}
      accessibilityState={selection ? { checked: selection.selected, disabled: selection.disabled } : undefined}
      accessibilityLabel={label}
      style={[size, pressed && styles.pressed, selection?.disabled && styles.disabled]}>
      <DocumentCoverTile
        document={document}
        showPerson={showPerson}
        selection={selection ? { selected: selection.selected } : undefined}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1, // fills the grid cell
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4, // documents without photos can't go into a combined PDF
  },
  tile: {
    flex: 1,
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
    gap: 2,
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
    marginTop: 'auto', // title (and its lines) at the bottom, as in the category tiles
  },
  line: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 500,
    opacity: 0.9,
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // readable over photo or color
  },
});
