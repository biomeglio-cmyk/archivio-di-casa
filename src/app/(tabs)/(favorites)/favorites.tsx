import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { accessibilityActionsOf, documentQuickActions, runAccessibilityAction } from '@/actions/quick-actions';
import { DocumentTile, DocumentTileFace } from '@/components/document-tile';
import { DocumentThumb } from '@/components/document-thumb';
import { IconSquare } from '@/components/icon-square';
import { PasswordPreviewTile } from '@/components/password-preview';
import { goHome, PageHeader } from '@/components/page-header';
import { RoundIconButton } from '@/components/round-icon-button';
import { SearchBar } from '@/components/search-bar';
import { Segmented } from '@/components/segmented';
import { SortableTileGrid } from '@/components/sortable-tile-grid';
import { REORDER_FOOTER, ReorderHeader, ReorderRow, SortableList } from '@/components/sortable-list';
import { Text } from '@/components/text';
import { TileGrid } from '@/components/tile-grid';
import { CardSurface, Colors, Spacing, themedStyles, onTheme } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { listPinnedDocuments, savePinnedOrder, setPinned } from '@/db/documents';
import type { DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { usePressed } from '@/hooks/use-pressed';
import { findMatch, normalizeText } from '@/search/text-match';
import { getFavoritesView, saveFavoritesView, type FolderView } from '@/settings/folder-view';
import { describeDistance } from '@/utils/dates';
import { daysUntil } from '@/utils/deadlines';

let HEART = '';
onTheme(() => {
  HEART = Colors.current.heart;
});

const documentHref = (id: number) =>
  ({ pathname: '/(tabs)/(favorites)/document/[id]', params: { id: String(id) } }) as const;

// "Preferiti" (docs/design/Preferiti.dc.html): back and search, title and subtitle, "N PREFERITI",
// one white row per item (category square, name, "Bollette · scade tra 3 giorni", a pink heart
// that takes it away), and the hint; "Non hai ancora preferiti."
// when empty. Long press on a row: "Riordina" (docs/design/RiordinaLista.dc.html), drag to reorder.
// Our extra, as in the folders: Elenco / Griglia (remembered). Griglia = the tiles with their covers,
// long press to drag (or for the quick menu); both views share the same order.
export default function FavoritesScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const { data: pinned } = useDbQuery(listPinnedDocuments, []);
  const [reordering, setReordering] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<FolderView>(getFavoritesView);

  function changeView(next: FolderView) {
    setView(next);
    saveFavoritesView(next);
  }

  const items = pinned ?? [];
  const needle = normalizeText(query.trim());
  const shown =
    searchOpen && needle
      ? items.filter((d) => findMatch(d.title, needle) || findMatch(d.category.name, needle) || findMatch(d.docType, needle))
      : items;

  async function saveOrder(ordered: DocumentListItem[]) {
    try {
      await savePinnedOrder(db, ordered.map((d) => d.id));
    } catch (error) {
      Alert.alert('Impossibile salvare l’ordine', error instanceof Error ? error.message : String(error));
    }
  }

  function startReorder() {
    if (items.length < 2) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSearchOpen(false);
    setQuery('');
    setReordering(true);
  }

  return (
    <GestureHandlerRootView style={styles.screen}>
      <Animated.ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: Spacing.belowContent }]}>
        {reordering ? (
          <>
            <ReorderHeader
              title="Riordina i preferiti"
              hint="Tieni premuto un preferito e trascinalo dove vuoi."
              onDone={() => setReordering(false)}
            />
            <Text style={styles.section}>I tuoi preferiti</Text>
            <View style={styles.list}>
              <SortableList
                items={items}
                keyFor={(document) => document.id}
                labelFor={(document) => document.title}
                renderRow={(document) => (
                  <ReorderRow
                    thumb={<DocumentThumb document={document} />}
                    title={document.title}
                    subtitle={favoriteSubtitle(document)}
                  />
                )}
                onReorder={saveOrder}
                scrollableRef={scrollRef}
              />
            </View>
            <Text style={styles.footer}>{REORDER_FOOTER}</Text>
          </>
        ) : (
          <>
            <PageHeader
              title="Preferiti"
              subtitle="Quello che hai scelto di tenere a portata di mano"
              onBack={goHome}
              right={
                <RoundIconButton
                  symbol="magnifyingglass"
                  accessibilityLabel="Cerca nei preferiti"
                  color={Colors.current.text}
                  onPress={() => {
                    setSearchOpen((open) => !open);
                    setQuery('');
                  }}
                />
              }
            />
            {searchOpen && (
              <View style={styles.search}>
                <SearchBar value={query} onChangeText={setQuery} placeholder="Cerca nei preferiti" />
              </View>
            )}

            {items.length > 0 && (
              <View style={styles.viewSwitch}>
                <Segmented
                  values={['Elenco', 'Griglia']}
                  selectedIndex={view === 'list' ? 0 : 1}
                  onChange={(index) => changeView(index === 0 ? 'list' : 'grid')}
                />
              </View>
            )}

            <Text style={styles.section}>{pinned ? `${items.length} preferiti` : ' '}</Text>
            {view === 'grid' && items.length > 0 ? (
              <View style={styles.grid}>
                {shown.length < items.length ? (
                  // Searching: fixed tiles (the order is set on all the favorites)
                  <TileGrid
                    items={shown}
                    keyFor={(document) => document.id}
                    renderTile={(document, size) => (
                      <DocumentTile document={document} size={size} href={documentHref(document.id)} />
                    )}
                  />
                ) : (
                  <SortableTileGrid
                    items={items}
                    keyFor={(document) => document.id}
                    labelFor={(document) => document.title}
                    renderTile={(document) => <DocumentTileFace document={document} />}
                    actionsFor={(document) => documentQuickActions(db, document, documentHref(document.id))}
                    onOpen={(document) => router.push(documentHref(document.id))}
                    onReorder={saveOrder}
                    scrollableRef={scrollRef}
                  />
                )}
                {shown.length === 0 && <Text style={styles.empty}>Nessun preferito con “{query.trim()}”.</Text>}
              </View>
            ) : (
              <View style={styles.list}>
                {shown.map((document) => (
                  <FavoriteRow
                    key={document.id}
                    document={document}
                    onOpen={() => router.push(documentHref(document.id))}
                    onRemove={() => void setPinned(db, document.id, false)}
                    onLongPress={startReorder}
                  />
                ))}
                {pinned && items.length === 0 && <Text style={styles.empty}>Non hai ancora preferiti.</Text>}
                {items.length > 0 && shown.length === 0 && (
                  <Text style={styles.empty}>Nessun preferito con “{query.trim()}”.</Text>
                )}
              </View>
            )}

            <Text style={styles.footer}>
              {items.length > 1
                ? `Tocca il cuore su qualsiasi documento per aggiungerlo qui. Tieni premuto ${view === 'grid' ? 'un riquadro e trascinalo' : 'una riga'} per riordinarli.`
                : 'Tocca il cuore su qualsiasi documento per aggiungerlo qui.'}
            </Text>
          </>
        )}
      </Animated.ScrollView>
    </GestureHandlerRootView>
  );
}

