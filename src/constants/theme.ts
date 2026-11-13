/**
 * The app colors, from docs/design-guide.md (Fondamenta grafiche): white pages with white cards
 * (a soft shadow sets them apart), lilac for fields and quiet buttons, indigo-lilac gradient
 * (constants/brand.ts) for the main actions; and the dark theme of the Impostazioni design (cards
 * with a thin border instead of shadows). Both sets have the same keys.
 *
 * `Colors.current` is ONE object, updated in place when the theme changes (Impostazioni › Aspetto ›
 * Tema; Automatico follows the phone). Styles are built from it lazily, once per theme
 * (`themedStyles`), and module values that depend on it are refreshed with `onTheme`; then the
 * screens are mounted again (settings/theme-mode.ts). Nothing is reloaded: fonts and assets stay.
 */

import '@/global.css';

import Storage from 'expo-sqlite/kv-store';
import { Appearance, Platform } from 'react-native';

const LIGHT = {
  isDark: false,
  text: '#1C1E2E', // "Inchiostro": main text, icons
  background: '#FFFFFF', // every page
  surface: '#FFFFFF', // cards, tiles, sheets (white on white, with the card shadow)
  backgroundSelected: '#EEF0F5', // pressed rows; same as the separator
  elevated: '#F4F5F8', // neutral fills inside a card (type buttons, inactive icons)
  cardBorder: 'transparent', // light: cards are set apart by their shadow
  textSecondary: '#6A6D80', // subtitles, labels, dates
  textOnLilac: '#4B4E63', // notes and explanations on paleLilac
  placeholder: '#8A8DA0', // placeholder text of the fields
  iconGrey: '#4B5068', // grey icons (eye, copy, inactive choices)
  accent: '#3B4FE0', // links, active item, "Vedi tutto"
  indigo: '#4A3FD9', // icons and text on lilac
  lilac: '#F1EFFD', // round buttons, fields, inactive filters
  paleLilac: '#F7F6FE', // info boxes, notices
  separator: '#EEF0F5', // lines between the rows of a card
  switchOff: '#D6D8E4', // track of a switch that is off
  segmentedActive: '#FFFFFF', // the chosen segment (a white pill)
  segmentedActiveText: '#4A3FD9',
  error: '#B42318', // destructive actions, "Da pagare" (on errorBackground)
  errorBackground: '#FDECEC',
  destructive: '#D92D20', // filled button of a delete confirmation
  success: '#0B6B4F', // "Pagata", confirmations (on successBackground)
  successBackground: '#E3F6EE',
  badge: '#E5243B', // dot with a number
  heart: '#E8457A', // the favorites heart
  dashed: '#C9CCDA', // border of the dashed "add" tiles
  scrim: 'rgba(28, 30, 70, 0.38)', // dimmed page behind sheets and menus
};

// "Tema notte" of docs/design-guide.md: the official dark palette
const DARK: typeof LIGHT = {
  isDark: true,
  text: '#F2F3FA',
  background: '#0F1020',
  surface: '#1B1D33',
  backgroundSelected: '#24263F',
  elevated: '#24263F',
  cardBorder: 'rgba(255, 255, 255, 0.07)',
  textSecondary: '#A3A6BD',
  textOnLilac: '#C3C5D9',
  placeholder: '#6F7290',
  iconGrey: '#B4B7CC',
  accent: '#8E9BFF',
  indigo: '#B3A8FF',
  lilac: '#262849',
  paleLilac: '#1F2140',
  separator: '#2C2F4D',
  switchOff: '#3A3D5C',
  segmentedActive: '#1B1D33',
  segmentedActiveText: '#F2F3FA',
  error: '#FF8A80',
  errorBackground: '#3A1A1E',
  destructive: '#D92D20',
  success: '#7FE0BC',
  successBackground: '#15332A',
  badge: '#FF4D5E',
  heart: '#FF6F9B',
  dashed: '#4A4D6E',
  scrim: 'rgba(0, 0, 0, 0.55)',
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
export function isDarkMode(mode: ThemeMode): boolean {
  return (mode === 'auto' ? Appearance.getColorScheme() : mode) === 'dark';
}

// At start: tell iOS (tab bar, system sheets, alerts follow it), then pick the set
function startTheme(): typeof LIGHT {
  const mode = readThemeMode();
  Appearance.setColorScheme(mode === 'auto' ? 'unspecified' : mode);
  return { ...(isDarkMode(mode) ? DARK : LIGHT) };
}

export const Colors = {
  current: startTheme(), // mutable: always the active set
} as const;

const listeners = new Set<() => void>();

// A module value that depends on the theme: computed now and again at every change
export function onTheme(refresh: () => void): void {
  refresh();
  listeners.add(refresh);
}

// Switches the colors in place and refreshes the module values (the caller mounts the screens again)
export function setDarkColors(dark: boolean): void {
  if (Colors.current.isDark === dark) return;
  Object.assign(Colors.current, dark ? DARK : LIGHT);
  listeners.forEach((refresh) => refresh());
}

// A StyleSheet built lazily from the active colors, once per theme; used exactly like the object
// StyleSheet.create returns (styles.row), the values follow the theme
export function themedStyles<T extends object>(factory: () => T): T {
  const cache: { light?: T; dark?: T } = {};
  const current = () => {
    const key = Colors.current.isDark ? 'dark' : 'light';
    return (cache[key] ??= factory());
  };
  return new Proxy({} as T, {
    get: (_, property) => current()[property as keyof T],
    has: (_, property) => property in current(),
    ownKeys: () => Reflect.ownKeys(current()),
    getOwnPropertyDescriptor: (_, property) => Reflect.getOwnPropertyDescriptor(current(), property),
  });
}

// A section tint and the text on it, light and "Tema notte" values (design guide)
export function softTint(light: string, dark: string): string {
  return Colors.current.isDark ? dark : light;
}

export function onSoftTint(light: string, dark: string): string {
  return Colors.current.isDark ? dark : light;
}

export type ThemeColor = Exclude<keyof typeof Colors.current, 'isDark'>;

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
  get card() {
    return Colors.current.isDark ? 'none' : '0 6px 22px rgba(28, 30, 70, 0.08)'; // dark: a border instead
  },
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
// (getters: spread inside a themed style, it takes the active colors)
export const CardSurface = {
  get backgroundColor() {
    return Colors.current.surface;
  },
  borderRadius: Radius.card,
  borderCurve: 'continuous' as const,
  get boxShadow() {
    return Shadows.card;
  },
  get borderWidth() {
    return Colors.current.isDark ? 1 : 0; // dark: a 1px border, white 7%, instead of the shadow
  },
  get borderColor() {
    return Colors.current.cardBorder;
  },
};

// A row of a white card drawn row by row (SectionList sections cannot have a container, so no
// shared shadow): a thin separator-colored outline and rounded corners on the first and last row.
export function cardRowEdge(first: boolean, last: boolean) {
  const border = Colors.current.separator;
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
