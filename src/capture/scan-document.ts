import { CameraView } from 'expo-camera';
import Storage from 'expo-sqlite/kv-store';
import { Alert } from 'react-native';


// iOS document scanner (VisionKit, the same as Note and WhatsApp): finds the edges of the paper,
// straightens it and lets the user shoot several pages. Pages arrive as JPEGs in the cache;
// they are copied into documents/ only when the document is saved, like the camera photos.

// 'cancelled' = the user tapped Annulla: go back where they were, open nothing else.
// 'unavailable' = no scanner here (simulator, old device, or the call failed): use the app camera
export type ScanResult = { pages: string[] } | 'cancelled' | 'unavailable';

const PAGE_QUALITY = 0.85; // documents: same as the photos chosen from the library

export function isScannerAvailable(): boolean {
  // Read defensively: on a native side without the scanner the property is simply missing
  return CameraView.isDocumentScannerAvailable === true && typeof CameraView.scanDocumentAsync === 'function';
}

const TIP_KEY = 'scanner.tipShown';

// Shown once, the first time the scanner opens for a document: the iOS scanner keeps going
// page after page, but that isn't obvious
function showTipOnce(): Promise<void> {
  if (Storage.getItemSync(TIP_KEY) === '1') return Promise.resolve();
  Storage.setItemSync(TIP_KEY, '1');
  return new Promise((resolve) => {
    Alert.alert(
      'Più pagine',
      'Puoi scansionare più pagine di fila: inquadra la pagina successiva prima di toccare Salva.',
      [{ text: 'Ho capito', onPress: () => resolve() }],
      { cancelable: false },
    );
  });
}

// `tip: false` for cards (one side, no multi-page tip)
export async function scanDocument({ tip = true, quality = PAGE_QUALITY }: { tip?: boolean; quality?: number } = {}): Promise<ScanResult> {
  if (!isScannerAvailable()) return 'unavailable';
  if (tip) await showTipOnce();
  try {
    const result = await CameraView.scanDocumentAsync({ quality });
    if (!result || result.pages.length === 0) return 'cancelled';
    return { pages: result.pages };
  } catch {
    // On iOS a missing scanner throws instead of returning null: the camera takes over
    return 'unavailable';
  }
}
