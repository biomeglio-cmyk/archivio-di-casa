import type { SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { DEFAULT_PALETTE, PALETTES, type Palette, type PaletteId } from '@/constants/palettes';
import { BUILTIN_DEFAULTS, BUILTIN_ORDER } from '@/db/builtin-categories';
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
  return PALETTES.find((p) => p.id === getPaletteId()) ?? PALETTES.find((p) => p.id === DEFAULT_PALETTE) ?? PALETTES[0];
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

// Set once the app has moved this phone to the default "Pastello" palette (accessibility pass,
// November 2026). It replaces the earlier one-time move to "Sottomano" (app.palette.sottomanoAdopted).
const ADOPTED_KEY = 'app.palette.pastelAdopted';

// Runs at every start (initDatabase), does its work only once per install: a phone on "Sottomano"
// (the previous default, chosen or not) moves to "Pastello"; any other palette picked in "Aspetto"
// stays. Afterwards the choice in "Aspetto" is always respected, "Sottomano" included.
// Built-in categories whose own saved color is just their original pastel default (not a real
// choice) follow the palette again too. Never throws: it must not block the app.
export async function adoptDefaultPaletteOnce(db: SQLiteDatabase): Promise<void> {
  try {
    if (Storage.getItemSync(ADOPTED_KEY) === '1') return;
    for (const builtin of BUILTIN_DEFAULTS) {
      await db.runAsync(
        `UPDATE categories SET custom_colors = 0
         WHERE is_builtin = 1 AND builtin_key = ? AND custom_colors = 1
           AND color_top = ? AND color_bottom = ? AND color_text = ?`,
        builtin.key,
        builtin.colors.top,
        builtin.colors.bottom,
        builtin.colors.text,
      );
    }
    const saved = Storage.getItemSync(KEY);
    if (saved === null || saved === 'sottomano') setPaletteId(DEFAULT_PALETTE);
    Storage.setItemSync(ADOPTED_KEY, '1');
  } catch (error) {
    console.warn('Palette update failed', error);
  }
}

// A built-in category is recognized by its builtin_key: its ORIGINAL icon (name and icon can change)
const BUILTIN_INDEX = new Map<string, number>(BUILTIN_ORDER.map((c, i) => [c.symbol, i]));

// Colors of a built-in category in a palette (the chosen one by default); null for custom ones
export function builtinColorsFor(builtinKey: string, palette: Palette = getPalette()): CategoryColors | null {
  const index = BUILTIN_INDEX.get(builtinKey);
  return index === undefined ? null : palette.colors[index];
}
