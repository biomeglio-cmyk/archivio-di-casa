import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BRAND_COLOR, FONTS, PIN_COLOR } from '@/constants/brand';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import { listPinnedDocuments } from '@/db/documents';
import type { DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { usePressed } from '@/hooks/use-pressed';
import { useTheme } from '@/hooks/use-theme';
import { TILE_COLUMNS, tileGridStyles, useTileSize, type TileSize } from '@/hooks/use-tile-size';
import { resolveDocumentFile } from '@/storage/document-files';

const COLLAPSED_COUNT = 6; // 3 rows of 2; the rest behind "Mostra tutti"

// Small grey uppercase title of a section of Archivio ("PREFERITI", "CATEGORIE"),
// with an optional link on the right
export function SectionHeader({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: theme.textSecondary }]} accessibilityRole="header">
        {title}
      </Text>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={10} accessibilityRole="button">
          <Text style={styles.headerAction}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

// "PREFERITI" on Archivio, between the search bar and the categories: the pinned cards and
// documents in the same two-column grid as the categories, in the order chosen with "Modifica"
export function FavoritesSection() {
  const theme = useTheme();
  const size = useTileSize();
  const { data: pinned } = useDbQuery(listPinnedDocuments, []);
  const [expanded, setExpanded] = useState(false);

  if (!pinned) return null; // loading: a few milliseconds

  const visible = expanded ? pinned : pinned.slice(0, COLLAPSED_COUNT);
  // Rows of two, so both tiles of a row get the height of the taller one (like the FlatList grid)
  const rows: DocumentListItem[][] = [];
  for (let i = 0; i < visible.length; i += TILE_COLUMNS) rows.push(visible.slice(i, i + TILE_COLUMNS));

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Preferiti"
        action={pinned.length > 0 ? { label: 'Modifica', onPress: () => router.push('/pinned-edit') } : undefined}
      />

      {pinned.length === 0 ? (
        <View style={[styles.empty, { borderColor: theme.textSecondary }]}>
          <SymbolView name="heart" tintColor={PIN_COLOR} size={20} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Tocca il cuore su una carta o un documento per tenerlo qui
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {rows.map((row) => (
            <View key={row[0].id} style={tileGridStyles.row}>
              {row.map((document) => (
                <FavoriteTile key={document.id} document={document} size={size} />
              ))}
            </View>
          ))}
        </View>
      )}

      {pinned.length > COLLAPSED_COUNT && (
        <Pressable onPress={() => setExpanded((e) => !e)} hitSlop={8} accessibilityRole="button" style={styles.more}>
          <Text style={styles.moreText}>{expanded ? 'Mostra meno' : `Mostra tutti (${pinned.length})`}</Text>
        </Pressable>
      )}
    </View>
  );
}

// One favorite, as big as a category tile: its photo filling the tile with the title on a dark
// bar, or (without photo) the category gradient with icon and title, like the category tiles
function FavoriteTile({ document, size }: { document: DocumentListItem; size: TileSize }) {
  const { pressed, handlers } = usePressed();
  const { category } = document;

  let content;
  if (document.firstImagePath) {
    content = (
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
  } else if (category.isCards) {
    // A card without photo keeps its own color, as in "Tessere e card"
    content = (
      <View style={[styles.tile, styles.padded, { backgroundColor: document.cardColor ?? DEFAULT_CARD_COLOR }]}>
        <SymbolView name={category.symbol} tintColor="#FFFFFF" size={28} />
        <Text style={[styles.title, { color: '#FFFFFF' }]} numberOfLines={3}>
          {document.title}
        </Text>
      </View>
    );
  } else {
    content = (
      <LinearGradient colors={[category.colors.top, category.colors.bottom]} style={[styles.tile, styles.padded]}>
        <SymbolView name={category.symbol} tintColor={category.colors.text} size={28} />
        <Text style={[styles.title, { color: category.colors.text }]} numberOfLines={3}>
          {document.title}
        </Text>
      </LinearGradient>
    );
  }

  return (
    <Pressable
      {...handlers}
      onPress={() => router.push({ pathname: '/(tabs)/(archive)/document/[id]', params: { id: String(document.id) } })}
      accessibilityRole="button"
      accessibilityLabel={document.title}
      style={[size, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
    marginBottom: 20, // room before "CATEGORIE"
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 13,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  headerAction: {
    color: BRAND_COLOR,
    fontSize: 17,
  },
  grid: {
    gap: 12, // same vertical gap as the category grid
  },
  pressed: {
    opacity: 0.8,
  },
  tile: {
    flex: 1, // fills the (possibly stretched) tile
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
  more: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  moreText: {
    color: BRAND_COLOR,
    fontSize: 17,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  emptyText: {
    flex: 1,
    fontSize: 15,
  },
});
