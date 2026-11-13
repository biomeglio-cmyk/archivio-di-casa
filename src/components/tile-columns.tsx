import type { ReactNode } from 'react';

import { useLargeText } from '@/hooks/use-large-text';
import { TileColumnsContext } from '@/hooks/use-tile-size';

// Wraps a tile grid (the ONE rule for every grid of tiles: Home favorites and categories, folder
// Griglia, Preferiti, Persona): the number of columns depends ONLY on the text size, never on the
// content — 2 up to XL, 1 from XXL (useLargeText). A long name stays in its tile: it wraps on 2
// lines between words, shrinks to 85 % at most, then ends with "…" (TileTitle).
export function TileColumnsProvider({ children }: { children: ReactNode }) {
  const columns = useLargeText() ? 1 : 2;
  return <TileColumnsContext value={{ columns, reportTooLong: () => undefined, inGrid: true }}>{children}</TileColumnsContext>;
}
