import { t } from '@/i18n';

// "Tipo" suggestions for the built-in categories (by their built-in key, the original icon) →
// translation key; each translation is a list separated by "|". Translated when asked for, so
// the suggestions follow the language (the chosen value is stored as the user's own text).
// The user can also type any other value; the values already used in the folder come first.
const SUGGESTIONS: Record<string, string> = {
  'person.text.rectangle': 'documents',
  creditcard: 'cards',
  lightbulb: 'utilities',
  house: 'home',
  shield: 'insurance',
  receipt: 'warranties',
  car: 'car',
  'cross.case': 'tax',
  'bubbles.and.sparkles': 'householdStaff',
  backpack: 'school',
  pawprint: 'pet',
  key: 'password',
};

function suggestionsFor(builtinKey: string | null): string[] {
  const slug = builtinKey ? SUGGESTIONS[builtinKey] : undefined;
  return slug ? t(`documentTypes.${slug}`).split('|') : [];
}

// Used ones first, then the suggestions of the category, without duplicates (ignoring case)
export function typeSuggestions(builtinKey: string | null, used: string[]): string[] {
  const all = [...used, ...suggestionsFor(builtinKey)];
  const seen = new Set<string>();
  return all.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
