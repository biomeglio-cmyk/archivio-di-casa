import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { announce } from '@/a11y/accessibility';
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
import { cardSurface, type Palette, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { listPinnedDocuments, savePinnedOrder, setPinned } from '@/db/documents';
import type { DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { usePressed } from '@/hooks/use-pressed';
import { t as translate, useI18n } from '@/i18n';
import { findMatch, normalizeText } from '@/search/text-match';
import { getFavoritesView, saveFavoritesView, type FolderView } from '@/settings/folder-view';
import { describeDistance } from '@/utils/dates';
import { daysUntil } from '@/utils/deadlines';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const HEART = (p: Palette) => p.heart;

const documentHref = (id: number) =>
  ({ pathname: '/(tabs)/(favorites)/document/[id]', params: { id: String(id) } }) as const;

// "Preferiti" (docs/design/Preferiti.dc.html): back and search, title and subtitle, "N PREFERITI",
// one white row per item (category square, name, "Bollette · scade tra 3 giorni", a pink heart
// that takes it away), and the hint; "Non hai ancora preferiti."
// when empty. Long press on a row: "Riordina" (docs/design/RiordinaLista.dc.html), drag to reorder.
// Our extra, as in the folders: Elenco / Griglia (remembered). Griglia = the tiles with their covers,
// long press to drag (or for the quick menu); both views share the same order.
export default function FavoritesScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
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
  const searching = searchOpen && needle.length > 0;

  // VoiceOver: how many favorites the search leaves, once the typing settles
  useEffect(() => {
    if (!searching) return;
    const timer = setTimeout(() => announce(t('favorites.count', { count: shown.length })), 600);
    return () => clearTimeout(timer);
  }, [searching, needle, shown.length, t]);

  async function saveOrder(ordered: DocumentListItem[]) {
    try {
      await savePinnedOrder(db, ordered.map((d) => d.id));
    } catch (error) {
      Alert.alert(t('favorites.alerts.orderNotSaved'), error instanceof Error ? error.message : String(error));
    }
  }

  function startReorder() {
    if (items.length < 2) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSearchOpen(false);
    setQuery('');
    setReordering(true);
    announce(t('a11y.browse.reorderOn'));
  }

  function endReorder() {
    setReordering(false);
    announce(t('a11y.browse.reorderOff'));
  }

  function unpin(document: DocumentListItem) {
    void setPinned(db, document.id, false).then(() => announce(t('a11y.favorites.removed', { title: document.title })));
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
              title={t('favorites.reorderTitle')}
              hint={t('favorites.reorderHint')}
              onDone={endReorder}
            />
            <Text style={styles.section} accessibilityRole="header">
              {t('favorites.yourFavorites')}
            </Text>
            <View style={styles.list}>
              <SortableList
                items={items}
                keyFor={(document) => document.id}
                labelFor={(document) => `${document.title}, ${favoriteSubtitle(document)}`}
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
              title={t('favorites.title')}
              subtitle={t('favorites.subtitle')}
              onBack={goHome}
              right={
                <RoundIconButton
                  symbol="magnifyingglass"
                  accessibilityLabel={t('favorites.searchPlaceholder')}
                  expanded={searchOpen}
                  color={theme.text}
                  onPress={() => {
                    setSearchOpen((open) => !open);
                    setQuery('');
                  }}
                />
              }
            />
            {searchOpen && (
              <View style={styles.search}>
                <SearchBar value={query} onChangeText={setQuery} placeholder={t('favorites.searchPlaceholder')} />
              </View>
            )}

            {items.length > 0 && (
              <View style={styles.viewSwitch}>
                <Segmented
                  accessibilityLabel={t('a11y.segmented.layout')}
                  values={[t('favorites.viewList'), t('favorites.viewGrid')]}
                  selectedIndex={view === 'list' ? 0 : 1}
                  onChange={(index) => changeView(index === 0 ? 'list' : 'grid')}
                />
              </View>
            )}

            <Text style={styles.section} accessibilityRole="header">
              {pinned ? t('favorites.count', { count: items.length }) : ' '}
            </Text>
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
                    labelFor={(document) => `${document.title}, ${favoriteSubtitle(document)}`}
                    renderTile={(document) => <DocumentTileFace document={document} />}
                    actionsFor={(document) => documentQuickActions(db, document, documentHref(document.id))}
                    onOpen={(document) => router.push(documentHref(document.id))}
                    onReorder={saveOrder}
                    scrollableRef={scrollRef}
                  />
                )}
                {shown.length === 0 && <Text style={styles.empty}>{t('favorites.noMatch', { query: query.trim() })}</Text>}
              </View>
            ) : (
              <View style={styles.list}>
                {shown.map((document) => (
                  <FavoriteRow
                    key={document.id}
                    document={document}
                    onOpen={() => router.push(documentHref(document.id))}
                    onRemove={() => unpin(document)}
                    onLongPress={items.length > 1 ? startReorder : undefined}
                  />
                ))}
                {pinned && items.length === 0 && <Text style={styles.empty}>{t('favorites.empty')}</Text>}
                {items.length > 0 && shown.length === 0 && (
                  <Text style={styles.empty}>{t('favorites.noMatch', { query: query.trim() })}</Text>
                )}
              </View>
            )}

            <Text style={styles.footer}>
              {items.length > 1
                ? view === 'grid'
                  ? t('favorites.footerGrid')
                  : t('favorites.footerList')
                : t('favorites.footer')}
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
  onLongPress?: () => void; // "Riordina" (2 favorites or more)
};

