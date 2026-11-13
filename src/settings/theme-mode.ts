import Storage from 'expo-sqlite/kv-store';
import { Alert, Appearance, DevSettings } from 'react-native';

import { Colors, readThemeMode, THEME_KEY, type ThemeMode } from '@/constants/theme';

export { readThemeMode, type ThemeMode };

// The theme the app started with (the colors of every screen were built with it)
export const startedDark = Colors.current.isDark;

// Restarts the JavaScript so every screen is built again with the new colors. Possible in
// development (Expo Go); in an installed app without a reload module the new theme comes at the
// next opening, and we say so.
function restartForTheme(): void {
  if (__DEV__ && typeof DevSettings.reload === 'function') {
    DevSettings.reload('Tema');
    return;
  }
  Alert.alert('Tema', 'Il nuovo tema si vede alla prossima apertura di Sottomano.');
}

// "Tema" in Impostazioni: Automatico (follows the phone), Chiaro or Scuro
export function saveThemeMode(mode: ThemeMode): void {
  Storage.setItemSync(THEME_KEY, mode);
  Appearance.setColorScheme(mode === 'auto' ? 'unspecified' : mode);
  const dark = mode === 'auto' ? Appearance.getColorScheme() === 'dark' : mode === 'dark';
  if (dark !== startedDark) restartForTheme();
}

// "Automatico": the phone switched between light and dark while the app is open
export function followSystemTheme(): () => void {
  const subscription = Appearance.addChangeListener(({ colorScheme }) => {
    if (readThemeMode() !== 'auto') return;
    if ((colorScheme === 'dark') !== startedDark) restartForTheme();
  });
  return () => subscription.remove();
}
