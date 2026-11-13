import type { Palette } from '@/constants/theme';

// Brand identity of Sottomano (docs/design-guide.md)

// Accent: links, active items, icons of the rows
export const BRAND_COLOR = (p: Palette) => p.accent;

// Main gradient, 135° (top-left → bottom-right): "+", primary buttons, active filters,
// switches that are on, the selected day, the logo
export const BRAND_GRADIENT = ['#4A5CF0', '#7558E6'] as const; // white text 4.9:1 at both ends (WCAG AA)
export const GRADIENT_START = { x: 0, y: 0 } as const;
export const GRADIENT_END = { x: 1, y: 1 } as const;

// Shadow under anything drawn with the main gradient
export const BRAND_SHADOW = '0 10px 22px rgba(100, 90, 235, 0.28)';

// Destructive actions and expired dates (text; on the errorBackground of the palette when filled soft)
export const DANGER_COLOR = (p: Palette) => p.error;

// "Preferiti" heart
export const PIN_COLOR = (p: Palette) => p.accent;

// Light tint behind the heart (Aggiungi ai preferiti): the Salute tint of the guide, light / notte
export const PIN_TINT = (p: Palette) => (p.isDark ? '#3A1A28' : '#FDEBF1');
