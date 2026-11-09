import type { SFSymbol } from 'expo-symbols';

import { BUILTIN_CATEGORIES } from '@/db/builtin-categories';
import type { CategoryColors } from '@/db/types';

// Short list of SF Symbols for custom categories (typed: a wrong name fails the typecheck)
export const CATEGORY_SYMBOLS: SFSymbol[] = [
  'folder',
  'tag',
  'star',
  'heart',
  'briefcase',
  'graduationcap',
  'pawprint',
  'airplane',
  'gift',
  'wrench.and.screwdriver',
  'banknote',
  'cart',
  'stethoscope',
  'dumbbell',
  'music.note',
  'book',
];

// Pastel palettes: the same 11 used by the built-in categories, so everything matches
export const CATEGORY_PALETTES: CategoryColors[] = BUILTIN_CATEGORIES.map((c) => c.colors);
