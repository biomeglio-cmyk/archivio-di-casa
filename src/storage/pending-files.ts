import type { DocumentFile } from '@/db/types';

// A file just captured (camera, photo library or Files app) and not saved yet.
// It still lives in a temporary folder; it is copied into documents/ when the document is saved.
export type PendingFile = {
  uri: string;
  kind: DocumentFile['kind'];
  side: DocumentFile['side'];
  page?: number; // scanned pages: 1, 2, 3… (front and back photos get 1 and 2 on save)
  name?: string; // original file name, used to suggest the title of a PDF
};

// Route params are strings, so pending files travel to "Nuovo documento" as JSON
export function encodePendingFiles(files: PendingFile[]): string {
  return JSON.stringify(files);
}

export function decodePendingFiles(param: string | undefined): PendingFile[] {
  if (!param) return [];
  try {
    const parsed: unknown = JSON.parse(param);
    return Array.isArray(parsed) ? (parsed as PendingFile[]) : [];
  } catch {
    return [];
  }
}

// Photos as the pages of a document, in order: page 1 = front, page 2 = back, then only the number
export function pagesToFiles(uris: string[]): PendingFile[] {
  return uris.map((uri, index) => ({
    uri,
    kind: 'image',
    side: index === 0 ? 'front' : index === 1 ? 'back' : null,
    page: index + 1,
  }));
}
