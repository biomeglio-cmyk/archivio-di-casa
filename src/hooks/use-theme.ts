import { use, useMemo } from 'react';

import type { Palette } from '@/constants/theme';
import { ThemeContext } from '@/theme/theme-provider';

// The active colors (light or "Tema notte"); the component re-renders when the theme changes
export function useTheme(): Palette {
  return use(ThemeContext).palette;
}

// "Tema" of Impostazioni: the mode and how to change it
export function useThemeMode() {
  const { mode, setMode } = use(ThemeContext);
  return { mode, setMode };
}

// The styles of a component, built from the active colors: const styles = useThemedStyles(makeStyles)
export function useThemedStyles<T>(makeStyles: (palette: Palette) => T): T {
  const palette = useTheme();
  return useMemo(() => makeStyles(palette), [makeStyles, palette]);
}
