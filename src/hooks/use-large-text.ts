import { useWindowDimensions } from 'react-native';

// iOS Dynamic Type sizes (body 17 pt): L 17 (the default), XL 19, XXL 21, XXXL 23, then the
// accessibility sizes. "Large text" = 2 steps or more above the default (XXL and up): grids go to
// one column, a row's leading icon goes on its own line above the title.
export const LARGE_TEXT_SCALE = 21 / 17 - 0.01; // XXL, with room for rounding

export function useLargeText(): boolean {
  return useWindowDimensions().fontScale >= LARGE_TEXT_SCALE;
}

// How many columns a grid gets: its usual number, or 1 with large text
export function useLayoutColumns(usual = 2): number {
  return useLargeText() ? 1 : usual;
}
