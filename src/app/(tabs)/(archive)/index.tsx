import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

import { categoryQuickActions } from '@/actions/quick-actions';
import { BackupReminder } from '@/components/backup-reminder';
import { CATEGORY_TILE_HEIGHT, CategoryTile, describeCategoryCount } from '@/components/category-tile';
import { HomeEmpty } from '@/components/home-empty';
import { HomeHeader } from '@/components/home-header';
import { LimitCard } from '@/components/limit-card';
import { FavoriteTile, NextDeadlineCard } from '@/components/home-sections';
import { SearchBar } from '@/components/search-bar';
import { SectionHeader } from '@/components/section-header';
import { SortableTileGrid } from '@/components/sortable-tile-grid';
import { Text } from '@/components/text';
import { TileScrollView } from '@/components/tile-grid';
import { Colors, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { listCategoriesWithCounts, saveCategoryOrder } from '@/db/categories';
import { listDocumentsWithExpiry, listPinnedDocuments } from '@/db/documents';
import type { DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { hasSeenOnboarding } from '@/onboarding/onboarding-flag';
import { useEmptyHomePreview } from '@/settings/debug-previews';
import { useFreeLimit } from '@/settings/free-limit';
import { toISODate } from '@/utils/dates';

const AFTER_SPLASH_MS = 1100; // the opening screen lasts about one second

// Under "SCADENZE": the first deadline from today on (none: the section is hidden)
function nextDeadline(documents: DocumentListItem[]): DocumentListItem | null {
  const today = toISODate(new Date());
  return documents.find((d) => d.expiresAt !== null && d.expiresAt >= today) ?? null;
}

// "/" route, the app opens here (docs/design/Main.dc.html). One scrolling page: ≡ menu, bell and
// logo; "Ciao!"; the search field; the backup notice; PREFERITI (the first 2), SCADENZE (the
// next one), ARCHIVIO (the categories, with drag and drop and the quick menu).
// The search field opens Ricerca (docs/design/Ricerca.dc.html).
export default function ArchiveScreen() {
  const db = useSQLiteContext();
  const scrollRef = useAnimatedRef<Animated.ScrollView>(); // the page scrolls while a category is dragged
  const { data: categories } = useDbQuery(listCategoriesWithCounts, []);
  const { data: pinned } = useDbQuery(listPinnedDocuments, []);
  const { data: withExpiry } = useDbQuery(listDocumentsWithExpiry, []);
  const { usage, reached } = useFreeLimit();
  const emptyPreview = useEmptyHomePreview(); // test switch in Impostazioni (data untouched)
  const empty = usage?.used === 0 || emptyPreview; // no documents or cards yet: Home vuota

  const [reordering, setReordering] = useState(false); // "Riordina" … "Fine"

  // Leaving Home ends "Riordina"
  useFocusEffect(useCallback(() => () => setReordering(false), []));

  const favorites = (pinned ?? []).slice(0, 2);
  const next = withExpiry ? nextDeadline(withExpiry) : null;

  // First launch only: show the "Consigli iniziali" once the opening screen has faded
  useEffect(() => {
    if (hasSeenOnboarding()) return;
    const timer = setTimeout(() => router.push('/onboarding'), AFTER_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    // Gesture root for the drag and drop of the categories
    <GestureHandlerRootView style={styles.screen}>
      <TileScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.page}>
        <HomeHeader />
        <Text style={styles.hello} accessibilityRole="header">
          Ciao!
        </Text>
        {empty && categories ? (
          <HomeEmpty categories={categories} />
        ) : (
          <>
            <View style={styles.search}>
              <SearchBar value="" onChangeText={() => undefined} placeholder="Cerca un documento" onOpen={() => router.push('/search')} />
            </View>

            <View style={styles.notice}>
              {reached && usage ? <LimitCard usage={usage} /> : <BackupReminder />}
            </View>

            {favorites.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  title="Preferiti"
                  action={{
                    label: 'Vedi tutto',
                    accessibilityLabel: 'Vedi tutti i preferiti',
                    onPress: () => router.navigate('/(tabs)/(favorites)/favorites'),
                  }}
                />
                <View style={styles.favorites}>
                  {favorites.map((document) => (
                    <FavoriteTile key={document.id} document={document} />
                  ))}
                  {/* One favorite: it keeps half the width, like in a grid of two */}
                  {favorites.length === 1 && <View style={styles.flex} />}
                </View>
              </View>
            )}

            {next && (
              <View style={styles.section}>
                <SectionHeader
                  title="Scadenze"
                  action={{
                    label: 'Vedi tutto',
                    accessibilityLabel: 'Vedi tutte le scadenze',
                    onPress: () => router.navigate('/(tabs)/(deadlines)/deadlines'),
                  }}
                />
                <NextDeadlineCard document={next} />
              </View>
            )}

            <View style={styles.section}>
              <SectionHeader
                title="Archivio"
                action={
                  categories && categories.length > 1
                    ? reordering
                      ? { label: 'Fine', accessibilityLabel: 'Fine riordino', onPress: () => setReordering(false) }
                      : { label: 'Riordina', accessibilityLabel: 'Riordina le categorie', onPress: () => setReordering(true) }
                    : undefined
                }
              />
              {reordering && (
                <Text style={styles.reorderHint}>Trascina le categorie nell’ordine che preferisci.</Text>
              )}
              {categories && (
                <SortableTileGrid
                  items={categories}
                  keyFor={(category) => category.id}
                  labelFor={(category) => `${category.name}, ${describeCategoryCount(category, category.documentCount)}`}
                  tileHeight={CATEGORY_TILE_HEIGHT}
                  reordering={reordering}
                  renderTile={(category) => <CategoryTile category={category} documentCount={category.documentCount} />}
                  actionsFor={(category) => categoryQuickActions(db, category)}
                  onOpen={(category) => router.push({ pathname: '/category/[id]', params: { id: String(category.id) } })}
                  onReorder={(ordered) =>
                    saveCategoryOrder(db, ordered.map((c) => c.id)).catch((error: unknown) =>
                      Alert.alert('Impossibile salvare l’ordine', error instanceof Error ? error.message : String(error)),
                    )
                  }
                  add={{ label: 'Nuova categoria', onPress: () => router.push('/category-form') }}
                  scrollableRef={scrollRef}
                />
              )}
            </View>
          </>
        )}
      </TileScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  // The page of the design: 22 at the sides, room for the tab bar at the bottom
  page: {
    paddingTop: 8,
    paddingBottom: Spacing.belowContent,
    gap: 0,
  },
  hello: {
    marginTop: 22,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONTS.bold,
    color: Colors.light.text,
  },
  search: {
    marginTop: 18,
  },
  notice: {
    marginTop: 16,
  },
  section: {
    marginTop: 26,
    gap: Spacing.titleToContent,
  },
  reorderHint: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: Colors.light.textOnLilac,
  },
  favorites: {
    flexDirection: 'row',
    gap: Spacing.tileGap,
  },
});
