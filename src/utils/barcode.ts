import { toSVG } from 'bwip-js/generic';

// A barcode drawn from its value (pure JavaScript, bwip-js): sharp black bars on white at any
// size, much easier for the checkout scanner than a photo. The camera tells us the format.

type Symbology = { bcid: string; twoD: boolean };

// expo-camera format → bwip-js encoder. iOS sometimes reports the Apple names ("org.gs1.EAN-13").
const SYMBOLOGIES: Record<string, Symbology> = {
  ean13: { bcid: 'ean13', twoD: false },
  'org.gs1.ean-13': { bcid: 'ean13', twoD: false },
  ean8: { bcid: 'ean8', twoD: false },
  'org.gs1.ean-8': { bcid: 'ean8', twoD: false },
  upc_a: { bcid: 'upca', twoD: false },
  upc_e: { bcid: 'upce', twoD: false },
  'org.gs1.upc-e': { bcid: 'upce', twoD: false },
  code128: { bcid: 'code128', twoD: false },
  'org.iso.code128': { bcid: 'code128', twoD: false },
  code39: { bcid: 'code39', twoD: false },
  'org.iso.code39': { bcid: 'code39', twoD: false },
  itf14: { bcid: 'itf14', twoD: false },
  'org.gs1.itf14': { bcid: 'itf14', twoD: false },
  qr: { bcid: 'qrcode', twoD: true },
  'org.iso.qrcode': { bcid: 'qrcode', twoD: true },
  pdf417: { bcid: 'pdf417', twoD: true },
  'org.iso.pdf417': { bcid: 'pdf417', twoD: true },
  datamatrix: { bcid: 'datamatrix', twoD: true },
  'org.iso.datamatrix': { bcid: 'datamatrix', twoD: true },
};

export type GeneratedBarcode = {
  xml: string; // a complete <svg> document
  aspect: number; // width / height, to size it without stretching
  twoD: boolean; // QR, PDF417, DataMatrix: shown upright, not turned sideways
};

// The SVG of the code, or null when the format is unknown or the value doesn't fit it
// (e.g. an EAN-13 typed with 12 wrong digits): then the photo is shown instead
export function generateBarcode(value: string | null, type: string | null): GeneratedBarcode | null {
  if (!value || !type) return null;
  const symbology = SYMBOLOGIES[type.toLowerCase()];
  if (!symbology) return null;
  try {
    const xml = toSVG({
      bcid: symbology.bcid,
      text: value,
      scale: 3,
      includetext: false, // the number is written under it in the app's own font
      backgroundcolor: 'FFFFFF',
      barcolor: '000000',
      // Quiet zones, in modules: at least 10 on the sides of a 1D code, 4 around a 2D one
      ...(symbology.twoD ? { padding: 4 } : { height: 20, paddingwidth: 12, paddingheight: 2 }),
    });
    const box = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(xml);
    if (!box) return null;
    return { xml, aspect: Number(box[1]) / Number(box[2]), twoD: symbology.twoD };
  } catch {
    return null;
  }
}
