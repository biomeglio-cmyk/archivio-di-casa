import type { TextStyle } from 'react-native';

// Onest (Google Fonts, SIL OFL), loaded at runtime by useFonts in the root layout (so it works in
// Expo Go). Each weight is its own family: the keys below are the names useFonts registers.
export const FONTS = {
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semiBold: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
  // The "Sottomano" wordmark (Home header, opening screen, lock screen)
  wordmark: 'Onest_700Bold',
} as const;

const OUR_FAMILIES = new Set<string>(Object.values(FONTS));

// The Onest family for a fontWeight (a custom font has no weights of its own on iOS)
export function fontForWeight(weight: TextStyle['fontWeight']): string {
  const value = weight === 'bold' ? 700 : weight === 'normal' || weight === undefined ? 400 : Number(weight);
  if (value >= 700) return FONTS.bold;
  if (value >= 600) return FONTS.semiBold;
  if (value >= 500) return FONTS.medium;
  return FONTS.regular;
}

// Letter spacing of the guide: +0.02em on text, +0.005em on large titles, +0.1em on uppercase labels
export const TRACKING = { text: 0.02, largeTitle: 0.005, label: 0.1 } as const;
const LARGE_TITLE_SIZE = 28;

export function letterSpacingFor(fontSize: number, uppercase = false): number {
  const em = uppercase ? TRACKING.label : fontSize >= LARGE_TITLE_SIZE ? TRACKING.largeTitle : TRACKING.text;
  return Math.round(fontSize * em * 100) / 100;
}

// Onest family and guide letter spacing for a (flattened) text style. An explicit fontFamily that
// is not ours (the monospaced code font) or an explicit letterSpacing is kept as it is.
// Without a fontSize the spacing is computed on defaultSize (iOS body 17), or not set at all when
// defaultSize is undefined (a nested Text, which inherits it from its parent).
export function withOnest(style: TextStyle, defaultSize: number | undefined = 17): TextStyle {
  const { fontWeight, fontFamily, letterSpacing, textTransform } = style;
  const fontSize = style.fontSize ?? defaultSize;
  const ours = fontFamily === undefined || OUR_FAMILIES.has(fontFamily);
  return {
    ...style,
    ...(ours && { fontFamily: fontFamily ?? fontForWeight(fontWeight), fontWeight: undefined }),
    ...(letterSpacing === undefined &&
      fontSize !== undefined && { letterSpacing: letterSpacingFor(fontSize, textTransform === 'uppercase') }),
  };
}
