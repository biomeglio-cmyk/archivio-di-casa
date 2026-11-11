import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { DEFAULT_PALETTE, PALETTES, type Palette, type PaletteId } from '@/constants/palettes';
import { BUILTIN_ORDER } from '@/db/builtin-categories';
import type { CategoryColors } from '@/db/types';

// The palette chosen in "Aspetto", kept on the phone in the key-value store
const KEY = 'app.palette';

let current: PaletteId | null = null;
const listeners = new Set<() => void>();

function isPaletteId(value: string | null): value is PaletteId {
  return PALETTES.some((p) => p.id === value);
}

export function getPaletteId(): PaletteId {
  if (current === null) {
    try {
      const saved = Storage.getItemSync(KEY);
      current = isPaletteId(saved) ? saved : DEFAULT_PALETTE;
    } catch {
      current = DEFAULT_PALETTE;
    }
  }
  return current;
}

export function getPalette(): Palette {
  return PALETTES.find((p) => p.id === getPaletteId()) ?? PALETTES[0];
}

export function setPaletteId(id: PaletteId): void {
  Storage.setItemSync(KEY, id);
  current = id;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The chosen palette id, re-rendering when it changes (useDbQuery uses it to reload the
// categories with their new colors)
export function usePaletteId(): PaletteId {
  return useSyncExternalStore(subscribe, getPaletteId);
}

// A built-in category is recognized by its builtin_key: its ORIGINAL icon (name and icon can change)
const BUILTIN_INDEX = new Map<string, number>(BUILTIN_ORDER.map((c, i) => [c.symbol, i]));

// Colors of a built-in category in a palette (the chosen one by default); null for custom ones
export function builtinColorsFor(builtinKey: string, palette: Palette = getPalette()): CategoryColors | null {
  const index = BUILTIN_INDEX.get(builtinKey);
  return index === undefined ? null : palette.colors[index];
}
