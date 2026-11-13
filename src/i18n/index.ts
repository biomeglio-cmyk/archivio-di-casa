import { createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import { readLanguageSetting, resolveLanguage, type Language } from '@/settings/language';

import en from './en.json';
import it from './it.json';

// Plurals need Intl.PluralRules: if the engine lacks it, the rules of our two languages
// (1 → "one", everything else → "other") are enough.
if (typeof Intl.PluralRules === 'undefined') {
  class PluralRules {
    select(n: number) {
      return n === 1 ? 'one' : 'other';
    }
    resolvedOptions() {
      return { pluralCategories: ['one', 'other'] };
    }
  }
  (Intl as unknown as { PluralRules: unknown }).PluralRules = PluralRules;
}

// Italian is the source language; English is the fallback for any missing key
const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources: { it: { translation: it }, en: { translation: en } },
  lng: resolveLanguage(readLanguageSetting()),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
  initAsync: false, // resources are bundled: ready before the first screen
});

export default i18n;

// For code outside components (alerts in actions, notifications, PDF, backup)
export const t = i18n.t.bind(i18n);

export function currentLanguage(): Language {
  return i18n.language === 'it' ? 'it' : 'en';
}

// Components: const { t } = useI18n(). Re-renders when the language changes.
export function useI18n() {
  const { t: translate, i18n: instance } = useTranslation();
  const language: Language = instance.language === 'it' ? 'it' : 'en';
  return { t: translate, language };
}
