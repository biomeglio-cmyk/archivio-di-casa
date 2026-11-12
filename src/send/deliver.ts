import * as Clipboard from 'expo-clipboard';
import { Directory, File } from 'expo-file-system';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
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
// With a message (the note of the document), the React Native sheet carries it next to the file.
export async function shareFiles(files: PreparedFile[], title: string, message: string | null = null): Promise<void> {
  if (files.length === 1 && message) {
    await Share.share({ url: files[0].uri, message, title });
    return;
  }
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

// "Email": a new message in Mail with the files attached, the name as subject and the note as text.
// Returns false when Mail has no account on this phone (the caller falls back to the share sheet).
export async function emailFiles(files: PreparedFile[], subject: string, body: string | null): Promise<boolean> {
  if (!(await MailComposer.isAvailableAsync())) return false;
  await MailComposer.composeAsync({ subject, body: body ?? '', attachments: files.map((f) => f.uri) });
  return true;
}

// "Stampa": the iOS print sheet (AirPrint). A PDF is printed as it is; photos one per page.
export async function printFiles(files: PreparedFile[]): Promise<void> {
  const pdf = files.find((f) => f.name.endsWith('.pdf'));
  if (pdf) {
    await Print.printAsync({ uri: pdf.uri });
    return;
  }
  const pages = files
    .map((f) => `<div style="page-break-after: always; text-align: center"><img src="${f.uri}" style="max-width: 100%; max-height: 100vh" /></div>`)
    .join('');
  await Print.printAsync({ html: `<html><body style="margin: 0">${pages}</body></html>` });
}

// "Copia": a photo goes to the clipboard as an image (the first one); a PDF can't, so its name,
// and the note when included, go as text. Returns what was copied.
export async function copyToClipboard(files: PreparedFile[], text: string): Promise<'image' | 'text'> {
  const image = files.find((f) => f.name.endsWith('.jpg') || f.name.endsWith('.jpeg'));
  if (image) {
    await Clipboard.setImageAsync(await new File(image.uri).base64());
    return 'image';
  }
  await Clipboard.setStringAsync(text);
  return 'text';
}
