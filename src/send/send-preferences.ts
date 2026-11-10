import Storage from 'expo-sqlite/kv-store';

import { MB } from '@/send/compression';
import type { SendFormat } from '@/send/prepare';

export type SizeLimit = 'original' | '1mb' | '500kb' | '200kb';

export const SIZE_LIMITS: { key: SizeLimit; label: string; bytes: number | null }[] = [
  { key: 'original', label: 'Originale', bytes: null },
  { key: '1mb', label: '1 MB', bytes: MB },
  { key: '500kb', label: '500 KB', bytes: 500_000 },
  { key: '200kb', label: '200 KB', bytes: 200_000 },
];

export type SendPreferences = { format: SendFormat; together: boolean; limit: SizeLimit };

const KEY = 'send.preferences';
const DEFAULTS: SendPreferences = { format: 'pdf', together: true, limit: '1mb' };

// The last choices of the "Invia" sheet, remembered on the phone
export function loadSendPreferences(): SendPreferences {
  try {
    const saved = Storage.getItemSync(KEY);
    return saved ? { ...DEFAULTS, ...(JSON.parse(saved) as Partial<SendPreferences>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function saveSendPreferences(preferences: SendPreferences): void {
  Storage.setItemSync(KEY, JSON.stringify(preferences));
}

// "820 B", "412 KB", "1,2 MB" (1 KB = 1000 bytes, as the limits)
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / MB).toFixed(1).replace('.', ',')} MB`;
}
