/**
 * The app colors, from docs/design-guide.md (Fondamenta grafiche): white pages with white cards
 * (a soft shadow sets them apart), lilac for fields and quiet buttons, indigo-lilac gradient
 * (constants/brand.ts) for the main actions; and the dark theme of the Impostazioni design (cards
 * with a thin border instead of shadows). Both sets have the same keys.
 *
 * The active set comes from the ThemeProvider (theme/theme-provider.tsx: Impostazioni › Aspetto ›
 * Tema, Automatico follows the phone): components read it with useTheme() and build their styles
 * with useThemedStyles(makeStyles). Nothing here is fixed at load: switching re-renders in place.
 */

import '@/global.css';

import Storage from 'expo-sqlite/kv-store';
import { Appearance, Platform } from 'react-native';

export type Palette = typeof LIGHT;

export const LIGHT = {
  isDark: false,
  text: '#1C1E2E', // "Inchiostro": main text, icons
  background: '#FFFFFF', // every page
  surface: '#FFFFFF', // cards, tiles, sheets (white on white, with the card shadow)
  backgroundSelected: '#EEF0F5', // pressed rows; same as the separator
  elevated: '#F4F5F8', // neutral fills inside a card (type buttons, inactive icons)
  cardBorder: 'transparent', // light: cards are set apart by their shadow
  textSecondary: '#6A6D80', // subtitles, labels, dates
  textOnLilac: '#4B4E63', // notes and explanations on paleLilac
  placeholder: '#676A7F', // placeholder text of the fields (4.5:1 on lilac)
  iconGrey: '#4B5068', // grey icons (eye, copy, inactive choices)
  accent: '#3B4FE0', // links, active item, "Vedi tutto"
  indigo: '#4A3FD9', // icons and text on lilac
  lilac: '#F1EFFD', // round buttons, fields, inactive filters
  paleLilac: '#F7F6FE', // info boxes, notices
  separator: '#EEF0F5', // lines between the rows of a card
  switchOff: '#8E91A8', // track of a switch that is off (3:1 on white, WCAG non-text)
  segmentedActive: '#FFFFFF', // the chosen segment (a white pill)
  segmentedActiveText: '#4A3FD9',
  error: '#B42318', // destructive actions, "Da pagare" (on errorBackground)
  errorBackground: '#FDECEC',
  destructive: '#D92D20', // filled button of a delete confirmation
  success: '#0B6B4F', // "Pagata", confirmations (on successBackground)
  successBackground: '#E3F6EE',
  badge: '#E5243B', // dot with a number
  heart: '#E8457A', // the favorites heart
  dashed: '#8E91A8', // border of the dashed "add" tiles (3:1 on white, WCAG non-text)
  scrim: 'rgba(28, 30, 70, 0.38)', // dimmed page behind sheets and menus
  menuIcon: '#1C1E2E', // icons of the side menu rows
  menuActive: '#F1EFFD', // the current screen in the side menu
  gradient: ['#4A5CF0', '#7558E6'] as readonly [string, string], // main gradient (white text 4.9:1)
  brandShadow: '0 10px 22px rgba(100, 90, 235, 0.28)', // glow under anything in the main gradient
  glass: null as null | { top: string; bottom: string; border: string }, // menus and sheets: plain surface
  glow: null as null | string, // indigo light at the top of the screen (Tema notte only)
};

// "Tema notte (v2)" of docs/design-guide.md: the night palette of the design
export const DARK: Palette = {
  isDark: true,
  text: '#EEEFF8', // primary text and icons
  background: '#0D0E1C', // every page (with the indigo glow at the top)
  surface: '#17182C', // cards ("Scheda")
  backgroundSelected: '#212339',
  elevated: '#212339', // inactive choices
  cardBorder: 'rgba(255, 255, 255, 0.07)', // the card shadow becomes a 1 px light line
  textSecondary: '#9C9FBA',
  textOnLilac: '#C7C9DD', // text on the soft boxes
  placeholder: '#898BA4',
  iconGrey: '#B4B7CC',
  accent: '#A99CFF', // links, active item
  indigo: '#B8ADFF', // indigo text and icons
  lilac: '#212339', // round buttons, fields, inactive choices
  paleLilac: '#1C1D34', // soft boxes
  separator: '#25273F',
  switchOff: '#5E62A2',
  segmentedActive: '#17182C',
  segmentedActiveText: '#EEEFF8',
  error: '#FF8F8F', // "Da pagare" (on errorBackground)
  errorBackground: '#3A1A24',
  destructive: '#D92D20',
  success: '#6FDCB2', // "Pagata" (on successBackground)
  successBackground: '#123228',
  badge: '#E0263B', // notification dot
  heart: '#FF6F9B',
  dashed: '#5D6199', // design #595D92, raised a touch for 3:1 on the cards
  scrim: 'rgba(0, 0, 0, 0.55)', // behind sheets
  menuIcon: '#C7C9DD',
  menuActive: 'rgba(169, 156, 255, 0.16)', // lilac #A99CFF at 16 %
  gradient: ['#4F5CF2', '#7A55F0'],
  brandShadow: '0 14px 32px rgba(100, 90, 235, 0.45)', // 45 %, wider
  // Side menu, quick menu and action sheets: dense glass over a strong blur
  glass: { top: 'rgba(36, 38, 68, 0.94)', bottom: 'rgba(22, 23, 44, 0.92)', border: 'rgba(255, 255, 255, 0.1)' },
  glow: 'rgba(98, 104, 255, 0.16)',
};


