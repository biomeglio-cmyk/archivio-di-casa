import { router } from 'expo-router';
import { Alert } from 'react-native';

import { pickPdf, pickPhotos } from '@/capture/pick-files';
import { scanDocument } from '@/capture/scan-document';
import { t } from '@/i18n';
import { encodePendingFiles, pagesToFiles, type PendingFile } from '@/storage/pending-files';

// The ways to add a document, shared by the "+" sheet and the Menu. Both are sheets, so they are
// REPLACED by "Nuovo documento": after saving, the form closes straight back to the tab.

// "Scansiona": the iOS scanner; without it, the app camera. "Annulla" in the scanner: stay on the sheet.
export async function addByScan(): Promise<void> {
  const result = await scanDocument();
  if (result === 'cancelled') return;
  if (result === 'unavailable') {
    router.replace('/capture');
    return;
  }
  openNewDocument(pagesToFiles(result.pages));
}

// "Scegli dalle foto": any number of photos, as pages in the order they were picked
export function addFromPhotos(): Promise<void> {
  return attach(pickPhotos);
}

// "Importa file": one PDF from the Files app
export function addFromFiles(): Promise<void> {
  return attach(pickPdf);
}

// Runs a picker; if the user chose something, the sheet is replaced by the form
async function attach(pick: () => Promise<PendingFile[] | null>): Promise<void> {
  try {
    const files = await pick();
    if (files) openNewDocument(files);
  } catch (error) {
    Alert.alert(t('addActions.openFileFailed'), String(error));
  }
}

function openNewDocument(files: PendingFile[]) {
  router.replace({ pathname: '/new-document', params: { files: encodePendingFiles(files) } });
}
