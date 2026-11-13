import Storage from 'expo-sqlite/kv-store';
import { createContext, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { DARK, LIGHT, readThemeMode, THEME_KEY, type Palette, type ThemeMode } from '@/constants/theme';

type ThemeState = {
  palette: Palette; // the active colors: light or "Tema notte" (docs/design-guide.md)
  mode: ThemeMode; // Impostazioni › Aspetto › Tema
  setMode: (mode: ThemeMode) => void;
};

export const ThemeContext = createContext<ThemeState>({ palette: LIGHT, mode: 'auto', setMode: () => undefined });

// Tells iOS the scheme, so the tab bar, the sheets and the alerts follow it too
function applyToSystem(mode: ThemeMode) {
  Appearance.setColorScheme(mode === 'auto' ? 'unspecified' : mode);
}

applyToSystem(readThemeMode()); // at start, before the first screen

// The theme of the whole app: our setting, and the phone (useColorScheme) for "Automatico".
// Changing it re-renders in place: the screens stay where they are, with the same stack.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(readThemeMode);
  const dark = mode === 'auto' ? system === 'dark' : mode === 'dark';
  const palette = dark ? DARK : LIGHT;

  function setMode(next: ThemeMode) {
    try {
      Storage.setItemSync(THEME_KEY, next);
    } catch {
      // the choice lasts until the app closes
    }
    applyToSystem(next);
    setModeState(next);
  }

  return <ThemeContext value={{ palette, mode, setMode }}>{children}</ThemeContext>;
}
