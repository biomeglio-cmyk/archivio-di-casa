import * as Crypto from 'expo-crypto';

import type { PasswordType } from '@/db/types';
import { Colors } from '@/constants/theme';

// ——— "Forza" of a password: Debole / Media / Buona / Forte (PIN: "Solo numeri") ———

const LEVEL_NAMES = ['Debole', 'Media', 'Buona', 'Forte'];
const LEVEL_COLORS = ['#E5243B', '#F59E0B', '#2FA3B8', '#1F9D6B'];

export type Strength = { level: number; label: string; color: string }; // level 0 = nothing typed

export function passwordStrength(password: string, type: PasswordType): Strength {
  if (type === 'pin') return { level: 0, label: 'Solo numeri', color: Colors.current.textSecondary };
  if (!password) return { level: 0, label: '', color: Colors.current.textSecondary };
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  let score = 1;
  if (password.length >= 10 && classes >= 2) score = 2;
  if (password.length >= 12 && classes >= 3) score = 3;
  if (password.length >= 16 && classes >= 3) score = 4;
  if (password.length < 8) score = 1;
  return { level: score, label: LEVEL_NAMES[score - 1], color: LEVEL_COLORS[score - 1] };
}

// ——— "Genera una password sicura": readable words, numbers and a symbol ———

// 64 short Italian words: an index from one random byte (byte % 64) has no bias
const WORDS = [
  'Lago', 'Verde', 'Tram', 'Ombra', 'Pesca', 'Volo', 'Nido', 'Faro', 'Cielo', 'Mare', 'Sole', 'Luna', 'Vento', 'Pino',
  'Riva', 'Ponte', 'Treno', 'Gatto', 'Lupo', 'Orso', 'Fiume', 'Monte', 'Bosco', 'Prato', 'Seme', 'Foglia', 'Ramo', 'Neve',
  'Sasso', 'Onda', 'Vela', 'Porto', 'Torre', 'Muro', 'Campo', 'Fiore', 'Mela', 'Pera', 'Uva', 'Noce', 'Pane', 'Sale',
  'Miele', 'Latte', 'Riso', 'Tazza', 'Lampo', 'Tuono', 'Nube', 'Isola', 'Strada', 'Corda', 'Nastro', 'Penna', 'Carta',
  'Libro', 'Gomma', 'Vaso', 'Rosa', 'Viola', 'Ruota', 'Sedia', 'Tetto', 'Scala',
];
const SYMBOLS = ['!', '?', '#', '*', '+', '@', '%', '&'];

// "Lago-Verde-Tram-42" or "Ombra!Pesca7Volo": 6 random bits per word, plus digits and a symbol,
// from the system's secure random generator (expo-crypto)
export function generatePassword(): string {
  const bytes = Crypto.getRandomBytes(8);
  const word = (i: number) => WORDS[bytes[i] % WORDS.length];
  const digit = (i: number) => String(bytes[i] % 10);
  if (bytes[7] % 2 === 0) {
    return `${word(0)}-${word(1)}-${word(2)}-${digit(3)}${digit(4)}`;
  }
  return `${word(0)}${SYMBOLS[bytes[5] % SYMBOLS.length]}${word(1)}${digit(3)}${word(2)}`;
}

// ——— Wi-Fi QR for the guests (the standard every phone camera reads) ———

// WIFI:T:WPA;S:<network>;P:<password>;; with \ ; , : " escaped
export function wifiQrPayload(network: string, password: string): string {
  const escape = (value: string) => value.replace(/([\;,:"])/g, '\\$1');
  return `WIFI:T:WPA;S:${escape(network)};P:${escape(password)};;`;
}

// ——— The custom color wheel: hue and distance from the center → hex (as in the design) ———

export function wheelHex(hue: number, radius: number): string {
  const saturation = 0.85;
  const lightness = (100 - 50 * radius) / 100;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = saturation * Math.min(lightness, 1 - lightness);
  const channel = (n: number) =>
    Math.round(255 * (lightness - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
}
