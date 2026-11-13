import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type AnimatedRef,
} from 'react-native-reanimated';
import Sortable, { type DragMoveParams, type SortableGridDragEndParams } from 'react-native-sortables';

import { accessibilityActionsOf, runAccessibilityAction, type QuickAction } from '@/actions/quick-actions';

import { CARD_ASPECT_RATIO } from '@/capture/guide-frame';
import { DashedAddTile } from '@/components/dashed-add-tile';
import { QuickActionMenu, type QuickMenuTarget } from '@/components/quick-action-menu';
import { TILE_COLUMNS, TILE_GAP, useTileSize } from '@/hooks/use-tile-size';
import { type Palette } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

const DRAG_DELAY_MS = 400; // long press before a tile lifts, like the iOS Home Screen
const REORDER_DRAG_DELAY_MS = 120; // "Riordina": a short touch is enough to pick a tile up
const WIGGLE_DEGREES = 1.2;
const TAP_AFTER_DRAG_MS = 300;
// Event time (only ever called from gesture callbacks, never while rendering)
const eventTime = () => Date.now();
const STILL_DISTANCE = 10; // px: a lifted tile released within this distance "didn't move"

type Props<T> = {
  items: T[];
  keyFor: (item: T) => number;
  renderTile: (item: T) => ReactNode; // the look only: it fills the cell (flex: 1)
  labelFor: (item: T) => string; // VoiceOver
  onOpen: (item: T) => void; // tap
  onReorder: (items: T[]) => void; // after a drag that changed the order
  scrollableRef?: AnimatedRef<Animated.ScrollView>; // the page scrolls when a tile nears its edge
  add?: { label: string; onPress: () => void }; // dashed tile, always last and never draggable
  cardShaped?: boolean; // "Tessere e card": tiles as tall as a real card, as in TileGrid
  tileHeight?: number; // minimum tile height instead of the default (Home squares: 132)
  // "Riordina" mode: tiles wiggle with a handle, they drag at once (no long press), a tap does
  // not open them, no quick menu, no dashed "add" tile
  reordering?: boolean;
  // Long press released WITHOUT moving: the quick-action menu (also the VoiceOver actions)
  actionsFor?: (item: T) => QuickAction[];
};

// What the grid shows: the items, then (optionally) the dashed "add" tile
type Cell<T> = { kind: 'item'; item: T } | { kind: 'add' };

