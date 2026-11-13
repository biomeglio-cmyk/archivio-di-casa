import { useState, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';

import { useLargeText } from '@/hooks/use-large-text';
import { useI18n } from '@/i18n';
import { TILE_COLUMNS, TileColumnsContext } from '@/hooks/use-tile-size';

// Wraps a tile grid (the ONE rule for every 2-column grid: TileGrid, SortableTileGrid, the Home
// favorites): 1 column with large text (XXL and up, useLargeText); otherwise 2 columns until a tile
// title reports a word that doesn't fit or a title longer than 2 lines, then 1 column. It starts
// again when the screen width, the text size or the language changes.
export function TileColumnsProvider({ children }: { children: ReactNode }) {
  const { width, fontScale } = useWindowDimensions();
  const { language } = useI18n();
  const key = `${Math.round(width)}|${fontScale}|${language}`;
  const large = useLargeText();
  return (
    <ColumnsState key={key} start={large ? 1 : TILE_COLUMNS}>
      {children}
    </ColumnsState>
  );
}

function ColumnsState({ children, start }: { children: ReactNode; start: 1 | 2 }) {
  const [columns, setColumns] = useState<1 | 2>(start);
  return (
    <TileColumnsContext value={{ columns, reportTooLong: () => setColumns(1), inGrid: true }}>{children}</TileColumnsContext>
  );
}
