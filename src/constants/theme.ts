/**
 * The app colors, from docs/design-guide.md (Fondamenta grafiche). Sottomano is light only
 * (app.json userInterfaceStyle "light"), so there is one set: white pages with white cards
 * (a soft shadow sets them apart), lilac for fields and quiet buttons, indigo-lilac gradient
 * (constants/brand.ts) for the main actions.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C1E2E', // "Inchiostro": main text, icons
    background: '#FFFFFF', // every page
    surface: '#FFFFFF', // cards, tiles, sheets (white on white, with the card shadow)
    backgroundSelected: '#EEF0F5', // pressed rows; same as the separator
    textSecondary: '#6A6D80', // subtitles, labels, dates
    textOnLilac: '#4B4E63', // notes and explanations on paleLilac
    accent: '#3B4FE0', // links, active item, "Vedi tutto"
    indigo: '#4A3FD9', // icons and text on lilac
    lilac: '#F1EFFD', // round buttons, fields, inactive filters
    paleLilac: '#F7F6FE', // info boxes, notices
    separator: '#EEF0F5', // lines between the rows of a card
    switchOff: '#D6D8E4', // track of a switch that is off
    error: '#B42318', // destructive actions, "Da pagare" (on errorBackground)
    errorBackground: '#FDECEC',
    destructive: '#D92D20', // filled button of a delete confirmation
    success: '#0B6B4F', // "Pagata", confirmations (on successBackground)
    successBackground: '#E3F6EE',
    badge: '#E5243B', // dot with a number
    dashed: '#C9CCDA', // border of the dashed "add" tiles
    scrim: 'rgba(28, 30, 70, 0.38)', // dimmed page behind sheets and menus
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

// Spacing of the guide
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  side: 22, // left and right margin of every page
  section: 24, // between sections
  titleToContent: 12, // between a section title and its content
  tileGap: 14, // between cards and tiles
  belowContent: 124, // free space under the content, above the bottom bar
} as const;

// Corner radii of the guide (a pill is half its height: use Radius.pill)
export const Radius = {
  card: 22, // white cards, big Home squares
  tile: 20, // category and document tiles
  iconSquare: 13, // icon in a small square
  field: 16, // drop-down menus and boxed fields
  sheet: 32, // top corners of a bottom sheet
  dialog: 30, // centered confirmation
  glassBar: 34, // the glass bottom bar
  pill: 999,
} as const;

// Shadows of the guide (CSS boxShadow strings, React Native 0.76+)
export const Shadows = {
  card: '0 6px 22px rgba(28, 30, 70, 0.08)',
  sheet: '0 -10px 30px rgba(28, 30, 70, 0.15)',
  dialog: '0 20px 50px rgba(28, 30, 70, 0.25)',
} as const;

// Colored shadow under a gradient square (category tile), from the "r, g, b" of its color
export function tintedShadow(rgb: string): string {
  return `0 10px 20px rgba(${rgb}, 0.22)`;
}

// Smaller colored shadow under an icon in a square
export function iconShadow(rgb: string): string {
  return `0 6px 12px rgba(${rgb}, 0.22)`;
}

// A white card: white, rounded 22, soft shadow. Spread it into a style array.
export const CardSurface = {
  backgroundColor: Colors.light.surface,
  borderRadius: Radius.card,
  borderCurve: 'continuous',
  boxShadow: Shadows.card,
} as const;

// A row of a white card drawn row by row (SectionList sections cannot have a container, so no
// shared shadow): a thin separator-colored outline and rounded corners on the first and last row.
export function cardRowEdge(first: boolean, last: boolean) {
  const border = Colors.light.separator;
  return {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: border,
    ...(first && {
      borderTopWidth: 1,
      borderTopLeftRadius: Radius.card,
      borderTopRightRadius: Radius.card,
    }),
    ...(last && {
      borderBottomWidth: 1,
      borderBottomLeftRadius: Radius.card,
      borderBottomRightRadius: Radius.card,
    }),
  } as const;
}

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
