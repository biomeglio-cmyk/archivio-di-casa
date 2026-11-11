import type { Href } from 'expo-router';
import type { ReactElement } from 'react';

import { startAddCard } from '@/capture/start-add-card';
import { DocumentTile } from '@/components/document-cover-tile';
import { TileGrid, TileScrollView } from '@/components/tile-grid';
import type { DocumentListItem } from '@/db/types';

type Props = {
  cards: DocumentListItem[] | undefined;
  hrefFor: (card: DocumentListItem) => Href;
  footer?: ReactElement | null; // after the grid (e.g. Modifica / Cancella of the category)
};

// "Tessere e card" as a wallet: the shared TileGrid with card-shaped tiles (the same document
// tile as everywhere, with the person's name), then "Aggiungi carta"
export function CardGrid({ cards, hrefFor, footer }: Props) {
  return (
    <TileScrollView>
      <TileGrid
        items={cards}
        keyFor={(card) => card.id}
        cardShaped
        add={{ label: 'Aggiungi carta', onPress: () => startAddCard('push') }}
        renderTile={(card, size) => <DocumentTile document={card} size={size} href={hrefFor(card)} showPerson />}
      />
      {footer}
    </TileScrollView>
  );
}
