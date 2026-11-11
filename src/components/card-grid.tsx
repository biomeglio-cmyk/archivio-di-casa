import { router, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

import { documentQuickActions } from '@/actions/quick-actions';
import { startAddCard } from '@/capture/start-add-card';
import { CardFace } from '@/components/card-face';
import { ThemedText } from '@/components/themed-text';
import { SortableTileGrid } from '@/components/sortable-tile-grid';
import { TileScrollView } from '@/components/tile-grid';
import type { DocumentListItem } from '@/db/types';
import { useTileSize } from '@/hooks/use-tile-size';

type Props = {
  cards: DocumentListItem[] | undefined;
  hrefFor: (card: DocumentListItem) => Href;
  onReorder: (cards: DocumentListItem[]) => void; // after a drag, the new order to save
};

// "Tessere e card" as a wallet: card-shaped tiles, then "Aggiungi carta". Long press and drag a
// card to reorder, like the other grids. Each card follows its "Copertina": Foto = the photo
// of its front, edge to edge; Colore = its color with the name. The name (and the person) in
// small text under the card.
export function CardGrid({ cards, hrefFor, onReorder }: Props) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const { width } = useTileSize();
  const db = useSQLiteContext();

  return (
    // Gesture root for the drag and drop
    <GestureHandlerRootView style={styles.flex}>
      <TileScrollView ref={scrollRef}>
        {cards && (
          <SortableTileGrid
            items={cards}
            keyFor={(card) => card.id}
            labelFor={(card) => (card.personName ? `${card.title}, ${card.personName}` : card.title)}
            renderTile={(card) => <CardFaceWithCaption card={card} width={width} />}
            actionsFor={(card) => documentQuickActions(db, card, hrefFor(card))}
            onOpen={(card) => router.push(hrefFor(card))}
            onReorder={onReorder}
            scrollableRef={scrollRef}
            add={{ label: 'Aggiungi carta', onPress: () => startAddCard('push') }}
            cardShaped
          />
        )}
      </TileScrollView>
    </GestureHandlerRootView>
  );
}

// The card (front photo or color) and its caption: the look only, the sortable grid handles the tap
function CardFaceWithCaption({ card, width }: { card: DocumentListItem; width: number }) {
  const showPhoto = card.coverMode !== 'color';
  return (
    <View style={styles.cell}>
      <CardFace card={card} width={width} showPhoto={showPhoto} />
      <View>
        <ThemedText type="small" numberOfLines={1} maxFontSizeMultiplier={1.4}>
          {card.title}
        </ThemedText>
        {card.personName && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} maxFontSizeMultiplier={1.4}>
            {card.personName}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  cell: {
    gap: 6,
  },
});
