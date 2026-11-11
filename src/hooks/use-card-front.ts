import { useEffect, useReducer } from 'react';

import { cleanFrontUri, ensureCleanFront, onCleanFrontChange } from '@/storage/card-fronts';
import { resolveDocumentFile } from '@/storage/document-files';

// The card front to show in "Tessere e card": the clean copy, or the original photo until the
// copy is ready (it is made the first time the card is shown, then the tile refreshes).
// null path = no photo to show.
export function useCardFront(relativePath: string | null): string | null {
  const [, refresh] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!relativePath) return;
    const unsubscribe = onCleanFrontChange((path) => {
      if (path === relativePath) refresh();
    });
    ensureCleanFront(relativePath);
    return unsubscribe;
  }, [relativePath]);

  if (!relativePath) return null;
  return cleanFrontUri(relativePath) ?? resolveDocumentFile(relativePath).uri;
}
