import { useSyncExternalStore } from 'react';

// "Reload" of the app after a restore, without restarting it: the root layout uses this number
// as the React key of everything under the database, so changing it throws away every screen
// (and its cached queries) and builds them again from the restored data, starting on Home.
// It works the same in Expo Go and in the real app.
let generation = 0;
const listeners = new Set<() => void>();

export function reloadApp(): void {
  generation++;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAppGeneration(): number {
  return useSyncExternalStore(subscribe, () => generation);
}
