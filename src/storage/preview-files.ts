import { File } from 'expo-file-system';

import type { DocumentFile } from '@/db/types';
import { resolveDocumentFile } from '@/storage/document-files';
import { namedCopy } from '@/storage/share-copies';

function faceName(file: DocumentFile, imageCount: number): string {
  if (file.kind === 'pdf') return '';
  if (imageCount > 2) return ` - Pagina ${file.page ?? 1}`;
  return file.side === 'back' ? ' - Retro' : ' - Fronte';
}

// Opens the document full screen with iOS Quick Look: zoom, swipe between Fronte and Retro (or the pages),
// PDF pages. Named copies make Quick Look show "Carta d'identità - Fronte" as the title.
export async function previewDocumentFiles(
  title: string,
  files: DocumentFile[],
  initialIndex = 0,
): Promise<void> {
  const copies: File[] = [];
  const imageCount = files.filter((f) => f.kind === 'image').length;
  for (const file of files) {
    copies.push(await namedCopy(resolveDocumentFile(file.path), `${title}${faceName(file, imageCount)}`));
  }
  await File.preview(copies, { initialIndex });
}
