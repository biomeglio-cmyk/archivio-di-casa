import { Directory, File, Paths } from 'expo-file-system';

// Photos and PDFs live in <app documents>/documents/ (from phase 5).
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
