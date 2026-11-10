import { router } from 'expo-router';

import { scanDocument } from '@/capture/scan-document';

// "Aggiungi carta": first the iOS scanner for the front (clean, straight crop of the card),
// then the app camera for the barcode, which reads the code live.
// The scanner opens from the current screen, before navigating, so two screens never animate
// in at the same time. No scanner → the app camera does the front too.
// "Annulla" in the scanner opens nothing: the user stays where they were.
export async function startAddCard(navigation: 'push' | 'replace'): Promise<void> {
  const result = await scanDocument({ tip: false });
  if (result === 'cancelled') return;
  if (result === 'unavailable') {
    router[navigation]('/add-card');
    return;
  }
  // The scanner may return several pages: a card has one, the first
  router[navigation]({ pathname: '/add-card', params: { front: result.pages[0] } });
}
