import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

// App preferences, kept on the phone with the expo-sqlite key-value store
const KEY = 'app.preferences';

export type Preferences = {
  remindersEnabled: boolean; // "Promemoria scadenze"
  reminderHour: number; // "Ora dell'avviso", 0–23
  reminderMinute: number;
  defaultReminderDays: number; // "Avvisa prima di", for documents without their own value
  iconBadgeEnabled: boolean; // "Numero sull'icona"
  showPinned: boolean; // "Mostra Sottomano in Archivio"
};

export const DEFAULT_PREFERENCES: Preferences = {
  remindersEnabled: true,
  reminderHour: 9,
  reminderMinute: 0,
  defaultReminderDays: 7,
  iconBadgeEnabled: true,
  showPinned: true,
};

// Last value read or saved: the same object until something changes (useSyncExternalStore
// needs a stable snapshot, or it would re-render forever)
let current: Preferences | null = null;
const listeners = new Set<() => void>();

function read(): Preferences {
  try {
    const saved = Storage.getItemSync(KEY);
    return saved ? { ...DEFAULT_PREFERENCES, ...(JSON.parse(saved) as Partial<Preferences>) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function getPreferences(): Preferences {
  current ??= read();
  return current;
}

export function savePreferences(change: Partial<Preferences>): Preferences {
  const next = { ...getPreferences(), ...change };
  Storage.setItemSync(KEY, JSON.stringify(next));
  current = next;
  listeners.forEach((listener) => listener());
  return next;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The preferences, re-rendering the component when they are saved (e.g. from Impostazioni).
// Like a BehaviorSubject in Angular that the component subscribes to.
export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getPreferences);
}
