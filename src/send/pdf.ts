import { File } from 'expo-file-system';
import * as Print from 'expo-print';

import { A4_MM, FACE_GAP_MM, PAGE_MARGIN_MM } from '@/send/physical-size';

// A4 in PostScript points (1/72 inch), the unit expo-print uses for the page size
const A4_POINTS = { width: 595, height: 842 };

export type PdfFace = {
  uri: string; // local JPEG
  widthMm: number; // printed size: real size for cards, fitted for A4 documents
  heightMm: number;
};

export type PdfPage = { faces: PdfFace[] };

// Builds an A4 PDF offline: an HTML page per sheet with the images inline as base64,
// printed to a file by iOS. Every face is centered at its printed size.
export async function buildPdf(pages: PdfPage[]): Promise<{ uri: string; pages: number }> {
  const htmlPages: string[] = [];
  for (const page of pages) {
    const images: string[] = [];
    for (const face of page.faces) {
      const base64 = await new File(face.uri).base64();
      images.push(
        `<img src="data:image/jpeg;base64,${base64}" style="width:${face.widthMm.toFixed(2)}mm;height:${face.heightMm.toFixed(2)}mm" />`,
      );
    }
    htmlPages.push(`<div class="page">${images.join('')}</div>`);
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; }
  .page {
    width: ${A4_MM.width}mm;
    height: ${A4_MM.height - 0.5}mm; /* a hair under A4, so no blank page is added */
    padding: ${PAGE_MARGIN_MM}mm;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${FACE_GAP_MM}mm;
    overflow: hidden;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  img { display: block; object-fit: contain; }
</style></head><body>${htmlPages.join('')}</body></html>`;

  const result = await Print.printToFileAsync({
    html,
    width: A4_POINTS.width,
    height: A4_POINTS.height,
    margins: { left: 0, top: 0, right: 0, bottom: 0 },
  });
  return { uri: result.uri, pages: result.numberOfPages };
}
