import { createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import { pluralCategory, pluralCategories } from '@/i18n/plural-rules';
import { isLanguage, readLanguageSetting, resolveLanguage, type Language } from '@/settings/language';

// Plurals need Intl.PluralRules (one / few / many / other…). If the engine lacks it, our own
// rules for the app languages (whole numbers) take its place.
if (typeof Intl.PluralRules === 'undefined') {
  class PluralRules {
    private locale: string;
    constructor(locale?: string | string[]) {
      this.locale = (Array.isArray(locale) ? locale[0] : locale) ?? 'en';
    }
    select(n: number) {
      return pluralCategory(this.locale, n);
    }
    resolvedOptions() {
      return { locale: this.locale, pluralCategories: pluralCategories(this.locale) };
    }
  }
  (Intl as unknown as { PluralRules: unknown }).PluralRules = PluralRules;
}

// The texts of each language, loaded only when needed (Metro evaluates a require lazily)
type Texts = Record<string, unknown>;
const LOADERS: Record<Language, () => Texts> = {
  it: () => require('./it.json'),
  en: () => require('./en.json'),
  es: () => require('./es.json'),
  fr: () => require('./fr.json'),
  de: () => require('./de.json'),
  'pt-PT': () => require('./pt-PT.json'),
  'pt-BR': () => require('./pt-BR.json'),
  nl: () => require('./nl.json'),
  pl: () => require('./pl.json'),
  sv: () => require('./sv.json'),
  da: () => require('./da.json'),
  nb: () => require('./nb.json'),
  fi: () => require('./fi.json'),
  cs: () => require('./cs.json'),
  sk: () => require('./sk.json'),
  hu: () => require('./hu.json'),
  ro: () => require('./ro.json'),
  el: () => require('./el.json'),
  hr: () => require('./hr.json'),
  sl: () => require('./sl.json'),
  uk: () => require('./uk.json'),
  ru: () => require('./ru.json'),
  tr: () => require('./tr.json'),
  ca: () => require('./ca.json'),
};

const startLanguage = resolveLanguage(readLanguageSetting());

// Italian is the source language; English is the fallback for any missing key
const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: LOADERS.en() },
    ...(startLanguage === 'en' ? {} : { [startLanguage]: { translation: LOADERS[startLanguage]() } }),
  },
  lng: startLanguage,
  fallbackLng: 'en',
  load: 'currentOnly', // "pt-BR" is a language of its own, not "pt" + region
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
  initAsync: false, // resources are bundled: ready before the first screen
  // Never suspend: useTranslation would otherwise throw a promise in the middle of a render
  // (after its hooks) when i18next isn't ready, and there is no <Suspense> above RootContent.
  // Not ready → t() returns the key for one render, and the hook order never changes.
  react: { useSuspense: false },
});

if (!i18n.isInitialized) {
  console.warn('i18n: not initialized before the first render');
}

export default i18n;

// Switches the app language: loads its texts first, then every screen re-renders in place
export async function changeAppLanguage(language: Language): Promise<void> {
  if (!i18n.hasResourceBundle(language, 'translation')) {
    i18n.addResourceBundle(language, 'translation', LOADERS[language]());
  }
  await i18n.changeLanguage(language);
}

// For code outside components (alerts in actions, notifications, PDF, backup)
export const t = i18n.t.bind(i18n);

export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : 'en';
}

// Components: const { t } = useI18n(). Re-renders when the language changes.
export function useI18n() {
  const { t: translate, i18n: instance } = useTranslation();
  const language: Language = isLanguage(instance.language) ? instance.language : 'en';
  return { t: translate, language };
}
