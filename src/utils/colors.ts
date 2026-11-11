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
