import { router } from 'expo-router';

import { CARD_QUALITY, scanDocument } from '@/capture/scan-document';

// "Nuova tessera": first the iOS scanner for the front (edges found, straight crop of the card;
// a one-time tip tells how to keep the true colors), then the app camera for the barcode, which
// reads the code live. The scanner opens from the current screen, before navigating, so two
// screens never animate in at the same time. No scanner → the app camera does the front too
// (CardCapture: full sensor size, no downscale, tap to focus, automatic multi-camera device).
// "Annulla" in the scanner opens nothing: the user stays where they were.
// TODO(dev build): try our own camera for the front with macro (it doesn't activate in Expo Go)
// plus our own edge detection, to keep true colors without the scanner's filters.
export async function startAddCard(navigation: 'push' | 'replace'): Promise<void> {
  const result = await scanDocument({ tip: 'card', quality: CARD_QUALITY });
  if (result === 'cancelled') return;
  if (result === 'unavailable') {
    router[navigation]('/add-card');
    return;
  }
  // The scanner may return several pages: a card has one, the first
  router[navigation]({ pathname: '/add-card', params: { front: result.pages[0] } });
}
