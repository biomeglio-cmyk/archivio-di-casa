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

// A mix of a hex color with white: amount 0 = the color, 1 = white
export function mixWithWhite(hex: string, amount: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return '#FFFFFF';
  const value = parseInt(match[1], 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const r = mix((value >> 16) & 255);
  const g = mix((value >> 8) & 255);
  const b = mix(value & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

// The light tint of a category (round buttons, inactive chips of its screens) and the text on it:
// from the palette ("Sottomano"), or derived from the gradient end for the other palettes
export function categoryTint(colors: CategoryColors): { tint: string; onTint: string; dashed: string } {
  return {
    tint: colors.tint ?? mixWithWhite(colors.bottom, 0.86),
    onTint: categoryInk(colors),
    dashed: mixWithWhite(colors.bottom, 0.45), // border of its dashed "Nuovo…" tile
  };
}
