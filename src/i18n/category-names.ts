import { t } from '@/i18n';

// Built-in categories by their key (the original icon, see V9) → translation key
const SLUGS: Record<string, string> = {
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
  folder: 'other',
};

// The name of a built-in category in the active language ("Spese 730" / "Tax receipts (730)").
// Only used while the user keeps the default name: a renamed category shows the user's text.
export function builtinCategoryName(builtinKey: string): string | null {
  const slug = SLUGS[builtinKey];
  return slug ? t(`categories.builtin.${slug}`) : null;
}
