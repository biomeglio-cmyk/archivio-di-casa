import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type Animated from 'react-native-reanimated';
import type { AnimatedRef } from 'react-native-reanimated';
import Sortable, { type SortableGridDragEndParams } from 'react-native-sortables';

import { BRAND_COLOR, FONTS, PIN_COLOR } from '@/constants/brand';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import { listPinnedDocuments, savePinnedOrder } from '@/db/documents';
import type { DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { TILE_COLUMNS, TILE_GAP, useTileSize } from '@/hooks/use-tile-size';
import { resolveDocumentFile } from '@/storage/document-files';

const COLLAPSED_COUNT = 6; // 3 rows of 2; the rest behind "Mostra tutti"

// Small grey uppercase title of a section of Home ("PREFERITI", "CATEGORIE"),
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

const DRAG_DELAY_MS = 400; // long press before a tile lifts, like the iOS Home Screen

// "PREFERITI" on Home, between the search bar and the categories: the pinned cards and
// documents in the same 2-column grid as the categories (same tile size and gaps as TileGrid).
// Long press (~400 ms) → light vibration, the tile lifts and follows the finger, the others make
// room; on release the new order is saved. A tap opens the item; scrolling works as usual.
// Collapsed (max 6) the drag reorders the visible tiles; "Mostra tutti" reorders all of them.
// `scrollableRef`: the page scrolls by itself when a tile is dragged near its edge.
export function FavoritesSection({ scrollableRef }: { scrollableRef?: AnimatedRef<Animated.ScrollView> }) {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { data: pinned } = useDbQuery(listPinnedDocuments, []);
  const [expanded, setExpanded] = useState(false);

  if (!pinned) return null; // loading: a few milliseconds

  const visible = expanded ? pinned : pinned.slice(0, COLLAPSED_COUNT);

  // Saves the visible tiles in their new order, followed by the hidden ones (unchanged)
  async function saveOrder(visibleIds: number[]) {
    const hidden = pinned!.slice(visible.length).map((d) => d.id);
    const next = [...visibleIds, ...hidden];
    if (next.every((id, index) => id === pinned![index].id)) return; // dropped where it was
    try {
      await savePinnedOrder(db, next);
    } catch (error) {
      Alert.alert('Impossibile salvare l’ordine', error instanceof Error ? error.message : String(error));
    }
  }

  // VoiceOver: "Sposta prima" / "Sposta dopo" instead of dragging
  function moveBy(id: number, delta: number) {
    const ids = visible.map((d) => d.id);
    const from = ids.indexOf(id);
    const to = from + delta;
    if (to < 0 || to >= ids.length) return;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    saveOrder(ids);
  }

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
        <Sortable.Grid
          data={visible}
          keyExtractor={(document) => String(document.id)}
          columns={TILE_COLUMNS}
          rowGap={TILE_GAP}
          columnGap={TILE_GAP}
          dragActivationDelay={DRAG_DELAY_MS}
          activeItemScale={1.05}
          activeItemShadowOpacity={0.25}
          inactiveItemOpacity={1}
          scrollableRef={scrollableRef}
          autoScrollEnabled={scrollableRef !== undefined}
          onDragStart={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          onDragEnd={({ data }: SortableGridDragEndParams<DocumentListItem>) => saveOrder(data.map((d) => d.id))}
          renderItem={({ item }) => <FavoriteTile document={item} onMove={(delta) => moveBy(item.id, delta)} />}
        />
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
function FavoriteTile({ document, onMove }: { document: DocumentListItem; onMove: (delta: number) => void }) {
  const { minHeight } = useTileSize(); // the width comes from the grid column (same as TileGrid)
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

  // Sortable.Touchable: a tap opens the item, while the long press is left to the drag
  return (
    <Sortable.Touchable
      onTap={() => router.push({ pathname: '/(tabs)/(archive)/document/[id]', params: { id: String(document.id) } })}
      style={{ minHeight }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={document.title}
      accessibilityHint="Tieni premuto e trascina per spostarlo"
      accessibilityActions={[
        { name: 'activate' },
        { name: 'earlier', label: 'Sposta prima' },
        { name: 'later', label: 'Sposta dopo' },
      ]}
      onAccessibilityAction={(event) => {
        const action = event.nativeEvent.actionName;
        if (action === 'earlier') onMove(-1);
        else if (action === 'later') onMove(1);
        else router.push({ pathname: '/(tabs)/(archive)/document/[id]', params: { id: String(document.id) } });
      }}>
      {content}
    </Sortable.Touchable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
    marginBottom: 8, // a little more room before "CATEGORIE"
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
