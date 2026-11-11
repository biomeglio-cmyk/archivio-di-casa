import { router, type Href } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { startAddCard } from '@/capture/start-add-card';
import { CardFace } from '@/components/card-face';
import { TileGrid, TileScrollView } from '@/components/tile-grid';
import type { DocumentListItem } from '@/db/types';
import { usePressed } from '@/hooks/use-pressed';
import type { TileSize } from '@/hooks/use-tile-size';

type Props = {
  cards: DocumentListItem[] | undefined;
  hrefFor: (card: DocumentListItem) => Href;
  footer?: ReactElement | null; // after the grid (e.g. Modifica / Cancella of the category)
};

// "Tessere e card" as a wallet: the shared TileGrid with card-shaped tiles, then "Aggiungi carta"
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
      style={[size, pressed && styles.pressed]}>
      <CardFace card={card} width={size.width} showPerson />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
  },
});
