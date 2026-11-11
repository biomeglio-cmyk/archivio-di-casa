import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import type Animated from 'react-native-reanimated';
import type { AnimatedRef } from 'react-native-reanimated';
import Sortable, { type SortableGridDragEndParams } from 'react-native-sortables';

import { DashedAddTile } from '@/components/dashed-add-tile';
import { TILE_COLUMNS, TILE_GAP, useTileSize } from '@/hooks/use-tile-size';

const DRAG_DELAY_MS = 400; // long press before a tile lifts, like the iOS Home Screen

type Props<T> = {
  items: T[];
  keyFor: (item: T) => number;
  renderTile: (item: T) => ReactNode; // the look only: it fills the cell (flex: 1)
  labelFor: (item: T) => string; // VoiceOver
  onOpen: (item: T) => void; // tap
  onReorder: (items: T[]) => void; // after a drag that changed the order
  scrollableRef?: AnimatedRef<Animated.ScrollView>; // the page scrolls when a tile nears its edge
  add?: { label: string; onPress: () => void }; // dashed tile, always last and never draggable
};

// What the grid shows: the items, then (optionally) the dashed "add" tile
type Cell<T> = { kind: 'item'; item: T } | { kind: 'add' };

// The tile grid with drag and drop (Preferiti, categories in Home): same 2 columns, gaps and
// tile size as TileGrid. Long press (~400 ms) → light vibration, the tile lifts and follows the
// finger, the others make room; on release onReorder gets the new order. A tap opens the item;
// moving the finger before 400 ms scrolls the page as usual.
// Every tile is a Sortable.Handle (customHandle): the items drag, the "add" tile is 'fixed-order',
// so it stays in the last place and no item can be dropped after it.
export function SortableTileGrid<T>({
  items,
  keyFor,
  renderTile,
  labelFor,
  onOpen,
  onReorder,
  scrollableRef,
  add,
}: Props<T>) {
  const tileSize = useTileSize(); // the width comes from the grid column
  const { minHeight } = tileSize;

  const cells: Cell<T>[] = items.map((item) => ({ kind: 'item', item }));
  if (add) cells.push({ kind: 'add' });

  function onDragEnd({ data }: SortableGridDragEndParams<Cell<T>>) {
    const ordered = data.flatMap((cell) => (cell.kind === 'item' ? [cell.item] : []));
    if (ordered.some((item, index) => keyFor(item) !== keyFor(items[index]))) onReorder(ordered);
  }

  // VoiceOver: "Sposta prima" / "Sposta dopo" instead of dragging
  function moveBy(item: T, delta: number) {
    const from = items.indexOf(item);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= items.length) return;
    const next = [...items];
    next.splice(from, 1);
    next.splice(to, 0, item);
    onReorder(next);
  }

  return (
    <Sortable.Grid
      data={cells}
      keyExtractor={(cell) => (cell.kind === 'item' ? String(keyFor(cell.item)) : 'add')}
      customHandle
      columns={TILE_COLUMNS}
      rowGap={TILE_GAP}
      columnGap={TILE_GAP}
      dragActivationDelay={DRAG_DELAY_MS}
      activeItemScale={1.05}
      activeItemShadowOpacity={0.25}
      inactiveItemOpacity={1}
      scrollableRef={scrollableRef}
      autoScrollEnabled={scrollableRef !== undefined}
      onDragStart={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onDragEnd={onDragEnd}
      renderItem={({ item: cell }) => {
        if (cell.kind === 'add') {
          return (
            add && (
              <Sortable.Handle mode="fixed-order">
                <DashedAddTile label={add.label} size={tileSize} onPress={add.onPress} />
              </Sortable.Handle>
            )
          );
        }
        const { item } = cell;
        return (
          // Sortable.Touchable: the tap opens the item, the long press is left to the drag
          <Sortable.Handle>
            <Sortable.Touchable
              onTap={() => onOpen(item)}
              style={{ minHeight }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={labelFor(item)}
              accessibilityHint="Tieni premuto e trascina per spostarlo"
              accessibilityActions={[
                { name: 'activate' },
                { name: 'earlier', label: 'Sposta prima' },
                { name: 'later', label: 'Sposta dopo' },
              ]}
              onAccessibilityAction={(event) => {
                const action = event.nativeEvent.actionName;
                if (action === 'earlier') moveBy(item, -1);
                else if (action === 'later') moveBy(item, 1);
                else onOpen(item);
              }}>
              {renderTile(item)}
            </Sortable.Touchable>
          </Sortable.Handle>
        );
      }}
    />
  );
}
