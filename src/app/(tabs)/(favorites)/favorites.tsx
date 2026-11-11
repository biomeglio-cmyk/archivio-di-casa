import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { Alert, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

import { Text } from '@/components/text';
import { documentQuickActions } from '@/actions/quick-actions';
import { DocumentTileFace } from '@/components/document-tile';
import { SortableTileGrid } from '@/components/sortable-tile-grid';
import { TabHeader } from '@/components/tab-header';
import { TileScrollView } from '@/components/tile-grid';
import { PIN_COLOR } from '@/constants/brand';
import { listPinnedDocuments, savePinnedOrder } from '@/db/documents';
import type { DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';

// Tab "Preferiti": the pinned cards and documents in the 2-column grid, in the user's order.
// Long press and drag a tile to reorder (saved on release); "Modifica" only removes.
export default function FavoritesScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const { data: pinned } = useDbQuery(listPinnedDocuments, []);

  async function saveOrder(items: DocumentListItem[]) {
    try {
      await savePinnedOrder(db, items.map((d) => d.id));
    } catch (error) {
      Alert.alert('Impossibile salvare l’ordine', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    // Gesture root for the drag and drop
    <GestureHandlerRootView style={[styles.flex, { backgroundColor: theme.background }]}>
      <TabHeader
        title="Preferiti"
        action={pinned && pinned.length > 0 ? { label: 'Modifica', onPress: () => router.push('/pinned-edit') } : undefined}
      />
      <TileScrollView ref={scrollRef}>
        {pinned?.length === 0 && (
          <View style={[styles.empty, { borderColor: theme.textSecondary }]}>
            <SymbolView name="heart" tintColor={PIN_COLOR} size={20} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Tocca il cuore su una carta o un documento per tenerlo qui
            </Text>
          </View>
        )}
        {pinned && pinned.length > 0 && (
          <SortableTileGrid
            items={pinned}
            keyFor={(document) => document.id}
            labelFor={(document) => document.title}
            renderTile={(document) => <DocumentTileFace document={document} />}
            actionsFor={(document) =>
              documentQuickActions(db, document, {
                pathname: '/(tabs)/(favorites)/document/[id]',
                params: { id: String(document.id) },
              })
            }
            onOpen={(document) =>
              router.push({ pathname: '/(tabs)/(favorites)/document/[id]', params: { id: String(document.id) } })
            }
            onReorder={saveOrder}
            scrollableRef={scrollRef}
          />
        )}
      </TileScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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
