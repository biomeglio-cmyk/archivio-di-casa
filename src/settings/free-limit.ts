import { router } from 'expo-router';
import type { SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import { useEffect, useSyncExternalStore } from 'react';

import { useDbQuery } from '@/hooks/use-db-query';
import { formatEuro } from '@/utils/money';

// Free version (docs/design-guide.md, "Limite gratuito"): up to 7 elements in all, where an
// element is a document or a card ("Tessere e card" items are documents too). Categories,
// people and deadlines do not count; the Cestino does not count either (it frees a space).
// At the limit (docs/design/HomeLimite.dc.html, ProvaFinita.dc.html): the "+" turns grey with a
// lock, adding a document or a card opens the limit panel (Sblocca / Più tardi), Home shows
// "7 di 7 spazi gratuiti usati". Everything else keeps working.
export const FREE_LIMIT = 7;

// The blocking is switched on only when the real purchase exists (StoreKit, development build).
// While false, the limit states can be previewed with the hidden switch of Impostazioni ›
// Informazioni (tap the version 5 times).
export const FREE_LIMIT_ENFORCED = false;
// The price as written in the active language ("0,99 €" / "€0.99"); call it at render time
// The one-time purchase: 0,99 € (the App Store will give the local price once StoreKit is in)
const UNLOCK_PRICE_CENTS = 99;

export function unlockPrice(): string {
  return formatEuro(UNLOCK_PRICE_CENTS);
}

const UNLOCKED_KEY = 'app.unlocked';

// Bought "Sblocca": always false until StoreKit is connected (it needs a development build)
export function isUnlocked(): boolean {
  try {
    return Storage.getItemSync(UNLOCKED_KEY) === '1';
  } catch {
    return false;
  }
}

export type FreeUsage = {
  used: number; // documents + cards
  shown: number; // used, capped at the limit (cards and bars)
  limit: number;
  remaining: number; // never below 0
  share: number; // 0…1, for the progress bars
  unlocked: boolean;
};

export async function getFreeUsage(db: SQLiteDatabase): Promise<FreeUsage> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM documents WHERE deleted_at IS NULL');
  const used = row?.count ?? 0;
  return {
    used,
    // What the cards show: never more than the limit ("7 di 7", full bar), also when the limit
    // isn't enforced (development) and there are more documents
    shown: Math.min(used, FREE_LIMIT),
    limit: FREE_LIMIT,
    remaining: Math.max(0, FREE_LIMIT - used),
    share: Math.min(1, used / FREE_LIMIT),
    unlocked: isUnlocked(),
  };
}

// ——— Preview of the limit states (debug) ———

const PREVIEW_KEY = 'debug.limitPreview';
let preview: boolean | null = null;
const listeners = new Set<() => void>();

function readPreview(): boolean {
  if (preview === null) {
    try {
      preview = Storage.getItemSync(PREVIEW_KEY) === '1';
    } catch {
      preview = false;
    }
  }
  return preview;
}

export function setLimitPreview(on: boolean): void {
  preview = on;
  try {
    Storage.setItemSync(PREVIEW_KEY, on ? '1' : '0');
  } catch {
    // lasts until the app closes
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLimitPreview(): boolean {
  return useSyncExternalStore(subscribe, readPreview);
}

// Whether adding is blocked now: never once unlocked; with the blocking off, only in the preview
export function isLimitReached(usage: FreeUsage | undefined, previewOn: boolean): boolean {
  if (!usage || usage.unlocked) return false;
  return FREE_LIMIT_ENFORCED ? usage.used >= usage.limit : previewOn;
}

// The last known state, for the add buttons that have no database at hand (kept by useFreeLimit)
let reachedNow = false;

export function useFreeLimit() {
  const { data: usage } = useDbQuery(getFreeUsage, []);
  const previewOn = useLimitPreview();
  const reached = isLimitReached(usage, previewOn);
  useEffect(() => {
    reachedNow = reached;
  }, [reached]);
  return { usage, reached };
}

// Every "add a document / a card" goes through here: at the limit the panel opens instead
export function whenBelowLimit(add: () => void): void {
  if (reachedNow) router.push('/limit');
  else add();
}