function FavoriteRow({ document, onOpen, onRemove, onLongPress }: RowProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const db = useSQLiteContext();
  const { pressed, handlers } = usePressed();
  const { fontScale } = useWindowDimensions();
  const lines = fontScale > 1.3 ? undefined : 1; // larger text: the whole name and subtitle
  const subtitle = favoriteSubtitle(document);
  // VoiceOver: the same actions as the long-press menu of the tiles, and "Riordina" (the long press here)
  const quick = documentQuickActions(db, document, documentHref(document.id)).filter((a) => a.key !== 'pin');
  const actions = [
    ...quick.filter((a) => !a.destructive),
    ...(onLongPress
      ? [{ key: 'reorder', label: t('favorites.reorderTitle'), symbol: 'arrow.up.arrow.down' as const, onPress: onLongPress }]
      : []),
    ...quick.filter((a) => a.destructive),
  ];

  return (
    <View style={styles.row}>
      <Pressable
        {...handlers}
        onPress={onOpen}
        onLongPress={onLongPress}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={`${document.title}, ${subtitle}`}
        accessibilityHint={onLongPress ? t('favorites.rowHint') : undefined}
        accessibilityActions={accessibilityActionsOf(actions)}
        onAccessibilityAction={(event) => runAccessibilityAction(actions, event.nativeEvent.actionName)}
        style={[styles.rowMain, pressed && styles.rowPressed]}>
        {document.password ? (
          <PasswordPreviewTile info={document.password} size={52} />
        ) : (
          <IconSquare symbol={document.category.symbol} colors={document.category.colors} size={52} radius={16} shadow />
        )}
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={lines}>
            {document.title}
          </Text>
          <Text style={styles.sub} numberOfLines={lines}>
            {subtitle}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={t('favorites.unpin')}
        accessibilityState={{ selected: true }}
        hitSlop={4}
        style={({ pressed }) => [styles.heart, pressed && styles.rowPressed]}>
        <SymbolView name="heart.fill" tintColor={HEART(theme)} size={24} />
      </Pressable>
    </View>
  );
}

// "Bollette · scade tra 3 giorni": the folder and the deadline, else the Tipo or the person
// (called while rendering, so the current language applies)
function favoriteSubtitle(document: DocumentListItem): string {
  let detail: string | null = null;
  if (document.expiresAt) {
    const days = daysUntil(document.expiresAt);
    detail = days < 0 ? describeDistance(days) : translate('favorites.expires', { distance: describeDistance(days) });
  } else {
    detail = document.docType ?? document.personName;
  }
  return [document.category.name, detail].filter(Boolean).join(' · ');
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
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
    color: c.textSecondary,
  },
  list: {
    marginTop: 12,
    gap: 10,
  },
  row: {
    ...cardSurface(c),
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
    color: c.text,
  },
  sub: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
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
    backgroundColor: c.paleLilac,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
    textAlign: 'center',
  },
  footer: {
    marginTop: 16,
    marginHorizontal: 4,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
    textAlign: 'center',
  },
});
