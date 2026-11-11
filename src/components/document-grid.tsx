import type { Href } from 'expo-router';
import type { ReactElement } from 'react';

import { DocumentTile } from '@/components/document-tile';
import { TileGrid, TileScrollView } from '@/components/tile-grid';
import type { DocumentListItem } from '@/db/types';
import { useDocumentSelection } from '@/hooks/use-document-selection';

type Props = {
  documents: DocumentListItem[] | undefined;
  hrefFor: (document: DocumentListItem) => Href;
  selection: ReturnType<typeof useDocumentSelection>;
  onAdd: () => void; // dashed "Aggiungi documento" tile
  header?: ReactElement | null;
  footer?: ReactElement | null;
};

// Documents of a category or a person in the shared TileGrid, then the dashed
// "Aggiungi documento" (hidden while selecting)
export function DocumentGrid({ documents, hrefFor, selection, onAdd, header, footer }: Props) {
  return (
    <TileScrollView>
      {header}
      <TileGrid
        items={documents}
        keyFor={(document) => document.id}
        add={selection.selecting ? null : { label: 'Aggiungi documento', onPress: onAdd }}
        renderTile={(document, size) => (
          <DocumentTile
            document={document}
            size={size}
            href={hrefFor(document)}
            selection={
              selection.selecting
                ? {
                    selected: selection.selected.has(document.id),
                    disabled: document.imageCount === 0, // only photos can go into the combined PDF
                    onToggle: () => selection.toggle(document.id),
                  }
                : undefined
            }
          />
        )}
      />
      {footer}
    </TileScrollView>
  );
}
