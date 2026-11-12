import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

// Test switches of the hidden panel (Impostazioni › tap the version 5 times). They only change
// what is shown, never the data.

const EMPTY_HOME_KEY = 'debug.emptyHomePreview';
let emptyHome: boolean | null = null;
const listeners = new Set<() => void>();

function readEmptyHome(): boolean {
  if (emptyHome === null) {
    try {
      emptyHome = Storage.getItemSync(EMPTY_HOME_KEY) === '1';
    } catch {
      emptyHome = false;
    }
  }
  return emptyHome;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// "Anteprima Home vuota": Home shows the empty state (docs/design/HomeVuota.dc.html)
export function setEmptyHomePreview(on: boolean): void {
  emptyHome = on;
  try {
    Storage.setItemSync(EMPTY_HOME_KEY, on ? '1' : '0');
  } catch {
    // lasts until the app closes
  }
  listeners.forEach((listener) => listener());
}

export function useEmptyHomePreview(): boolean {
  return useSyncExternalStore(subscribe, readEmptyHome);
}
