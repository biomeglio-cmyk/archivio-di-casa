import type { Href } from 'expo-router';
import type { ReactElement } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { DashedAddTile } from '@/components/dashed-add-tile';
import { DocumentTile } from '@/components/document-tile';
import type { DocumentListItem } from '@/db/types';
import { useDocumentSelection } from '@/hooks/use-document-selection';
import { TILE_COLUMNS, tileGridStyles, useTileSize } from '@/hooks/use-tile-size';

type GridItem = { kind: 'document'; document: DocumentListItem } | { kind: 'add' };

type Props = {
  documents: DocumentListItem[] | undefined;
  hrefFor: (document: DocumentListItem) => Href;
  selection: ReturnType<typeof useDocumentSelection>;
  onAdd: () => void; // dashed "Aggiungi documento" tile
  header?: ReactElement | null;
  footer?: ReactElement | null;
};

// Documents of a category or a person as tiles, 2 per row: same grid and sizes as Archivio.
// The last tile is the dashed "Aggiungi documento" (hidden while selecting).
export function DocumentGrid({ documents, hrefFor, selection, onAdd, header, footer }: Props) {
  const size = useTileSize();

  // The dashed tile appears together with the documents, so it doesn't flash alone while loading
  const items: GridItem[] = documents
    ? [
        ...documents.map((document) => ({ kind: 'document' as const, document })),
        ...(selection.selecting ? [] : [{ kind: 'add' as const }]),
      ]
    : [];

  return (
    <FlatList
      data={items}
      numColumns={TILE_COLUMNS}
      keyExtractor={(item) => (item.kind === 'document' ? String(item.document.id) : 'add')}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[tileGridStyles.content, styles.content]}
      columnWrapperStyle={tileGridStyles.row}
      ListHeaderComponent={header ?? undefined}
      ListFooterComponent={footer ?? undefined}
      renderItem={({ item }) =>
        item.kind === 'document' ? (
          <DocumentTile
            document={item.document}
            size={size}
            href={hrefFor(item.document)}
            selection={
              selection.selecting
                ? {
                    selected: selection.selected.has(item.document.id),
                    disabled: item.document.imageCount === 0, // only photos can go into the combined PDF
                    onToggle: () => selection.toggle(item.document.id),
                  }
                : undefined
            }
          />
        ) : (
          <DashedAddTile label="Aggiungi documento" size={size} onPress={onAdd} />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 48, // room at the end, so nothing ends up under the tab bar
  },
});
