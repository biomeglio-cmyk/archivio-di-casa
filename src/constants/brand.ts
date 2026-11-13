import { Colors, onTheme } from '@/constants/theme';

// Brand identity of Sottomano (docs/design-guide.md)

// Accent: links, active items, icons of the rows
export let BRAND_COLOR = '';

// Main gradient, 135° (top-left → bottom-right): "+", primary buttons, active filters,
// switches that are on, the selected day, the logo
export const BRAND_GRADIENT = ['#4A5CF0', '#8B6CF0'] as const;
export const GRADIENT_START = { x: 0, y: 0 } as const;
export const GRADIENT_END = { x: 1, y: 1 } as const;

// Shadow under anything drawn with the main gradient
export const BRAND_SHADOW = '0 10px 22px rgba(100, 90, 235, 0.28)';

// Destructive actions and expired dates (text; on Colors.current.errorBackground when filled soft)
export let DANGER_COLOR = '';

// "Preferiti" heart
export let PIN_COLOR = '';

// Light tint behind the heart (Aggiungi ai preferiti): the Salute tint of the guide, light / notte
export let PIN_TINT = '';

// The values above follow the theme (refreshed when it changes)
onTheme(() => {
  BRAND_COLOR = Colors.current.accent;
  DANGER_COLOR = Colors.current.error;
  PIN_COLOR = Colors.current.accent;
  PIN_TINT = Colors.current.isDark ? '#3A1A28' : '#FDEBF1';
});
