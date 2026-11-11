import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

// "Tema" in Aspetto: Automatico (follows the iPhone), Chiaro or Scuro. Kept in the key-value store.
// Applied in two ways, so the choice always works:
// 1. Appearance.setColorScheme: iOS draws the native parts (tab bar, sheets, alerts, pickers,
//    keyboard) in that style;
// 2. useColorScheme (src/hooks) reads this choice first, so every color of the app follows it
//    even where the native override is not honored (e.g. inside Expo Go).
export type ThemeMode = 'auto' | 'light' | 'dark';

const KEY = 'app.themeMode';
const MODES: ThemeMode[] = ['auto', 'light', 'dark'];

let current: ThemeMode | null = null;
const listeners = new Set<() => void>();

export function getThemeMode(): ThemeMode {
  if (current === null) {
    try {
      const saved = Storage.getItemSync(KEY);
      current = MODES.includes(saved as ThemeMode) ? (saved as ThemeMode) : 'auto';
    } catch {
      current = 'auto';
    }
  }
  return current;
}

function applyNative(mode: ThemeMode) {
  try {
    Appearance.setColorScheme(mode);
  } catch {
    // not supported: the app colors still follow the choice (point 2 above)
  }
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    Storage.setItemSync(KEY, mode);
  } catch {
    // kept for this session only
  }
  current = mode;
  applyNative(mode);
  listeners.forEach((listener) => listener());
}

// At launch, before the first screen: the saved choice
export function applySavedThemeMode(): void {
  const mode = getThemeMode();
  if (mode !== 'auto') applyNative(mode);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribe, getThemeMode);
}
