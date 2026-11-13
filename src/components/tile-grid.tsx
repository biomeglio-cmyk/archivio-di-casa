import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View, type ScrollViewProps } from 'react-native';
import Animated, { type AnimatedRef } from 'react-native-reanimated';

import { CARD_ASPECT_RATIO } from '@/capture/guide-frame';
import { DashedAddTile } from '@/components/dashed-add-tile';
import { TileColumnsProvider } from '@/components/tile-columns';
import { TILE_GAP, TILE_PADDING, useTileColumns, useTileSize, type TileSize } from '@/hooks/use-tile-size';
import { type Palette } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

type Props<T> = {
  items: T[] | undefined; // undefined = loading: nothing is drawn, not even the dashed tile
  keyFor: (item: T) => string | number;
  renderTile: (item: T, size: TileSize) => ReactNode; // the tile puts `size` on its outer view, so the row can stretch it
  add?: { label: string; onPress: () => void } | null; // dashed tile at the end; null = hidden
  cardShaped?: boolean; // "Tessere e card": tiles as tall as a real card (no minimum height)
};

// The ONE tile grid of the app (Home, categories, people, documents, cards):
// 2 columns, same gaps, width from the screen, and both tiles of a row as tall as the taller one.
// It is a plain View (not a list): the grids are small, and Home can stack two of them.
export function TileGrid<T>(props: Props<T>) {
  return (
    <TileColumnsProvider>
      <Grid {...props} />
    </TileColumnsProvider>
  );
}

function Grid<T>({ items, keyFor, renderTile, add, cardShaped = false }: Props<T>) {
  const styles = useThemedStyles(makeStyles);
  const tileSize = useTileSize();
  const { columns } = useTileColumns();
  if (!items) return null;

  const size: TileSize = cardShaped
    ? { width: tileSize.width, minHeight: Math.round(tileSize.width / CARD_ASPECT_RATIO) }
    : tileSize;

  type Cell = { kind: 'item'; item: T } | { kind: 'add' };
  const cells: Cell[] = items.map((item) => ({ kind: 'item', item }));
  if (add) cells.push({ kind: 'add' });

  const rows: Cell[][] = [];
  for (let i = 0; i < cells.length; i += columns) rows.push(cells.slice(i, i + columns));

  const cellKey = (cell: Cell) => (cell.kind === 'item' ? String(keyFor(cell.item)) : 'add');

  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={cellKey(row[0])} style={styles.row}>
          {row.map((cell) =>
            cell.kind === 'item' ? (
              <Fragment key={cellKey(cell)}>{renderTile(cell.item, size)}</Fragment>
            ) : (
              add && (
                <DashedAddTile key="add" label={add.label} size={size} onPress={add.onPress} radius={cardShaped ? 12 : 20} />
              )
            ),
          )}
        </View>
      ))}
    </View>
  );
}

// The scrolling page around one or more grids: the same edge padding everywhere, and room at
// the end so the last row is never under the tab bar. An animated scroll view, so a grid with
// drag and drop (Preferiti) can scroll it while a tile is dragged near the edge (`ref`).
export function TileScrollView({
  contentContainerStyle,
  ref,
  ...props
}: ScrollViewProps & { ref?: AnimatedRef<Animated.ScrollView> }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Animated.ScrollView
      ref={ref}
      contentInsetAdjustmentBehavior="automatic"
      {...props}
      contentContainerStyle={[styles.page, contentContainerStyle]}
    />
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  page: {
    padding: TILE_PADDING,
    paddingBottom: 48,
    gap: TILE_GAP, // between a header, the grid and what comes after it
  },
  grid: {
    gap: TILE_GAP, // vertical space between rows
  },
  row: {
    flexDirection: 'row',
    gap: TILE_GAP, // horizontal space between the columns
    alignItems: 'stretch', // both tiles of a row get the height of the taller one
  },
});
