import { useWindowDimensions } from 'react-native';

export const TILE_COLUMNS = 2;
export const TILE_PADDING = 16; // space between the grid and the screen edges
export const TILE_GAP = 12; // space between tiles, both horizontal and vertical
const TILE_MIN_HEIGHT = 128;

// Width is fixed by the grid; height is only a minimum, so large Dynamic Type makes tiles taller
// instead of cutting their text
export type TileSize = { width: number; minHeight: number };

// Same width for every tile of a grid, computed from the screen width (never from the content):
// (screen - side paddings - gaps between the columns) / columns. Math.floor avoids sub-pixel overflow.
export function useTileSize(): TileSize {
  const { width } = useWindowDimensions();
  return {
    width: Math.floor((width - TILE_PADDING * 2 - TILE_GAP * (TILE_COLUMNS - 1)) / TILE_COLUMNS),
    minHeight: TILE_MIN_HEIGHT,
  };
}
