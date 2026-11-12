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

// ---- "Codice a barre" / "QR code" in Nuova tessera ----

export type CodeKind = 'bar' | 'qr'; // a 1D code, or a 2D one (QR, PDF417, Data Matrix)

const TYPE_NAMES: Record<string, string> = {
  ean13: 'EAN-13',
  ean8: 'EAN-8',
  upca: 'UPC-A',
  upce: 'UPC-E',
  code128: 'Code 128',
  code39: 'Code 39',
  itf14: 'ITF-14',
  qrcode: 'QR code',
  pdf417: 'PDF417',
  datamatrix: 'Data Matrix',
};

// "EAN-13", "QR code"… for "Trovato: codice a barre EAN-13"; null when unknown
export function barcodeTypeName(type: string | null): string | null {
  if (!type) return null;
  const symbology = SYMBOLOGIES[type.toLowerCase()];
  return symbology ? (TYPE_NAMES[symbology.bcid] ?? null) : null;
}

export function codeKindOf(type: string | null): CodeKind {
  return type && SYMBOLOGIES[type.toLowerCase()]?.twoD ? 'qr' : 'bar';
}

// GS1 check digit (EAN-8, EAN-13): the last digit must match the others
function validGs1(digits: string): boolean {
  const body = digits.slice(0, -1).split('').map(Number);
  const sum = body.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1));
}

// The format to draw a code typed by hand (or switched between "Codice a barre" and "QR code"):
// a valid EAN-13 / EAN-8 stays EAN (what supermarket cards use), any other text is Code 128,
// which every checkout scanner reads; "QR code" is a QR
export function typeForKind(value: string, kind: CodeKind): string | null {
  const clean = value.trim();
  if (!clean) return null;
  if (kind === 'qr') return 'qr';
  if (/^\d{13}$/.test(clean) && validGs1(clean)) return 'ean13';
  if (/^\d{8}$/.test(clean) && validGs1(clean)) return 'ean8';
  return 'code128';
}
