import { router, type Href } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { startAddCard } from '@/capture/start-add-card';
import { CardFace } from '@/components/card-face';
import { ThemedText } from '@/components/themed-text';
import { TileGrid, TileScrollView } from '@/components/tile-grid';
import type { DocumentListItem } from '@/db/types';
import { useCardFront } from '@/hooks/use-card-front';
import { usePressed } from '@/hooks/use-pressed';
import type { TileSize } from '@/hooks/use-tile-size';

type Props = {
  cards: DocumentListItem[] | undefined;
  hrefFor: (card: DocumentListItem) => Href;
  footer?: ReactElement | null; // after the grid
};

// "Tessere e card" as a wallet: the shared TileGrid with card-shaped tiles, then "Aggiungi carta".
// Each card follows its "Copertina": Foto = the clean copy of its front, edge to edge;
// Colore = its color with the name. The name (and the person) in small text under the card.
export function CardGrid({ cards, hrefFor, footer }: Props) {
  return (
    <TileScrollView>
      <TileGrid
        items={cards}
        keyFor={(card) => card.id}
        cardShaped
        add={{ label: 'Aggiungi carta', onPress: () => startAddCard('push') }}
        renderTile={(card, size) => <CardTile card={card} size={size} href={hrefFor(card)} />}
      />
      {footer}
    </TileScrollView>
  );
}

function CardTile({ card, size, href }: { card: DocumentListItem; size: TileSize; href: Href }) {
  const { pressed, handlers } = usePressed();
  return (
    <Pressable
      {...handlers}
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={card.personName ? `${card.title}, ${card.personName}` : card.title}
      style={[{ width: size.width }, pressed && styles.pressed]}>
      <CardFaceWithCaption card={card} width={size.width} />
    </Pressable>
  );
}

// The card (clean front or color) and its caption: the look only, also used by the sortable grid
export function CardFaceWithCaption({ card, width }: { card: DocumentListItem; width: number }) {
  const showPhoto = card.coverMode !== 'color';
  const photoUri = useCardFront(showPhoto ? card.firstImagePath : null);
  return (
    <View style={styles.cell}>
      <CardFace card={card} width={width} showPhoto={showPhoto} photoUri={photoUri} />
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
  pressed: {
    opacity: 0.8,
  },
  cell: {
    gap: 6,
  },
});
