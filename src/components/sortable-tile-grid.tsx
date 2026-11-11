import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import type Animated from 'react-native-reanimated';
import type { AnimatedRef } from 'react-native-reanimated';
import Sortable, { type SortableGridDragEndParams } from 'react-native-sortables';

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
};

// The tile grid with drag and drop (Preferiti, categories in Home): same 2 columns, gaps and
// tile size as TileGrid. Long press (~400 ms) → light vibration, the tile lifts and follows the
// finger, the others make room; on release onReorder gets the new order. A tap opens the item;
// moving the finger before 400 ms scrolls the page as usual.
export function SortableTileGrid<T>({ items, keyFor, renderTile, labelFor, onOpen, onReorder, scrollableRef }: Props<T>) {
  const { minHeight } = useTileSize(); // the width comes from the grid column

  function onDragEnd({ data }: SortableGridDragEndParams<T>) {
    if (data.some((item, index) => keyFor(item) !== keyFor(items[index]))) onReorder(data);
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
      data={items}
      keyExtractor={(item) => String(keyFor(item))}
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
      renderItem={({ item }) => (
        // Sortable.Touchable: the tap opens the item, the long press is left to the drag
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
      )}
    />
  );
}
