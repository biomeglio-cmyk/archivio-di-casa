// Physical size of a document on paper, used to turn pixels into effective ppi.
// ID-1 cards (Identità, Tessere e card) are 85.6 × 54 mm; everything else is placed on an A4 page.

import type { Category } from '@/db/types';

export const MM_PER_INCH = 25.4;

export const A4_MM = { width: 210, height: 297 };
export const PAGE_MARGIN_MM = 10;
export const FACE_GAP_MM = 10; // space between front and back on the same page
export const CARD_MM = { width: 85.6, height: 54 };

export type PrintFormat = 'card' | 'a4';

// The built-in categories can't change icon, so the icon identifies them even after a rename
const CARD_SYMBOLS = new Set(['person.text.rectangle', 'creditcard']);

export function printFormatFor(category: Pick<Category, 'isBuiltin' | 'symbol'>): PrintFormat {
  return category.isBuiltin && CARD_SYMBOLS.has(category.symbol) ? 'card' : 'a4';
}

// Box available for one face, in mm. On a shared A4 page each face gets half of the height.
function faceBox(format: PrintFormat, sharedPage: boolean) {
  if (format === 'card') return CARD_MM;
  const width = A4_MM.width - PAGE_MARGIN_MM * 2;
  const fullHeight = A4_MM.height - PAGE_MARGIN_MM * 2;
  return { width, height: sharedPage ? (fullHeight - FACE_GAP_MM) / 2 : fullHeight };
}

// Printed size in mm of an image with this aspect ratio (width / height), fitted in its box
export function printedSizeMm(format: PrintFormat, aspect: number, sharedPage: boolean) {
  const box = faceBox(format, sharedPage);
  const width = Math.min(box.width, box.height * aspect);
  return { width, height: width / aspect };
}

// Effective pixels per inch of an image printed this wide
export function effectivePpi(pixelWidth: number, printedWidthMm: number): number {
  return pixelWidth / (printedWidthMm / MM_PER_INCH);
}

// Largest pixel width allowed by a ppi limit for this printed width
export function maxPixelWidth(maxPpi: number, printedWidthMm: number): number {
  return Math.round(maxPpi * (printedWidthMm / MM_PER_INCH));
}
