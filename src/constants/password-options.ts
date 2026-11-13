import type { SFSymbol } from 'expo-symbols';

import type { PasswordInfo, PasswordPreview, PasswordType } from '@/db/types';
import { softTint, onSoftTint } from '@/constants/theme';

// Everything that changes with "Che cosa salvi" (docs/design/NuovaPassword.dc.html, its logic class)
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

export const PASSWORD_TYPES: PasswordTypeMeta[] = [
  {
    id: 'site',
    name: 'Sito o app',
    symbol: 'globe',
    namePlaceholder: 'Per esempio: Home banking',
    userLabel: 'Utente o email',
    userPlaceholder: 'nome@email.it',
    userSymbol: 'envelope',
    passwordLabel: 'Password',
    notePlaceholder: 'Per esempio: domanda di sicurezza, codice di recupero…',
    canGenerate: true,
  },
  {
    id: 'wifi',
    name: 'Wi-Fi',
    symbol: 'wifi',
    namePlaceholder: 'Per esempio: Wi-Fi di casa',
    userLabel: 'Nome della rete',
    userPlaceholder: 'CasaRossi_5G',
    userSymbol: 'wifi',
    passwordLabel: 'Password della rete',
    notePlaceholder: 'Per esempio: il router è in sala, dietro la TV…',
    canGenerate: false,
  },
  {
    id: 'pin',
    name: 'PIN',
    symbol: 'circle.grid.3x3',
    namePlaceholder: 'Per esempio: Bancomat',
    userLabel: null,
    userPlaceholder: '',
    userSymbol: 'person',
    passwordLabel: 'PIN',
    notePlaceholder: 'Per esempio: carta di Giulia…',
    canGenerate: false,
  },
  {
    id: 'other',
    name: 'Altro',
    symbol: 'key',
    namePlaceholder: 'Per esempio: Allarme di casa',
    userLabel: 'Utente',
    userPlaceholder: 'Facoltativo',
    userSymbol: 'person',
    passwordLabel: 'Codice o password',
    notePlaceholder: 'A cosa serve, dove si usa…',
    canGenerate: true,
  },
];

export const typeMeta = (type: PasswordType) => PASSWORD_TYPES.find((t) => t.id === type) ?? PASSWORD_TYPES[3];

// "Wi-Fi", "PIN", or the type written for "Altro" ("Allarme")
export function typeName(info: Pick<PasswordInfo, 'type' | 'customType'>): string {
  return info.type === 'other' && info.customType ? info.customType : typeMeta(info.type).name;
}

// The 7 colors of the preview
export const PASSWORD_COLORS = [
  { key: 'aqua', name: 'Acqua', top: '#5CC8D8', bottom: '#2FA3B8' },
  { key: 'indigo', name: 'Indaco', top: '#4A5CF0', bottom: '#8B6CF0' },
  { key: 'apricot', name: 'Albicocca', top: '#FFA36E', bottom: '#F5824A' },
  { key: 'pink', name: 'Rosa', top: '#F79BBA', bottom: '#EE7499' },
  { key: 'mint', name: 'Menta', top: '#6FD3AE', bottom: '#45B68E' },
  { key: 'sky', name: 'Cielo', top: '#86B4F7', bottom: '#6494EE' },
  { key: 'graphite', name: 'Grafite', top: '#6B7290', bottom: '#3E4360' },
] as const;

// The 12 icons of the preview
export const PASSWORD_ICONS: { key: string; name: string; symbol: SFSymbol }[] = [
  { key: 'key', name: 'Chiave', symbol: 'key' },
  { key: 'lock', name: 'Lucchetto', symbol: 'lock' },
  { key: 'globe', name: 'Globo', symbol: 'globe' },
  { key: 'wifi', name: 'Wi-Fi', symbol: 'wifi' },
  { key: 'bank', name: 'Banca', symbol: 'building.columns' },
  { key: 'card', name: 'Carta', symbol: 'creditcard' },
  { key: 'mail', name: 'Email', symbol: 'envelope' },
  { key: 'home', name: 'Casa', symbol: 'house' },
  { key: 'car', name: 'Auto', symbol: 'car' },
  { key: 'shield', name: 'Scudo', symbol: 'shield' },
  { key: 'cart', name: 'Carrello', symbol: 'cart' },
  { key: 'star', name: 'Stella', symbol: 'star' },
];

// The two gradient colors of a preview
export function previewGradient(preview: PasswordPreview): [string, string] {
  if (preview.color === 'custom' && preview.hex) return [preview.hex, preview.hex];
  const color = PASSWORD_COLORS.find((c) => c.key === preview.color) ?? PASSWORD_COLORS[0];
  return [color.top, color.bottom];
}

// The icon of a preview: the one chosen, else the one of its type
export function previewSymbol(preview: PasswordPreview, type: PasswordType): SFSymbol {
  return PASSWORD_ICONS.find((i) => i.key === preview.icon)?.symbol ?? typeMeta(type).symbol;
}

// The section colors (aqua) of the Password screens
export const PASSWORD_TINT = softTint('#E3F6F9', '47, 163, 184');
export const PASSWORD_INK = onSoftTint('#1A6F7E', '#5CC8D8');
export const PASSWORD_NOTE = onSoftTint('#1A5E6B', '#5CC8D8');
export const PASSWORD_GRADIENT = ['#5CC8D8', '#2FA3B8'] as const;
