import { Directory, File, Paths } from 'expo-file-system';

import type { PendingFile } from '@/storage/pending-files';

// Photos and PDFs live in <app documents>/documents/.
// Paths.document is backed up and never cleared by iOS, unlike Paths.cache.
const FOLDER = 'documents';

export function getDocumentsDirectory(): Directory {
  return new Directory(Paths.document, FOLDER);
}

// Creates the folder on first launch; does nothing if it already exists
export function ensureDocumentsDirectory(): void {
  const directory = getDocumentsDirectory();
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
}

// The database stores paths RELATIVE to Paths.document (e.g. 'documents/42-front.jpg'),
// because the absolute path of the app container can change after an iOS update.
export function relativePathFor(fileName: string): string {
  return `${FOLDER}/${fileName}`;
}

export function resolveDocumentFile(relativePath: string): File {
  return new File(Paths.document, relativePath);
}

// Copies a temporary file into documents/ with a unique name and returns its relative path
export async function storePendingFile(pending: PendingFile): Promise<string> {
  ensureDocumentsDirectory();
  const source = new File(pending.uri);
  const extension = source.extension || (pending.kind === 'pdf' ? '.pdf' : '.jpg');
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fileName = `${unique}-${pending.side ?? 'file'}${extension.toLowerCase()}`;

  await source.copy(new File(getDocumentsDirectory(), fileName));
  return relativePathFor(fileName);
}

// Best-effort cleanup (e.g. when saving the document fails after the copy)
export function deleteStoredFile(relativePath: string): void {
  try {
    const file = resolveDocumentFile(relativePath);
    if (file.exists) file.delete();
  } catch {
    // nothing else to do: an orphan file is harmless
  }
}

// Leftovers of the removed card-front enhancement: "…-clean.jpg" copies and "…-original" markers.
// Saved files are always named "<unique>-<side>.<ext>", so these names never match a real photo.
export function isRemovedCardFrontCopy(fileName: string): boolean {
  return /-clean\.jpg$/.test(fileName) || /-original$/.test(fileName);
}

// At launch: deletes those leftovers (also after restoring a backup that still had them)
export function removeCardFrontCopies(): void {
  try {
    for (const item of getDocumentsDirectory().list()) {
      if (item instanceof File && isRemovedCardFrontCopy(item.name)) item.delete();
    }
  } catch {
    // harmless: they are only unused files
  }
}
