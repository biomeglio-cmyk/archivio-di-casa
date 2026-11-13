import Storage from 'expo-sqlite/kv-store';

import { formatNumber } from '@/i18n/format';
import { t } from '@/i18n';
import { MB } from '@/send/compression';
import type { SendFormat } from '@/send/prepare';

export type SizeLimit = 'original' | '1mb' | '500kb' | '200kb';

// `label` is the same in every language; "original" is translated (sizeLimitLabel)
export const SIZE_LIMITS: { key: SizeLimit; label: string | null; bytes: number | null }[] = [
  { key: 'original', label: null, bytes: null },
  { key: '1mb', label: '1 MB', bytes: MB }, // i18n-ignore
  { key: '500kb', label: '500 KB', bytes: 500_000 }, // i18n-ignore
  { key: '200kb', label: '200 KB', bytes: 200_000 }, // i18n-ignore
];

// The label of a limit, in the active language: "Originale", "1 MB"…
export function sizeLimitLabel(limit: (typeof SIZE_LIMITS)[number]): string {
  return limit.label ?? t('sendPreferences.original');
}

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

// "820 B", "412 KB", "1,2 MB" / "1.2 MB" (1 KB = 1000 bytes, as the limits)
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1000)} KB`;
  return `${formatNumber(bytes / MB, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
}
