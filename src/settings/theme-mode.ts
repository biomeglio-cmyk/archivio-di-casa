import { router } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { Appearance } from 'react-native';

import { reloadApp } from '@/backup/app-reload';
import { Colors, isDarkMode, readThemeMode, setDarkColors, THEME_KEY, type ThemeMode } from '@/constants/theme';

export { readThemeMode, type ThemeMode };

// Live, without any reload of the JavaScript (fonts and assets stay as they are): iOS is told the
// scheme (tab bar, sheets, alerts follow it), our colors switch in place (constants/theme.ts), then
// the screens are mounted again with the new colors (the same remount as after a restore).
function applyDark(dark: boolean, backToSettings: boolean): void {
  if (Colors.current.isDark === dark) return;
  setDarkColors(dark);
  reloadApp();
  // The remount starts again from Home: go back to Impostazioni, where the choice was made
  if (backToSettings) setTimeout(() => router.push('/settings'), 0);
}

// "Tema" in Impostazioni: Automatico (follows the phone), Chiaro or Scuro
export function saveThemeMode(mode: ThemeMode): void {
  Storage.setItemSync(THEME_KEY, mode);
  Appearance.setColorScheme(mode === 'auto' ? 'unspecified' : mode);
  applyDark(isDarkMode(mode), true);
}

// "Automatico": the phone switched between light and dark while the app is open
export function followSystemTheme(): () => void {
  const subscription = Appearance.addChangeListener(({ colorScheme }) => {
    if (readThemeMode() !== 'auto') return;
    applyDark(colorScheme === 'dark', false);
  });
  return () => subscription.remove();
}
