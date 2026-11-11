import type { CategoryColors } from '@/db/types';

// Whether a hex color (#RRGGBB) is light, by its perceived luminance: light text sits on a dark
// background (palette "Notte", a dark cover color), so what goes behind it must be dark too
export function isLightColor(hex: string): boolean {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return false;
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

// "r, g, b" of a hex color (#RRGGBB), for rgba() shadows
export function hexToRgb(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return '0, 0, 0';
  const value = parseInt(match[1], 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

// "r, g, b" of the colored shadow under a category tile: from the palette, or its gradient end
export function categoryShadowRgb(colors: CategoryColors): string {
  return colors.shadow ?? hexToRgb(colors.bottom);
}

// A category color that reads on white (calendar dots, small marks): the text on its tint, or
// its text color, or the gradient end when the text is light (white, palette "Notte")
export function categoryInk(colors: CategoryColors): string {
  return colors.onTint ?? (isLightColor(colors.text) ? colors.bottom : colors.text);
}
