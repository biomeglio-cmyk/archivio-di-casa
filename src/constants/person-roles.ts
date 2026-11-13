import type { PersonRole } from '@/db/types';
import { t } from '@/i18n';

// "Chi è" in Nuova persona (docs/design/NuovoUtente.dc.html), plus "Sono io" for the "Tu" badge
export const PERSON_ROLES: PersonRole[] = ['me', 'partner', 'child', 'parent', 'sibling', 'other'];

// The choice in "Chi è": "Sono io", "Partner", "Figlio o figlia"…
export function roleChoiceLabel(role: PersonRole): string {
  return t(`personRoles.choice.${role}`);
}

// "Partner", "Figlio o figlia"…; "Tu" for the owner; null when not said
export function roleLabel(role: PersonRole | null): string | null {
  if (role === 'me') return t('personRoles.you');
  return role && isPersonRole(role) ? roleChoiceLabel(role) : null;
}

export function isPersonRole(value: string | null): value is PersonRole {
  return PERSON_ROLES.some((r) => r === value);
}

// The avatar gradients of the design (lilac, blue, pink, mint, yellow, apricot), one per person
const AVATAR_GRADIENTS = [
  { colors: ['#A59AF7', '#7C6CE8'], shadow: '124, 108, 232' },
  { colors: ['#86B4F7', '#6494EE'], shadow: '100, 148, 238' },
  { colors: ['#F79BBA', '#EE7499'], shadow: '238, 116, 153' },
  { colors: ['#6FD3AE', '#45B68E'], shadow: '69, 182, 142' },
  { colors: ['#F5CB6B', '#EBAA45'], shadow: '235, 170, 69' },
  { colors: ['#FFA36E', '#F5824A'], shadow: '245, 130, 74' },
] as const;

// Always the same gradient for the same name
export function avatarGradient(name: string) {
  let hash = 0;
  for (const char of name.trim().toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}
