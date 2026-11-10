import { useState } from 'react';

// "Seleziona" mode of a document list: which documents are ticked
export function useDocumentSelection() {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  return {
    selecting,
    selected,
    start: () => setSelecting(true),
    cancel: () => {
      setSelecting(false);
      setSelected(new Set());
    },
    toggle: (id: number) =>
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
  };
}
