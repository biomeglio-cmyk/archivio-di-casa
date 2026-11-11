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

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