type RowProps = {
  document: DocumentListItem;
  onOpen: () => void;
  onRemove: () => void;
  onLongPress: () => void;
};

function FavoriteRow({ document, onOpen, onRemove, onLongPress }: RowProps) {
  const db = useSQLiteContext();
  const { pressed, handlers } = usePressed();
  const subtitle = favoriteSubtitle(document);
  // VoiceOver: the same actions as the long-press menu of the tiles
  const actions = documentQuickActions(db, document, documentHref(document.id)).filter((a) => a.key !== 'pin');

  return (
    <View style={styles.row}>
      <Pressable
        {...handlers}
        onPress={onOpen}
        onLongPress={onLongPress}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={`${document.title}, ${subtitle}`}
        accessibilityHint="Tieni premuto per riordinare i preferiti"
        accessibilityActions={accessibilityActionsOf(actions)}
        onAccessibilityAction={(event) => runAccessibilityAction(actions, event.nativeEvent.actionName)}
        style={[styles.rowMain, pressed && styles.rowPressed]}>
        {document.password ? (
          <PasswordPreviewTile info={document.password} size={52} />
        ) : (
          <IconSquare symbol={document.category.symbol} colors={document.category.colors} size={52} radius={16} shadow />
        )}
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={1}>
            {document.title}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel="Togli dai preferiti"
        accessibilityState={{ selected: true }}
        hitSlop={4}
        style={({ pressed }) => [styles.heart, pressed && styles.rowPressed]}>
        <SymbolView name="heart.fill" tintColor={HEART} size={24} />
      </Pressable>
    </View>
  );
}

// "Bollette · scade tra 3 giorni": the folder and the deadline, else the Tipo or the person
function favoriteSubtitle(document: DocumentListItem): string {
  let detail: string | null = null;
  if (document.expiresAt) {
    const days = daysUntil(document.expiresAt);
    detail = days < 0 ? describeDistance(days) : `scade ${describeDistance(days)}`;
  } else {
    detail = document.docType ?? document.personName;
  }
  return [document.category.name, detail].filter(Boolean).join(' · ');
}

const styles = themedStyles(() =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.current.background,
  },
  page: {
    paddingHorizontal: Spacing.side,
  },
  search: {
    marginTop: 16,
  },
  viewSwitch: {
    marginTop: 18,
  },
  grid: {
    marginTop: 12,
    gap: 10,
  },
  section: {
    marginTop: 26,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: Colors.current.textSecondary,
  },
  list: {
    marginTop: 12,
    gap: 10,
  },
  row: {
    ...CardSurface,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 8,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowPressed: {
    opacity: 0.6,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
  },
  sub: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
  },
  heart: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    marginTop: 8,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: Colors.current.paleLilac,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
    textAlign: 'center',
  },
  footer: {
    marginTop: 16,
    marginHorizontal: 4,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
    textAlign: 'center',
  },
}));
