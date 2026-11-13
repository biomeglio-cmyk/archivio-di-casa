// CLDR cardinal plural rules of the app languages, used only when the engine has no
// Intl.PluralRules. Counts in the app are whole numbers, so only the integer rules are here
// (a decimal gets "other").

type Category = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

const between = (n: number, from: number, to: number) => n >= from && n <= to;

// Slavic "one / few / many": 1, 21, 31… / 2–4, 22–24… / the rest (not 11–14)
function eastSlavic(n: number): Category {
  const d = n % 10;
  const c = n % 100;
  if (d === 1 && c !== 11) return 'one';
  if (between(d, 2, 4) && !between(c, 12, 14)) return 'few';
  return 'many';
}

const RULES: Record<string, { categories: Category[]; select: (n: number) => Category }> = {
  // one = 1
  one: { categories: ['one', 'other'], select: (n) => (n === 1 ? 'one' : 'other') },
  // one = 0 and 1 (French, Brazilian Portuguese)
  zeroOne: { categories: ['one', 'many', 'other'], select: (n) => (n === 0 || n === 1 ? 'one' : 'other') },
  // Italian, Spanish, Catalan, European Portuguese: "many" only for millions in compact notation
  oneMany: { categories: ['one', 'many', 'other'], select: (n) => (n === 1 ? 'one' : 'other') },
  ru: { categories: ['one', 'few', 'many', 'other'], select: eastSlavic },
  pl: {
    categories: ['one', 'few', 'many', 'other'],
    select: (n) => (n === 1 ? 'one' : eastSlavic(n) === 'few' ? 'few' : 'many'),
  },
  cs: {
    categories: ['one', 'few', 'many', 'other'],
    select: (n) => (n === 1 ? 'one' : between(n, 2, 4) ? 'few' : 'other'),
  },
  hr: {
    categories: ['one', 'few', 'other'],
    select: (n) => {
      const c = eastSlavic(n);
      return c === 'many' ? 'other' : c;
    },
  },
  sl: {
    categories: ['one', 'two', 'few', 'other'],
    select: (n) => {
      const c = n % 100;
      if (c === 1) return 'one';
      if (c === 2) return 'two';
      if (c === 3 || c === 4) return 'few';
      return 'other';
    },
  },
  ro: {
    categories: ['one', 'few', 'other'],
    select: (n) => (n === 1 ? 'one' : n === 0 || between(n % 100, 1, 19) ? 'few' : 'other'),
  },
};

const BY_LANGUAGE: Record<string, keyof typeof RULES> = {
  it: 'oneMany',
  es: 'oneMany',
  ca: 'oneMany',
  'pt-PT': 'oneMany',
  pt: 'zeroOne',
  'pt-BR': 'zeroOne',
  fr: 'zeroOne',
  ru: 'ru',
  uk: 'ru',
  pl: 'pl',
  cs: 'cs',
  sk: 'cs',
  hr: 'hr',
  sl: 'sl',
  ro: 'ro',
};

function rule(locale: string) {
  const name = BY_LANGUAGE[locale] ?? BY_LANGUAGE[locale.split('-')[0]] ?? 'one';
  return RULES[name];
}

export function pluralCategory(locale: string, n: number): Category {
  if (!Number.isInteger(n)) return 'other';
  return rule(locale).select(Math.abs(n));
}

export function pluralCategories(locale: string): Category[] {
  return rule(locale).categories;
}