// The tile grid with drag and drop (Preferiti, categories in Home, documents of a category or a
// person, the cards): same 2 columns, gaps and
// tile size as TileGrid. Long press (~400 ms) → light vibration, the tile lifts and follows the
// finger, the others make room; on release onReorder gets the new order. A tap opens the item;
// moving the finger before 400 ms scrolls the page as usual.
// Released without moving (and still in its place): the quick-action menu anchored to the tile
// (a custom popover: the native iOS context menu has its own long press, which fights the drag).
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
  cardShaped = false,
  tileHeight,
  reordering = false,
  actionsFor,
}: Props<T>) {
  const gridSize = useTileSize(); // the width comes from the grid column
  const tileSize = cardShaped
    ? { width: gridSize.width, minHeight: Math.round(gridSize.width / CARD_ASPECT_RATIO) }
    : { width: gridSize.width, minHeight: tileHeight ?? gridSize.minHeight };
  const { minHeight } = tileSize;

  const cells: Cell<T>[] = items.map((item) => ({ kind: 'item', item }));
  if (add && !reordering) cells.push({ kind: 'add' });

  // The lifted tile: where the finger was when it lifted, and whether it moved since
  // (`active`/`endedAt`: a release right after the lift is not also a tap that opens the item)
  const drag = useRef<{ start: { x: number; y: number } | null; moved: boolean; active: boolean; endedAt: number }>({
    start: null,
    moved: false,
    active: false,
    endedAt: 0,
  });
  const tileViews = useRef(new Map<string, ComponentRef<typeof View>>()); // to measure a tile for the menu anchor
  const [menu, setMenu] = useState<QuickMenuTarget | null>(null);

  function onDragStart() {
    drag.current = { start: null, moved: false, active: true, endedAt: 0 };
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function onDragMove({ touchData }: DragMoveParams) {
    const current = drag.current;
    if (current.moved) return;
    if (!current.start) {
      current.start = { x: touchData.absoluteX, y: touchData.absoluteY };
      return;
    }
    const dx = touchData.absoluteX - current.start.x;
    const dy = touchData.absoluteY - current.start.y;
    if (dx * dx + dy * dy > STILL_DISTANCE * STILL_DISTANCE) current.moved = true;
  }

  function onDragEnd({ data, key, fromIndex, toIndex }: SortableGridDragEndParams<Cell<T>>) {
    drag.current.active = false;
    drag.current.endedAt = eventTime();
    const ordered = data.flatMap((cell) => (cell.kind === 'item' ? [cell.item] : []));
    if (ordered.some((item, index) => keyFor(item) !== keyFor(items[index]))) onReorder(ordered);
    if (!reordering && !drag.current.moved && fromIndex === toIndex && actionsFor) openMenu(key);
  }

  function openMenu(key: string) {
    const item = items.find((candidate) => String(keyFor(candidate)) === key);
    const view = tileViews.current.get(key);
    if (item === undefined || !view || !actionsFor) return;
    view.measureInWindow((x, y, width, height) => {
      setMenu({ rect: { x, y, width, height }, tile: renderTile(item), actions: actionsFor(item) });
    });
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
    <>
      <Sortable.Grid
        data={cells}
        keyExtractor={(cell) => (cell.kind === 'item' ? String(keyFor(cell.item)) : 'add')}
        customHandle
        columns={TILE_COLUMNS}
        rowGap={TILE_GAP}
        columnGap={TILE_GAP}
        dragActivationDelay={reordering ? REORDER_DRAG_DELAY_MS : DRAG_DELAY_MS}
        activeItemScale={1.05}
        activeItemShadowOpacity={0.25}
        inactiveItemOpacity={1}
        scrollableRef={scrollableRef}
        autoScrollEnabled={scrollableRef !== undefined}
        onDragStart={onDragStart}
        onDragMove={actionsFor ? onDragMove : undefined}
        onDragEnd={onDragEnd}
        renderItem={({ item: cell }) => {
          if (cell.kind === 'add') {
            return (
              add && (
                <Sortable.Handle mode="fixed-order">
                  <DashedAddTile
                    label={add.label}
                    size={tileSize}
                    onPress={add.onPress}
                    radius={cardShaped ? 12 : 20}
                  />
                </Sortable.Handle>
              )
            );
          }
          const { item } = cell;
          const key = String(keyFor(item));
          const index = items.indexOf(item);
          const quick = actionsFor?.(item) ?? [];
          return (
            // Sortable.Touchable: the tap opens the item, the long press is left to the drag
            <Sortable.Handle>
              <Sortable.Touchable
                onTap={() => {
                  // The tap recognizer runs alongside the drag: ignore it when a tile was lifted
                  if (reordering || drag.current.active || eventTime() - drag.current.endedAt < TAP_AFTER_DRAG_MS) return;
                  onOpen(item);
                }}
                style={{ minHeight }}
                accessible
                accessibilityRole="button"
                accessibilityLabel={labelFor(item)}
                accessibilityHint={
                  reordering
                    ? 'Trascina per spostarlo, oppure usa le azioni Sposta prima e Sposta dopo'
                    : 'Tieni premuto: trascina per spostarlo, oppure lascia per le azioni'
                }
                accessibilityActions={[
                  { name: 'activate' },
                  { name: 'earlier', label: 'Sposta prima' },
                  { name: 'later', label: 'Sposta dopo' },
                  ...(reordering ? [] : accessibilityActionsOf(quick)),
                ]}
                onAccessibilityAction={(event) => {
                  const action = event.nativeEvent.actionName;
                  if (action === 'earlier') moveBy(item, -1);
                  else if (action === 'later') moveBy(item, 1);
                  else if (!reordering && !runAccessibilityAction(quick, action)) onOpen(item);
                }}>
                <View
                  collapsable={false}
                  style={{ flex: 1 }}
                  ref={(view) => {
                    if (view) tileViews.current.set(key, view);
                    else tileViews.current.delete(key);
                  }}>
                  {reordering ? <Wiggle direction={index % 2 === 0 ? 1 : -1}>{renderTile(item)}</Wiggle> : renderTile(item)}
                </View>
              </Sortable.Touchable>
            </Sortable.Handle>
          );
        }}
      />
      <QuickActionMenu target={menu} onClose={() => setMenu(null)} />
    </>
  );
}

// "Riordina": the tile rocks a little (like the iOS Home Screen in edit mode) and shows a handle
function Wiggle({ direction, children }: { direction: 1 | -1; children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  const angle = useSharedValue(0);
  useEffect(() => {
    angle.set(
      withRepeat(
        withSequence(
          withTiming(WIGGLE_DEGREES * direction, { duration: 130 }),
          withTiming(-WIGGLE_DEGREES * direction, { duration: 130 }),
        ),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(angle);
  }, [angle, direction]);
  const rocking = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.get()}deg` }] }));

  return (
    <Animated.View style={[styles.wiggle, rocking]}>
      {children}
      <View style={styles.handle} pointerEvents="none">
        <SymbolView name="line.3.horizontal" tintColor="#1C1E2E" size={14} weight="semibold" />
      </View>
    </Animated.View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  wiggle: {
    flex: 1,
  },
  handle: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
