import * as StoreReview from 'expo-store-review';
import { Alert, Share } from 'react-native';

import { enableAppLock } from '@/security/app-lock';

// Actions shared by the side menu and Impostazioni

const SHARE_TEXT =
  'Ti consiglio Sottomano: i documenti di casa, le tessere e le scadenze sempre a portata di mano, sul telefono e anche senza internet.';

// "Valuta Sottomano": the iOS rating prompt when available. iOS decides by itself whether to
// show it (a few times a year); before the app is on the App Store there is no page to open.
export async function rateApp(): Promise<void> {
  try {
    if (await StoreReview.hasAction()) {
      await StoreReview.requestReview();
      return;
    }
  } catch {
    // falls through to the message
  }
  Alert.alert('Valuta Sottomano', "Potrai lasciare una valutazione quando Sottomano sarà sull'App Store.");
}

// "Consiglialo a un amico": the iOS share sheet with a short text (the store link comes later)
export function recommendApp(): void {
  Share.share({ message: SHARE_TEXT }).catch(() => undefined);
}

// "Blocca con Face ID" turned on: it needs a passcode on the iPhone
export async function turnOnAppLock(): Promise<void> {
  const result = await enableAppLock();
  if (result === 'no-passcode') {
    Alert.alert(
      'Blocco non disponibile',
      "Per bloccare Sottomano serve un codice sull'iPhone. Impostalo in Impostazioni › Face ID e codice, poi riprova.",
    );
  }
}
