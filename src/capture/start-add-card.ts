import { router } from 'expo-router';

// "Nuova tessera": our own camera for the front and then for the barcode (CardCapture). Not the
// iOS document scanner: it "enhances" the colors like paper (yellowish) and never uses macro.
// Documents keep the scanner.
export async function startAddCard(navigation: 'push' | 'replace'): Promise<void> {
  router[navigation]('/add-card');
}
