import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useThemeMode } from '@/settings/theme-mode';

// The scheme the app is drawn in: the "Tema" chosen in Aspetto, or the iPhone's with "Automatico".
// Every color of the app goes through here (useTheme, the navigation theme, the status bar).
export function useColorScheme(): 'light' | 'dark' {
  const mode = useThemeMode();
  const system = useSystemColorScheme();
  if (mode !== 'auto') return mode;
  return system === 'dark' ? 'dark' : 'light';
}
