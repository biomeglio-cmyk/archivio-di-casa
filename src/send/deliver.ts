import { Directory, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

import type { PreparedFile } from '@/send/prepare';

function typeOf(file: PreparedFile) {
  return file.name.endsWith('.pdf')
    ? { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' }
    : { mimeType: 'image/jpeg', UTI: 'public.jpeg' };
}

// iOS share sheet (WhatsApp, Mail, Messaggi, AirDrop…). It takes one file at a time in Expo Go,
// so two JPEGs open it twice; if the first one is dismissed, the second is not shown.
export async function shareFiles(files: PreparedFile[], title: string): Promise<void> {
  if (files.length === 1) {
    await Sharing.shareAsync(files[0].uri, { ...typeOf(files[0]), dialogTitle: title });
    return;
  }
  for (const file of files) {
    const result = await Share.share({ url: file.uri, title: file.name });
    if (result.action === Share.dismissedAction) return;
  }
}

// "Salva su File": the user picks a folder in the Files app, the files are copied there.
// Returns false if the user cancelled the folder picker.
export async function saveToFiles(files: PreparedFile[]): Promise<boolean> {
  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync();
  } catch {
    return false; // picker closed
  }
  for (const file of files) {
    let target = new File(directory, file.name);
    // Never overwrite something already in that folder: "nome-2.pdf", "nome-3.pdf"…
    for (let n = 2; target.exists; n++) {
      target = new File(directory, file.name.replace(/(\.[a-z]+)$/, `-${n}$1`));
    }
    await new File(file.uri).copy(target);
  }
  return true;
}