// "Tema" of Impostazioni: kept on the phone
export type ThemeMode = 'auto' | 'light' | 'dark';
export const THEME_KEY = 'app.theme';

export function readThemeMode(): ThemeMode {
  try {
    const saved = Storage.getItemSync(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'auto';
  } catch {
    return 'auto';
  }
}

// Whether a mode is dark now: Automatico asks the phone
export function isDarkMode(mode: ThemeMode, system: string | null | undefined = Appearance.getColorScheme()): boolean {
  return (mode === 'auto' ? system : mode) === 'dark';
}

// iOS "Aumenta contrasto": the same palettes with stronger greys, accents and visible borders
export const LIGHT_HIGH_CONTRAST: Palette = {
  ...LIGHT,
  textSecondary: '#4B4E63',
  textOnLilac: '#33364A',
  placeholder: '#55586D',
  iconGrey: '#33374D',
  accent: '#2A3CC8',
  indigo: '#3A2FC0',
  segmentedActiveText: '#3A2FC0',
  separator: '#C9CCDA',
  cardBorder: '#C9CCDA',
  dashed: '#8E91A8',
  switchOff: '#6E7193',
  error: '#8F1A12',
  success: '#075239',
};

export const DARK_HIGH_CONTRAST: Palette = {
  ...DARK,
  textSecondary: '#CDCFE0',
  textOnLilac: '#DDDFEE',
  placeholder: '#B4B7CC',
  iconGrey: '#D2D4E4',
  accent: '#B4BDFF',
  indigo: '#CEC6FF',
  separator: '#4A4D6E',
  cardBorder: 'rgba(255, 255, 255, 0.3)',
  dashed: '#8E91A8',
  switchOff: '#8E91A8',
  error: '#FFB4AC',
  success: '#A8F0D4',
};

// A section tint and the text on it, light and "Tema notte" values (design guide)
export function softTint(p: Palette, light: string, dark: string): string {
  return p.isDark ? dark : light;
}

export function onSoftTint(p: Palette, light: string, dark: string): string {
  return p.isDark ? dark : light;
}

// The color tokens (strings), for themeColor props
export type ThemeColor = { [K in keyof Palette]: Palette[K] extends string ? K : never }[keyof Palette];

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
  sheet: '0 -10px 30px rgba(28, 30, 70, 0.15)',
  dialog: '0 20px 50px rgba(28, 30, 70, 0.25)',
} as const;

// The shadow of a white card; on the dark theme a border instead (cardSurface)
export function cardShadow(p: Palette): string {
  return p.isDark ? 'none' : '0 6px 22px rgba(28, 30, 70, 0.08)';
}

// Colored shadow under a gradient square (category tile), from the "r, g, b" of its color
export function tintedShadow(rgb: string): string {
  return `0 10px 20px rgba(${rgb}, 0.22)`;
}

// Smaller colored shadow under an icon in a square
export function iconShadow(rgb: string): string {
  return `0 6px 12px rgba(${rgb}, 0.22)`;
}

// A white card: white, rounded 22, soft shadow. Spread it into a style array.
export function cardSurface(p: Palette) {
  return {
    backgroundColor: p.surface,
    borderRadius: Radius.card,
    borderCurve: 'continuous' as const,
    boxShadow: cardShadow(p),
    borderWidth: p.isDark ? 1 : 0, // dark: a 1px border, white 7%, instead of the shadow
    borderColor: p.cardBorder,
  };
}

// A row of a white card drawn row by row (SectionList sections cannot have a container, so no
// shared shadow): a thin separator-colored outline and rounded corners on the first and last row.
export function cardRowEdge(first: boolean, last: boolean, p: Palette) {
  const border = p.separator;
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
