import type { Category } from '@/db/types';
import { t } from '@/i18n';
import { printFormatFor } from '@/send/physical-size';

type CategoryKind = Pick<Category, 'builtinKey'> | null | undefined;

// One rule for the whole app (new document, detail, Modifica, Invia):
// "Fronte"/"Retro" only for an ID or a card (Documenti, Tessere e card) with exactly 2 photos.
// Everything else is just pages: a scan is N pages, never a front with a missing back.
export function usesFrontBack(category: CategoryKind, imageCount: number): boolean {
  return Boolean(category) && printFormatFor(category!) === 'card' && imageCount === 2;
}

// Label of the photo at `index` (0-based, in page order): null when there is only one photo
export function pageLabel(index: number, imageCount: number, frontBack: boolean): string | null {
  if (imageCount <= 1) return null;
  if (frontBack) return index === 0 ? t('pageLabels.front') : t('pageLabels.back');
  return t('pageLabels.page', { number: index + 1 });
}
