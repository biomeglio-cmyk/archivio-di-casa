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
  return colors.onTint ?? (isLightColor(colors.text) ? mixWithBlack(colors.bottom, 0.25) : colors.text);
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

// A mix of a hex color with black: amount 0 = the color, 1 = black
export function mixWithBlack(hex: string, amount: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return '#000000';
  const value = parseInt(match[1], 16);
  const mix = (channel: number) => Math.round(channel * (1 - amount));
  const r = mix((value >> 16) & 255);
  const g = mix((value >> 8) & 255);
  const b = mix(value & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

// "Il tuo colore" of a category: the whole set from one hex. The gradient goes from a lighter
// version to the color itself; text and icons white (dark on a very light color); the light tint
// and the text on it derived from it.
export function colorsFromHex(hex: string): CategoryColors {
  const light = isLightColor(hex);
  return {
    top: mixWithWhite(hex, 0.25),
    bottom: hex.toUpperCase(),
    text: light ? '#1C1E2E' : '#FFFFFF',
    shadow: hexToRgb(hex),
    tint: mixWithWhite(hex, 0.86),
    onTint: mixWithBlack(hex, light ? 0.55 : 0.3),
  };
}

// Where a hex sits on the color wheel (hue 0–360, distance 0 white – 1 full color), so the marker
// starts on a color chosen before or typed as a code
export function hexToWheel(hex: string): { hue: number; radius: number } {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return { hue: 220, radius: 0.85 };
  const value = parseInt(match[1], 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
  }
  return { hue, radius: Math.min(1, Math.max(0, (1 - lightness) * 2)) };
}
