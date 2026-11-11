import { File } from 'expo-file-system';

import type { Category, DocumentFile } from '@/db/types';
import { resolveDocumentFile } from '@/storage/document-files';
import { namedCopy } from '@/storage/share-copies';
import { pageLabel, usesFrontBack } from '@/utils/page-labels';

type CategoryKind = Pick<Category, 'builtinKey'>;

// Opens the document full screen with iOS Quick Look: zoom, swipe between the pages (Fronte/Retro for IDs),
// PDF pages. Named copies make Quick Look show "Carta d'identità - Fronte" as the title.
export async function previewDocumentFiles(
  title: string,
  category: CategoryKind,
  files: DocumentFile[],
  initialIndex = 0,
): Promise<void> {
  const copies: File[] = [];
  const images = files.filter((f) => f.kind === 'image');
  const frontBack = usesFrontBack(category, images.length);
  for (const file of files) {
    // "Passaporto - Pagina 2", "Carta d'identità - Retro", or just the title for one photo or a PDF
    const label = file.kind === 'image' ? pageLabel(images.indexOf(file), images.length, frontBack) : null;
    copies.push(await namedCopy(resolveDocumentFile(file.path), label ? `${title} - ${label}` : title));
  }
  await File.preview(copies, { initialIndex });
}
