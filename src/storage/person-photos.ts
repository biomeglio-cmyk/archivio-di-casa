import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';

import { deleteStoredFile } from '@/storage/document-files';

// Person photos live in <app documents>/people/, next to documents/
const FOLDER = 'people';
const SIZE = 512; // px: plenty for a circle of 40–96 pt, and small on disk

// Shrinks the (already square) photo to 512×512 and copies it into people/.
// Returns the path relative to Paths.document, as stored in people.photo_path.
export async function storePersonPhoto(uri: string): Promise<string> {
  const image = await ImageManipulator.manipulate(uri).resize({ width: SIZE, height: SIZE }).renderAsync();
  const resized = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });

  const directory = new Directory(Paths.document, FOLDER);
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  await new File(resized.uri).copy(new File(directory, fileName));
  return `${FOLDER}/${fileName}`;
}

export function personPhotoUri(relativePath: string): string {
  return new File(Paths.document, relativePath).uri;
}

// Same best-effort removal used for document files
export const deletePersonPhoto = deleteStoredFile;
