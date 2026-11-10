import { CameraView } from 'expo-camera';

import type { PendingFile } from '@/storage/pending-files';

// iOS document scanner (VisionKit, the same as Note and WhatsApp): finds the edges of the paper,
// straightens it and lets the user shoot several pages. Pages arrive as JPEGs in the cache;
// they are copied into documents/ only when the document is saved, like the camera photos.

// 'cancelled' = the user tapped Annulla: go back where they were, open nothing else.
// 'unavailable' = no scanner here (simulator, old device, or the call failed): use the app camera
export type ScanResult = { pages: string[] } | 'cancelled' | 'unavailable';

const PAGE_QUALITY = 0.85; // same as the photos chosen from the library

export function isScannerAvailable(): boolean {
  // Read defensively: on a native side without the scanner the property is simply missing
  return CameraView.isDocumentScannerAvailable === true && typeof CameraView.scanDocumentAsync === 'function';
}

export async function scanDocument(): Promise<ScanResult> {
  if (!isScannerAvailable()) return 'unavailable';
  try {
    const result = await CameraView.scanDocumentAsync({ quality: PAGE_QUALITY });
    if (!result || result.pages.length === 0) return 'cancelled';
    return { pages: result.pages };
  } catch {
    // On iOS a missing scanner throws instead of returning null: the camera takes over
    return 'unavailable';
  }
}

// Scanned pages as files of a new document: page 1 = front, page 2 = back, then only the page number
export function scannedPagesToFiles(pages: string[]): PendingFile[] {
  return pages.map((uri, index) => ({
    uri,
    kind: 'image',
    side: index === 0 ? 'front' : index === 1 ? 'back' : null,
    page: index + 1,
  }));
}
