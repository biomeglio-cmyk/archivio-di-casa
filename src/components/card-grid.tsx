import { router, type Href } from 'expo-router';
import type { ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { CARD_ASPECT_RATIO } from '@/capture/guide-frame';
import { CardFace } from '@/components/card-face';
import { DashedAddTile } from '@/components/dashed-add-tile';
import type { DocumentListItem } from '@/db/types';
import { usePressed } from '@/hooks/use-pressed';
import { TILE_COLUMNS, tileGridStyles, useTileSize } from '@/hooks/use-tile-size';

type GridItem = { kind: 'card'; card: DocumentListItem } | { kind: 'add' };

type Props = {
  cards: DocumentListItem[] | undefined;
  hrefFor: (card: DocumentListItem) => Href;
  footer?: ReactElement | null;
};

// "Tessere e card" as a wallet: card-shaped tiles, 2 per row, then the dashed "Aggiungi carta"
export function CardGrid({ cards, hrefFor, footer }: Props) {
  const { width } = useTileSize();
  const height = Math.round(width / CARD_ASPECT_RATIO);

  const items: GridItem[] = cards
    ? [...cards.map((card) => ({ kind: 'card' as const, card })), { kind: 'add' as const }]
    : [];

  return (
    <FlatList
      data={items}
      numColumns={TILE_COLUMNS}
      keyExtractor={(item) => (item.kind === 'card' ? String(item.card.id) : 'add')}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[tileGridStyles.content, styles.content]}
      columnWrapperStyle={tileGridStyles.row}
      ListFooterComponent={footer ?? undefined}
      renderItem={({ item }) =>
        item.kind === 'card' ? (
          <CardTile card={item.card} width={width} href={hrefFor(item.card)} />
        ) : (
          <DashedAddTile label="Aggiungi carta" size={{ width, minHeight: height }} onPress={() => router.push('/add-card')} radius={12} />
        )
      }
    />
  );
}

function CardTile({ card, width, href }: { card: DocumentListItem; width: number; href: Href }) {
  const { pressed, handlers } = usePressed();
  return (
    <Pressable
      {...handlers}
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={card.personName ? `${card.title}, ${card.personName}` : card.title}
      style={pressed && styles.pressed}>
      <CardFace card={card} width={width} showPerson />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 48, // room at the end, so nothing ends up under the tab bar
  },
  pressed: {
    opacity: 0.8,
  },
});
