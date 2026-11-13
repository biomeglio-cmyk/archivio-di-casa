import { useState, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';

import { useI18n } from '@/i18n';
import { TILE_COLUMNS, TileColumnsContext } from '@/hooks/use-tile-size';

// Wraps a tile grid: 2 columns until a tile title reports a word that doesn't fit, then 1 column.
// It starts again from 2 when the screen width, the text size or the language changes.
export function TileColumnsProvider({ children }: { children: ReactNode }) {
  const { width, fontScale } = useWindowDimensions();
  const { language } = useI18n();
  const key = `${Math.round(width)}|${fontScale}|${language}`;
  return (
    <ColumnsState key={key}>
      {children}
    </ColumnsState>
  );
}

function ColumnsState({ children }: { children: ReactNode }) {
  const [columns, setColumns] = useState<1 | 2>(TILE_COLUMNS);
  return (
    <TileColumnsContext value={{ columns, reportTooLong: () => setColumns(1), inGrid: true }}>{children}</TileColumnsContext>
  );
}
