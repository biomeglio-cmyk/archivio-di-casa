import { getLocales } from 'expo-localization';
import Storage from 'expo-sqlite/kv-store';

// Impostazioni › Aspetto › Lingua, kept on the phone in the key-value store
export const LANGUAGE_KEY = 'app.language';

export const LANGUAGES = ['it', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
export type LanguageSetting = 'auto' | Language;

export function readLanguageSetting(): LanguageSetting {
  try {
    const saved = Storage.getItemSync(LANGUAGE_KEY);
    return saved === 'it' || saved === 'en' ? saved : 'auto';
  } catch {
    return 'auto';
  }
}

export function saveLanguageSetting(setting: LanguageSetting): void {
  try {
    Storage.setItemSync(LANGUAGE_KEY, setting);
  } catch {
    // the choice lasts until the app closes
  }
}

// "Automatica": the iPhone language when the app has it, otherwise English
export function resolveLanguage(setting: LanguageSetting): Language {
  if (setting !== 'auto') return setting;
  const code = getLocales()[0]?.languageCode;
  return LANGUAGES.find((l) => l === code) ?? 'en';
}

// ---- The setting, shared by every screen (like the palette) ----

let current: LanguageSetting | null = null;
const listeners = new Set<() => void>();

export function getLanguageSetting(): LanguageSetting {
  if (current === null) current = readLanguageSetting();
  return current;
}

export function subscribeLanguageSetting(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function storeLanguageSetting(setting: LanguageSetting): void {
  saveLanguageSetting(setting);
  current = setting;
  listeners.forEach((listener) => listener());
}
