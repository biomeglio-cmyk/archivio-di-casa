import { router } from 'expo-router';

import { scanDocument } from '@/capture/scan-document';

// "Aggiungi carta": first the iOS scanner for the front (clean, straight crop of the card),
// then the app camera for the barcode, which reads the code live.
// The scanner opens from the current screen, before navigating, so two screens never animate
// in at the same time. No scanner or nothing scanned → the app camera does the front too.
export async function startAddCard(navigation: 'push' | 'replace'): Promise<void> {
  const result = await scanDocument();
  // The scanner may return several pages: a card has one, the first
  const params = typeof result === 'object' ? { front: result.pages[0] } : {};
  router[navigation]({ pathname: '/add-card', params });
}
