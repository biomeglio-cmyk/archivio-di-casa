import type { Palette } from '@/constants/theme';
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
  if (colors.isNight) return '0, 0, 0'; // night tiles: no colored glow, the border sets them apart
  return colors.shadow ?? hexToRgb(colors.bottom);
}

// A category color that reads on white (calendar dots, small marks): the text on its tint, or
// its text color, or the gradient end when the text is light (white, palette "Notte")
export function categoryInk(colors: CategoryColors, p: Palette): string {
  if (p.isDark) return colors.darkOnTint ?? darkTintOf(colors.bottom).onTint; // reads on the dark pages
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
export function categoryTint(colors: CategoryColors, p: Palette): { tint: string; onTint: string; dashed: string } {
  // "Tema notte": the tint and text of the design guide, or derived the same way
  if (p.isDark) {
    const derived = darkTintOf(colors.bottom);
    return {
      tint: colors.darkTint ?? derived.tint,
      onTint: colors.darkOnTint ?? derived.onTint,
      dashed: `rgba(${hexToRgb(colors.bottom)}, 0.45)`,
    };
  }
  return {
    tint: colors.tint ?? mixWithWhite(colors.bottom, 0.86),
    onTint: categoryInk(colors, p),
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

function hslHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))))
      .toString(16)
      .padStart(2, '0');
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

// "Tema notte" for a color the guide doesn't list (other palettes, "Il tuo colore"): a dark tint of
// its hue with the lightness of the guide's tints, and a light text of the same hue
export function darkTintOf(hex: string): { tint: string; onTint: string } {
  const { hue, radius } = hexToWheel(hex);
  const saturation = Math.max(0.25, Math.min(0.55, radius)); // grey colors stay grey
  return { tint: hslHex(hue, saturation * 0.6, 0.15), onTint: hslHex(hue, 0.9, 0.78) };
}

// ---- Contrast (WCAG 2) ----

function luminance(hex: string): number {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return 0;
  const value = parseInt(match[1], 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((value >> 16) & 255) + 0.7152 * channel((value >> 8) & 255) + 0.0722 * channel(value & 255);
}

// Contrast ratio of two hex colors: 1 (same) … 21 (black on white). WCAG AA: 4.5 text, 3 large text/icons
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const AA_TEXT = 4.5;
const INK = '#1C1E2E'; // the design ink
const readableCache = new Map<string, CategoryColors>();

// The colors of a tile with its name (17 pt) readable at WCAG AA on the whole gradient: the design
// text if it already reads; otherwise the design ink (dark text on the pastel tiles); otherwise
// the same gradient a little darker, until white text reads.
export function readableColors(colors: CategoryColors): CategoryColors {
  const key = `${colors.top}|${colors.bottom}|${colors.text}`;
  const cached = readableCache.get(key);
  if (cached) return cached;
  const reads = (text: string, top = colors.top, bottom = colors.bottom) =>
    Math.min(contrastRatio(text, top), contrastRatio(text, bottom)) >= AA_TEXT;
  let result: CategoryColors = colors;
  if (!reads(colors.text)) {
    if (reads(INK)) result = { ...colors, text: INK };
    else {
      const [top, bottom] = readableGradient([colors.top, colors.bottom]);
      result = { ...colors, top, bottom, text: '#FFFFFF' };
    }
  }
  readableCache.set(key, result);
  return result;
}

// A gradient under white text, darkened just enough for WCAG AA (unchanged if it already reads)
export function readableGradient([top, bottom]: readonly [string, string]): [string, string] {
  for (let amount = 0; amount <= 0.6; amount += 0.02) {
    const pair: [string, string] = [mixWithBlack(top, amount), mixWithBlack(bottom, amount)];
    if (Math.min(contrastRatio('#FFFFFF', pair[0]), contrastRatio('#FFFFFF', pair[1])) >= AA_TEXT) return pair;
  }
  return [mixWithBlack(top, 0.6), mixWithBlack(bottom, 0.6)];
}

// Text on a solid color (cover, card): dark ink or white, whichever reads better
export function textOn(background: string): string {
  return contrastRatio(INK, background) >= contrastRatio('#FFFFFF', background) ? INK : '#FFFFFF';
}

// ---- Night tiles ("Pastello" in Tema notte) ----

// A hex color with its HSL lightness raised by `points` (0–100)
export function lighten(hex: string, points: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const value = parseInt(match[1], 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  l = Math.min(1, l + points / 100);
  const hue = (p: number, q: number, t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const out = s === 0 ? [l, l, l] : [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)];
  return `#${out.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

// The night tile of a category from its Tema notte pair: dark tint (+6 % lightness at the top) and
// the light text on it
export function nightTileOf(darkTint: string, darkOnTint: string): { top: string; bottom: string; text: string } {
  return { top: lighten(darkTint, 6), bottom: darkTint, text: darkOnTint };
}

// The colors to draw in the active theme: a palette with a night variant uses it in Tema notte
export function forTheme(colors: CategoryColors, dark: boolean): CategoryColors {
  if (!dark || !colors.night) return colors;
  return { ...colors, ...colors.night, shadow: undefined, isNight: true };
}

// Border of a tile: night tiles get the 1 px white 7 % of the other night cards
export function tileFrame(colors: CategoryColors): { borderWidth: number; borderColor: string } | null {
  return colors.isNight ? { borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.07)' } : null;
}

// Direction of a tile gradient: 135° by day, a soft vertical one for the night tiles
export function tileGradientPoints(colors: CategoryColors): { start: { x: number; y: number }; end: { x: number; y: number } } {
  return colors.isNight ? { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } } : { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
}
