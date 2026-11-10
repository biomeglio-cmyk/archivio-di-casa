import type { BarcodeType } from 'expo-camera';

// Background of a card without a photo of its front; the title is written in white on top
export const CARD_COLORS = [
  '#4B2A9A', // violet, like the "Tessere e card" category
  '#1E4A99', // blue
  '#0E5E6B', // teal
  '#1E6B3E', // green
  '#B8560B', // orange
  '#C8283D', // red
  '#92284F', // plum
  '#3A4558', // slate
] as const;

export const DEFAULT_CARD_COLOR = CARD_COLORS[0];

// Codes read by the camera: supermarket and loyalty cards (EAN, UPC, Code 128/39, ITF-14),
// plus QR, PDF417 and Data Matrix used by gyms, transport and memberships
export const CARD_BARCODE_TYPES: BarcodeType[] = [
  'ean13',
  'ean8',
  'code128',
  'code39',
  'upc_a',
  'upc_e',
  'qr',
  'pdf417',
  'itf14',
  'datamatrix',
];
