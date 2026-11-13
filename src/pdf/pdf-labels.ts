import type { TFunction } from 'i18next';

import type { DocumentFile } from '@/db/types';

// "PDF, 3 pagine" when the page count is known, else "PDF"
export function pdfSummary(file: DocumentFile, t: TFunction): string {
  return file.pageCount ? t('pdf.pages', { count: file.pageCount }) : 'PDF'; // i18n-ignore: format name
}

// The short note under the generic PDF icon when page 1 can't be drawn
export function pdfNote(file: DocumentFile, t: TFunction): string | null {
  if (file.previewState === 'password') return t('pdf.protected');
  if (file.previewState === 'invalid') return t('pdf.unreadable');
  return null;
}
