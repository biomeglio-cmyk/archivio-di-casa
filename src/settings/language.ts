// i18n-ignore-file: language names are written in each language itself, never translated
import { getLocales } from 'expo-localization';
import Storage from 'expo-sqlite/kv-store';

// Impostazioni › Aspetto › Lingua, kept on the phone in the key-value store
export const LANGUAGE_KEY = 'app.language';

// The languages of the app: code (as in src/i18n/<code>.json), name in the language itself,
// English name (for the search) and the Intl locale for dates and numbers
export const LANGUAGE_INFO = [
  { code: 'it', name: 'Italiano', english: 'Italian', locale: 'it-IT' },
  { code: 'en', name: 'English', english: 'English', locale: 'en-GB' },
  { code: 'es', name: 'Español', english: 'Spanish', locale: 'es-ES' },
  { code: 'fr', name: 'Français', english: 'French', locale: 'fr-FR' },
  { code: 'de', name: 'Deutsch', english: 'German', locale: 'de-DE' },
  { code: 'pt-PT', name: 'Português (Portugal)', english: 'Portuguese (Portugal)', locale: 'pt-PT' },
  { code: 'pt-BR', name: 'Português (Brasil)', english: 'Portuguese (Brazil)', locale: 'pt-BR' },
  { code: 'nl', name: 'Nederlands', english: 'Dutch', locale: 'nl-NL' },
  { code: 'pl', name: 'Polski', english: 'Polish', locale: 'pl-PL' },
  { code: 'sv', name: 'Svenska', english: 'Swedish', locale: 'sv-SE' },
  { code: 'da', name: 'Dansk', english: 'Danish', locale: 'da-DK' },
  { code: 'nb', name: 'Norsk bokmål', english: 'Norwegian', locale: 'nb-NO' },
  { code: 'fi', name: 'Suomi', english: 'Finnish', locale: 'fi-FI' },
  { code: 'cs', name: 'Čeština', english: 'Czech', locale: 'cs-CZ' },
  { code: 'sk', name: 'Slovenčina', english: 'Slovak', locale: 'sk-SK' },
  { code: 'hu', name: 'Magyar', english: 'Hungarian', locale: 'hu-HU' },
  { code: 'ro', name: 'Română', english: 'Romanian', locale: 'ro-RO' },
  { code: 'el', name: 'Ελληνικά', english: 'Greek', locale: 'el-GR' },
  { code: 'hr', name: 'Hrvatski', english: 'Croatian', locale: 'hr-HR' },
  { code: 'sl', name: 'Slovenščina', english: 'Slovenian', locale: 'sl-SI' },
  { code: 'uk', name: 'Українська', english: 'Ukrainian', locale: 'uk-UA' },
  { code: 'ru', name: 'Русский', english: 'Russian', locale: 'ru-RU' },
  { code: 'tr', name: 'Türkçe', english: 'Turkish', locale: 'tr-TR' },
  { code: 'ca', name: 'Català', english: 'Catalan', locale: 'ca-ES' },
] as const;

export type Language = (typeof LANGUAGE_INFO)[number]['code'];
export type LanguageSetting = 'auto' | Language;
export const LANGUAGES: readonly Language[] = LANGUAGE_INFO.map((l) => l.code);

export function isLanguage(value: string | null | undefined): value is Language {
  return LANGUAGES.some((l) => l === value);
}

export function languageInfo(code: Language) {
  return LANGUAGE_INFO.find((l) => l.code === code) ?? LANGUAGE_INFO[1];
}

export function readLanguageSetting(): LanguageSetting {
  try {
    const saved = Storage.getItemSync(LANGUAGE_KEY);
    return isLanguage(saved) ? saved : 'auto';
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

// The app language for an iPhone language (languageCode "pt", regionCode "BR"…), or null
export function languageForLocale(languageCode: string | null | undefined, regionCode?: string | null): Language | null {
  if (!languageCode) return null;
  const code = languageCode.toLowerCase();
  if (code === 'pt') return regionCode?.toUpperCase() === 'BR' ? 'pt-BR' : 'pt-PT';
  if (code === 'no' || code === 'nn' || code === 'nb') return 'nb';
  return isLanguage(code) ? code : null;
}

// "Automatica": the iPhone language when the app has it, otherwise English
export function resolveLanguage(setting: LanguageSetting): Language {
  if (setting !== 'auto') return setting;
  const locale = getLocales()[0];
  // The region of the language itself ("pt-BR") before the region of the phone
  return languageForLocale(locale?.languageCode, locale?.languageRegionCode ?? locale?.regionCode) ?? 'en';
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
