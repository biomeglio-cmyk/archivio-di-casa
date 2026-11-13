import { createContext, use } from 'react';
import { useWindowDimensions } from 'react-native';

import { Spacing } from '@/constants/theme';

export const TILE_COLUMNS = 2;
export const TILE_PADDING = Spacing.side; // space between the grid and the screen edges
export const TILE_GAP = Spacing.tileGap; // space between tiles, both horizontal and vertical
const TILE_MIN_HEIGHT = 128;

// Width is fixed by the grid; height is only a minimum, so large Dynamic Type makes tiles taller
// instead of cutting their text
export type TileSize = { width: number; minHeight: number };

// Same width for every tile of a grid, computed from the screen width (never from the content):
// (screen - side paddings - gaps between the columns) / columns. Math.floor avoids sub-pixel overflow.
export function useTileSize(): TileSize {
  const { width } = useWindowDimensions();
  const { columns } = use(TileColumnsContext);
  return {
    width: Math.floor((width - TILE_PADDING * 2 - TILE_GAP * (columns - 1)) / columns),
    minHeight: TILE_MIN_HEIGHT,
  };
}

// The columns of a grid: 2 up to XL, 1 from XXL — from the text size only (TileColumnsProvider).
// inGrid: a TileTitle inside a grid ends a too-long name with "…" instead of shrinking further.
export type TileColumns = { columns: 1 | 2; reportTooLong: () => void; inGrid: boolean };

export const TileColumnsContext = createContext<TileColumns>({ columns: TILE_COLUMNS, reportTooLong: () => undefined, inGrid: false });

export function useTileColumns(): TileColumns {
  return use(TileColumnsContext);
}
