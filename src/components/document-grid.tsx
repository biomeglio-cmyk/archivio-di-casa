import { router, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';

import { documentQuickActions } from '@/actions/quick-actions';
import { DocumentTile, DocumentTileFace } from '@/components/document-tile';
import { SortableTileGrid } from '@/components/sortable-tile-grid';
import { TileGrid, TileScrollView } from '@/components/tile-grid';
import type { DocumentListItem } from '@/db/types';
import { useDocumentSelection } from '@/hooks/use-document-selection';
import { themedStyles } from '@/constants/theme';

type Props = {
  documents: DocumentListItem[] | undefined;
  hrefFor: (document: DocumentListItem) => Href;
  selection: ReturnType<typeof useDocumentSelection>;
  onAdd: () => void; // dashed "Aggiungi documento" tile
  onReorder: (documents: DocumentListItem[]) => void; // after a drag, the new order to save
  header?: ReactElement | null;
};

// Documents of a category or a person. Long press and drag a tile to reorder, like Home and
// Preferiti; the dashed "Aggiungi documento" stays last. While selecting ("Seleziona") the grid
// is fixed: a tap ticks the document, and the dashed tile is hidden.
export function DocumentGrid({ documents, hrefFor, selection, onAdd, onReorder, header }: Props) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const db = useSQLiteContext();

  return (
    // Gesture root for the drag and drop
    <GestureHandlerRootView style={styles.flex}>
      <TileScrollView ref={scrollRef}>
        {header}
        {selection.selecting ? (
          <TileGrid
            items={documents}
            keyFor={(document) => document.id}
            renderTile={(document, size) => (
              <DocumentTile
                document={document}
                size={size}
                href={hrefFor(document)}
                selection={{
                  selected: selection.selected.has(document.id),
                  disabled: document.imageCount === 0, // only photos can go into the combined PDF
                  onToggle: () => selection.toggle(document.id),
                }}
              />
            )}
          />
        ) : (
          documents && (
            <SortableTileGrid
              items={documents}
              keyFor={(document) => document.id}
              labelFor={(document) => document.title}
              renderTile={(document) => <DocumentTileFace document={document} />}
              actionsFor={(document) => documentQuickActions(db, document, hrefFor(document))}
              onOpen={(document) => router.push(hrefFor(document))}
              onReorder={onReorder}
              scrollableRef={scrollRef}
              add={{ label: 'Aggiungi documento', onPress: onAdd }}
            />
          )
        )}
      </TileScrollView>
    </GestureHandlerRootView>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  flex: {
    flex: 1,
  },
}));
