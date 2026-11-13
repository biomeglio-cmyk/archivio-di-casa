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

// Cards: small on the page, so every detail counts (logo, number)
export const CARD_QUALITY = 1;

const TIPS = {
  // The iOS scanner keeps going page after page, but that isn't obvious
  document: {
    key: 'scanner.tipShown',
    title: 'Più pagine',
    text: 'Puoi scansionare più pagine di fila: inquadra la pagina successiva prima di toccare Salva.',
  },
  // The scanner "enhances" a card like paper (yellowish); its filter button has "Foto"
  card: {
    key: 'scanner.cardTipShown',
    title: 'Colori veri',
    text: 'Per i colori veri della tessera tocca il pulsante dei filtri nello scanner e scegli «Foto».',
  },
} as const;

// Shown once, the first time the scanner opens for that kind
function showTipOnce(kind: keyof typeof TIPS): Promise<void> {
  const tip = TIPS[kind];
  if (Storage.getItemSync(tip.key) === '1') return Promise.resolve();
  Storage.setItemSync(tip.key, '1');
  return new Promise((resolve) => {
    Alert.alert(tip.title, tip.text, [{ text: 'Ho capito', onPress: () => resolve() }], { cancelable: false });
  });
}

// `tip`: 'document' (multi-page), 'card' (true colors) or false (none)
export async function scanDocument({
  tip = 'document',
  quality = PAGE_QUALITY,
}: { tip?: keyof typeof TIPS | false; quality?: number } = {}): Promise<ScanResult> {
  if (!isScannerAvailable()) return 'unavailable';
  if (tip) await showTipOnce(tip);
  try {
    const result = await CameraView.scanDocumentAsync({ quality });
    if (!result || result.pages.length === 0) return 'cancelled';
    return { pages: result.pages };
  } catch {
    // On iOS a missing scanner throws instead of returning null: the camera takes over
    return 'unavailable';
  }
}
