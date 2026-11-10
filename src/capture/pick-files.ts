import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ActionSheetIOS } from 'react-native';

import { pagesToFiles, type PendingFile } from '@/storage/pending-files';

// "Scegli dalle foto": any number of images, as pages in the order they were tapped
// (1 = front, 2 = back, then only the page number). Returns null if the user cancels.
export async function pickPhotos(): Promise<PendingFile[] | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 0, // no limit
    orderedSelection: true, // numbers the photos 1, 2, 3… in the order they are tapped
    quality: 0.85, // below 1 iOS also converts HEIC photos to JPEG
  });
  if (result.canceled || result.assets.length === 0) return null;

  return pagesToFiles(result.assets.map((asset) => asset.uri));
}

// One photo for a specific face (used when editing: replace the front, add the back…)
export async function pickPhoto(side: 'front' | 'back'): Promise<PendingFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 0.85,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return { uri: result.assets[0].uri, kind: 'image', side };
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

// Person photo: native iOS action sheet (take / choose / remove), then the native square crop.
// Returns the URI of the square photo, 'remove', or null if cancelled.
export async function pickPersonPhoto(hasPhoto: boolean): Promise<string | 'remove' | null> {
  const options = ['Scatta una foto', 'Scegli dalle foto', ...(hasPhoto ? ['Rimuovi foto'] : []), 'Annulla'];
  const index = await new Promise<number>((resolve) =>
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: hasPhoto ? 2 : undefined,
      },
      resolve,
    ),
  );

  if (index === 0) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
    // allowsEditing shows the iOS crop screen, which is always square
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    return result.canceled ? null : result.assets[0].uri;
  }
  if (index === 1) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    return result.canceled ? null : result.assets[0].uri;
  }
  if (hasPhoto && index === 2) return 'remove';
  return null;
}

// One photo from the library, any use (cards: front or barcode). null if cancelled.
export async function pickImageUri(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 0.9,
  });
  return result.canceled || result.assets.length === 0 ? null : result.assets[0].uri;
}
