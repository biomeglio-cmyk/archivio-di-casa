import type { SFSymbol } from 'expo-symbols';

import type { CategoryColors, PasswordInfo, PasswordPreview, PasswordType } from '@/db/types';
import { onSoftTint, softTint, type Palette } from '@/constants/theme';
import { t } from '@/i18n';
import { readableGradient } from '@/utils/colors';

// Everything that changes with "Che cosa salvi" (docs/design/NuovaPassword.dc.html, its logic class).
// The texts are translated when typeMeta() / passwordTypes() is called, never at module load.
export type PasswordTypeMeta = {
  id: PasswordType;
  name: string; // "Sito o app"
  symbol: SFSymbol; // on the type button and the default preview icon
  namePlaceholder: string;
  userLabel: string | null; // null = no user field (PIN)
  userPlaceholder: string;
  userSymbol: SFSymbol;
  passwordLabel: string;
  notePlaceholder: string;
  canGenerate: boolean; // "Genera una password sicura": Sito and Altro
};

const PASSWORD_TYPE_IDS: { id: PasswordType; symbol: SFSymbol; hasUser: boolean; userSymbol: SFSymbol; canGenerate: boolean }[] = [
  { id: 'site', symbol: 'globe', hasUser: true, userSymbol: 'envelope', canGenerate: true },
  { id: 'wifi', symbol: 'wifi', hasUser: true, userSymbol: 'wifi', canGenerate: false },
  { id: 'pin', symbol: 'circle.grid.3x3', hasUser: false, userSymbol: 'person', canGenerate: false },
  { id: 'other', symbol: 'key', hasUser: true, userSymbol: 'person', canGenerate: true },
];

function translatedMeta(base: (typeof PASSWORD_TYPE_IDS)[number]): PasswordTypeMeta {
  const key = `passwordOptions.types.${base.id}`;
  return {
    id: base.id,
    name: t(`${key}.name`),
    symbol: base.symbol,
    namePlaceholder: t(`${key}.namePlaceholder`),
    userLabel: base.hasUser ? t(`${key}.userLabel`) : null,
    userPlaceholder: base.hasUser ? t(`${key}.userPlaceholder`) : '',
    userSymbol: base.userSymbol,
    passwordLabel: t(`${key}.passwordLabel`),
    notePlaceholder: t(`${key}.notePlaceholder`),
    canGenerate: base.canGenerate,
  };
}

// The four types, in the language in use
export const passwordTypes = (): PasswordTypeMeta[] => PASSWORD_TYPE_IDS.map(translatedMeta);

export const typeMeta = (type: PasswordType): PasswordTypeMeta =>
  translatedMeta(PASSWORD_TYPE_IDS.find((item) => item.id === type) ?? PASSWORD_TYPE_IDS[3]);

// "Wi-Fi", "PIN", or the type written for "Altro" ("Allarme")
export function typeName(info: Pick<PasswordInfo, 'type' | 'customType'>): string {
  return info.type === 'other' && info.customType ? info.customType : typeMeta(info.type).name;
}

// The 7 colors of the preview; their names (VoiceOver) come from passwordColorName()
export const PASSWORD_COLORS = [
  { key: 'aqua', top: '#5CC8D8', bottom: '#2FA3B8' },
  { key: 'indigo', top: '#4A5CF0', bottom: '#8B6CF0' },
  { key: 'apricot', top: '#FFA36E', bottom: '#F5824A' },
  { key: 'pink', top: '#F79BBA', bottom: '#EE7499' },
  { key: 'mint', top: '#6FD3AE', bottom: '#45B68E' },
  { key: 'sky', top: '#86B4F7', bottom: '#6494EE' },
  { key: 'graphite', top: '#6B7290', bottom: '#3E4360' },
] as const;

export const passwordColorName = (key: string): string => t(`passwordOptions.colors.${key}`);

// The 12 icons of the preview; their names (VoiceOver) come from passwordIconName()
export const PASSWORD_ICONS: { key: string; symbol: SFSymbol }[] = [
  { key: 'key', symbol: 'key' },
  { key: 'lock', symbol: 'lock' },
  { key: 'globe', symbol: 'globe' },
  { key: 'wifi', symbol: 'wifi' },
  { key: 'bank', symbol: 'building.columns' },
  { key: 'card', symbol: 'creditcard' },
  { key: 'mail', symbol: 'envelope' },
  { key: 'home', symbol: 'house' },
  { key: 'car', symbol: 'car' },
  { key: 'shield', symbol: 'shield' },
  { key: 'cart', symbol: 'cart' },
  { key: 'star', symbol: 'star' },
];

export const passwordIconName = (key: string): string => t(`passwordOptions.icons.${key}`);

// The two gradient colors of a preview
export function previewGradient(preview: PasswordPreview): [string, string] {
  // White text and icon on it: darkened just enough for WCAG AA
  if (preview.color === 'custom' && preview.hex) return readableGradient([preview.hex, preview.hex]);
  const color = PASSWORD_COLORS.find((c) => c.key === preview.color) ?? PASSWORD_COLORS[0];
  return readableGradient([color.top, color.bottom]);
}

// The colors of a Password item everywhere (Home favorites, Preferiti, folders, rows, detail): its
// preview color when one is set (white text and icon, readable), otherwise its category's colors
// from the active palette (Pastello, the night folders…)
export function passwordColors(
  preview: PasswordPreview,
  category: CategoryColors | undefined,
): { top: string; bottom: string; text: string; isNight?: boolean } {
  if (preview.color === null && category) return category;
  const [top, bottom] = previewGradient(preview);
  return { top, bottom, text: '#FFFFFF' };
}

// The icon of a preview: the one chosen, else the one of its type
export function previewSymbol(preview: PasswordPreview, type: PasswordType): SFSymbol {
  return PASSWORD_ICONS.find((i) => i.key === preview.icon)?.symbol ?? typeMeta(type).symbol;
}

// The section colors (aqua) of the Password screens
export const PASSWORD_TINT = (p: Palette) => softTint(p, '#E3F6F9', '#13283A');
export const PASSWORD_INK = (p: Palette) => onSoftTint(p, '#1A6F7E', '#7FD6E4');
export const PASSWORD_NOTE = (p: Palette) => onSoftTint(p, '#1A5E6B', '#7FD6E4');
// The aqua of the design, darkened just enough for white text at WCAG AA (selected type, image button)
export const PASSWORD_GRADIENT = readableGradient(['#5CC8D8', '#2FA3B8']) as readonly [string, string];
