import { StyleSheet, useWindowDimensions } from 'react-native';

export const TILE_COLUMNS = 2;
const PADDING = 16; // space between the grid and the screen edges
const GAP = 12; // space between tiles, both horizontal and vertical
const TILE_MIN_HEIGHT = 128;

// Width is fixed by the grid; height is only a minimum, so large Dynamic Type makes tiles taller
// instead of cutting their text
export type TileSize = { width: number; minHeight: number };

// Styles for a FlatList with numColumns={TILE_COLUMNS}
export const tileGridStyles = StyleSheet.create({
  content: {
    padding: PADDING,
    gap: GAP, // vertical space between rows
  },
  row: {
    gap: GAP, // horizontal space between the columns
    alignItems: 'stretch', // both tiles of a row get the height of the taller one
  },
});

// Same width for every tile of a grid, computed from the screen width (never from the content):
// (screen - side paddings - gaps between the columns) / columns. Math.floor avoids sub-pixel overflow.
export function useTileSize(): TileSize {
  const { width } = useWindowDimensions();
  return {
    width: Math.floor((width - PADDING * 2 - GAP * (TILE_COLUMNS - 1)) / TILE_COLUMNS),
    minHeight: TILE_MIN_HEIGHT,
  };
}
