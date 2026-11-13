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

// From the first accessibility size (AX1, 28 pt body)
export const ACCESSIBILITY_TEXT_SCALE = 28 / 17 - 0.01;

// Small grids of 3 (the pages of a document): 3 per row on a phone of 360 pt or more at the default
// text (up to Large), 2 otherwise (a narrow phone, larger text: "Seite hinzufügen" needs the room),
// 1 from AX1
export function usePagesPerRow(): 1 | 2 | 3 {
  const { fontScale, width } = useWindowDimensions();
  if (fontScale >= ACCESSIBILITY_TEXT_SCALE) return 1;
  if (fontScale > 1.01 || width < 360) return 2;
  return 3;
}
