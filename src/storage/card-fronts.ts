import { ImageFormat, Skia, TileMode } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { CARD_ASPECT_RATIO } from '@/capture/guide-frame';
import { listDocumentFiles } from '@/db/documents';
import { cleanPathFor, originalMarkerFor, resolveDocumentFile } from '@/storage/document-files';

// "Tessere e card" shows a CLEANER copy of each card front: edges trimmed, cropped to the card
// shape, a little more contrast and color. It lives next to the original photo, which is kept:
//   documents/123-abc-card_front.jpg            the original (what the database points to)
//   documents/123-abc-card_front-clean.jpg      the processed copy (made here)
//   documents/123-abc-card_front-original       empty marker: "Usa la foto originale"
// No database change: the backup takes the whole folder, and deleteStoredFile removes the siblings.

const INSET = 0.03; // trimmed from each side: the card edges and the table around them
const OUTPUT_WIDTH = 1000; // px, plenty for a tile and for the 2x/3x screens
const OUTPUT_HEIGHT = Math.round(OUTPUT_WIDTH / CARD_ASPECT_RATIO);

const SATURATION = 1.25; // +25%
const CONTRAST = 1.15; // +15%
const BRIGHTNESS = 0.03; // +3%, on a 0…1 scale
const SHARPEN = 0.12; // weight of the 4 neighbours in the 3×3 sharpen kernel

export function usesOriginalFront(relativePath: string): boolean {
  return resolveDocumentFile(originalMarkerFor(relativePath)).exists;
}

// The photo to show in the wallet: the clean copy when it exists (null while it is still missing)
export function cleanFrontUri(relativePath: string): string | null {
  const clean = resolveDocumentFile(cleanPathFor(relativePath));
  return clean.exists ? clean.uri : null;
}

// "Usa la foto originale" on → marker, and the clean copy goes; off → marker goes, copy is remade
export async function setUseOriginalFront(relativePath: string, useOriginal: boolean): Promise<void> {
  const marker = resolveDocumentFile(originalMarkerFor(relativePath));
  if (useOriginal) {
    if (!marker.exists) marker.create();
    const clean = resolveDocumentFile(cleanPathFor(relativePath));
    if (clean.exists) clean.delete();
    notify(relativePath);
  } else {
    if (marker.exists) marker.delete();
    await ensureCleanFront(relativePath);
  }
}

// After "Salva" in Nuova carta / Modifica carta: the saved front gets its clean copy right away
// (in the background), or the "Usa la foto originale" marker
export async function applyCardFrontChoice(db: SQLiteDatabase, cardId: number, useOriginal: boolean): Promise<void> {
  const files = await listDocumentFiles(db, cardId);
  const front = files.find((f) => f.kind === 'image' && (f.side === 'card_front' || f.side === 'front'));
  if (front) await setUseOriginalFront(front.path, useOriginal);
}

// ---- Processing queue: one photo at a time, never twice, never retried after a failure ----

type Listener = (relativePath: string) => void;
const listeners = new Set<Listener>();
const failed = new Set<string>();
let queue: Promise<void> = Promise.resolve();
const pending = new Map<string, Promise<void>>();

export function onCleanFrontChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(relativePath: string) {
  listeners.forEach((listener) => listener(relativePath));
}

// Makes the clean copy if it is missing (and not refused with "Usa la foto originale").
// Safe to call on every display: it does the work once.
export function ensureCleanFront(relativePath: string): Promise<void> {
  if (failed.has(relativePath) || usesOriginalFront(relativePath) || cleanFrontUri(relativePath)) {
    return Promise.resolve();
  }
  const running = pending.get(relativePath);
  if (running) return running;

  const job = queue
    .then(() => processFront(relativePath))
    .then(() => notify(relativePath))
    .catch((error) => {
      failed.add(relativePath); // the original stays on screen: better plain than nothing
      if (__DEV__) console.warn('Card front not processed', relativePath, error);
    })
    .finally(() => pending.delete(relativePath));
  pending.set(relativePath, job);
  queue = job;
  return job;
}

async function processFront(relativePath: string): Promise<void> {
  const source = resolveDocumentFile(relativePath);
  if (!source.exists) throw new Error('missing photo');

  // 1. Geometry with the native manipulator (it also applies the EXIF orientation):
  //    trim INSET from every side, then the largest centered card-shaped rectangle, then resize
  const probe = await ImageManipulator.manipulate(source.uri).renderAsync();
  const { width, height } = probe;
  const innerWidth = width * (1 - 2 * INSET);
  const innerHeight = height * (1 - 2 * INSET);
  const cropWidth = Math.min(innerWidth, innerHeight * CARD_ASPECT_RATIO);
  const cropHeight = cropWidth / CARD_ASPECT_RATIO;
  const shaped = await ImageManipulator.manipulate(source.uri)
    .crop({
      originX: Math.round((width - cropWidth) / 2),
      originY: Math.round((height - cropHeight) / 2),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight),
    })
    .resize({ width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT })
    .renderAsync();
  const step = await shaped.saveAsync({ format: SaveFormat.JPEG, compress: 0.95 });

  // 2. Color and sharpness with Skia, drawn on an off-screen (CPU) surface
  const image = Skia.Image.MakeImageFromEncoded(await Skia.Data.fromURI(step.uri));
  const surface = Skia.Surface.Make(OUTPUT_WIDTH, OUTPUT_HEIGHT);
  if (!image || !surface) throw new Error('Skia unavailable');
  const paint = Skia.Paint();
  paint.setColorFilter(Skia.ColorFilter.MakeMatrix(enhanceMatrix()));
  const k = SHARPEN;
  paint.setImageFilter(
    Skia.ImageFilter.MakeMatrixConvolution(3, 3, [0, -k, 0, -k, 1 + 4 * k, -k, 0, -k, 0], 1, 0, 1, 1, TileMode.Clamp, false),
  );
  surface
    .getCanvas()
    .drawImageRect(
      image,
      Skia.XYWHRect(0, 0, image.width(), image.height()),
      Skia.XYWHRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT),
      paint,
    );
  surface.flush();
  const bytes = surface.makeImageSnapshot().encodeToBytes(ImageFormat.JPEG, 88);
  new File(step.uri).delete();

  // 3. Written in the cache first, then moved: a half-written file never looks finished
  const temporary = new File(Paths.cache, `clean-${Date.now()}.jpg`);
  await temporary.write(bytes);
  await temporary.move(resolveDocumentFile(cleanPathFor(relativePath)), { overwrite: true });
}

// Saturation, then contrast around mid-grey, plus a little brightness (Skia 4×5 matrix, offsets 0…1)
function enhanceMatrix(): number[] {
  const [lr, lg, lb] = [0.2126, 0.7152, 0.0722]; // luminance weights
  const s = SATURATION;
  const c = CONTRAST;
  const offset = 0.5 * (1 - c) + BRIGHTNESS;
  const rows = [
    [lr * (1 - s) + s, lg * (1 - s), lb * (1 - s)],
    [lr * (1 - s), lg * (1 - s) + s, lb * (1 - s)],
    [lr * (1 - s), lg * (1 - s), lb * (1 - s) + s],
  ];
  return [...rows.flatMap((row) => [...row.map((v) => v * c), offset]), 0, 0, 0, 1, 0];
}
