// Brand identity of Sottomano

// Main brand color (active tab, accents)
export const BRAND_COLOR = '#FF4F64';

// Logo gradient, used for primary buttons (from start to end)
export const BRAND_GRADIENT = ['#FF8A5B', '#FF3D6E'] as const;

// iOS-like red for destructive actions and expired dates
export const DANGER_COLOR = '#E5383B';

// Font family names, as registered by useFonts in the root layout
// (only the weights loaded in src/app/_layout.tsx are available)
export const FONTS = {
  titleMedium: 'Outfit_500Medium',
  titleSemiBold: 'Outfit_600SemiBold',
  titleBold: 'Outfit_700Bold',
  // ONLY for the "Sottomano" wordmark (Home header, opening screen, lock screen). A static
  // instance of Fraunces (SIL OFL, see assets/fonts/OFL-Fraunces.txt): wght 900, opsz 144,
  // SOFT 100, WONK 0, renamed "Fraunces Sottomano" as the license asks for modified versions.
  wordmark: 'FrauncesSottomano_Black',
} as const;

// "Preferiti" heart (the brand red)
export const PIN_COLOR = '#FF4F64';
