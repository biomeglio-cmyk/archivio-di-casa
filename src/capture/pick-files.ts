import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import type { PendingFile } from '@/storage/pending-files';

// "Scegli dalle foto": one or two images. The first chosen is the front, the second the back.
// Returns null if the user cancels.
export async function pickPhotos(): Promise<PendingFile[] | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 2,
    orderedSelection: true, // numbers the photos 1, 2 in the order they are tapped
    quality: 0.85, // below 1 iOS also converts HEIC photos to JPEG
  });
  if (result.canceled || result.assets.length === 0) return null;

  return result.assets.slice(0, 2).map((asset, index) => ({
    uri: asset.uri,
    kind: 'image',
    side: index === 0 ? 'front' : 'back',
  }));
}

// "Importa file": one PDF from the Files app (iCloud Drive, Downloads…)
export async function pickPdf(): Promise<PendingFile[] | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true, // we get a local copy we are allowed to read
    multiple: false,
  });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  return [{ uri: asset.uri, kind: 'pdf', side: null, name: asset.name }];
}
