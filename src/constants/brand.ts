import { Colors } from '@/constants/theme';

// Brand identity of Sottomano (docs/design-guide.md)

// Accent: links, active items, icons of the rows
export const BRAND_COLOR = Colors.light.accent;

// Main gradient, 135° (top-left → bottom-right): "+", primary buttons, active filters,
// switches that are on, the selected day, the logo
export const BRAND_GRADIENT = ['#4A5CF0', '#8B6CF0'] as const;
export const GRADIENT_START = { x: 0, y: 0 } as const;
export const GRADIENT_END = { x: 1, y: 1 } as const;

// Shadow under anything drawn with the main gradient
export const BRAND_SHADOW = '0 10px 22px rgba(100, 90, 235, 0.28)';

// Destructive actions and expired dates (text; on Colors.light.errorBackground when filled soft)
export const DANGER_COLOR = Colors.light.error;

// "Preferiti" heart
export const PIN_COLOR = Colors.light.accent;
