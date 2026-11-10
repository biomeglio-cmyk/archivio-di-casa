import { Directory, File, Paths } from 'expo-file-system';

import type { ComposeOptions } from '@/components/front-back-composer';
import type { Category, DocumentFile } from '@/db/types';
import { resolveDocumentFile } from '@/storage/document-files';
import { compressToLimit, type LadderStep, type QualityLabel, type Rendered } from '@/send/compression';
import { imageSize, renderImage } from '@/send/images';
import { buildPdf, type PdfFace, type PdfPage } from '@/send/pdf';
import { effectivePpi, printFormatFor, printedSizeMm, type PrintFormat } from '@/send/physical-size';

// From the documents and the options of the "Invia" sheet to ready-to-share files in the cache.
// The originals in documents/ are only read, never changed.

export type SendFormat = 'pdf' | 'jpeg';

export type SendOptions = {
  format: SendFormat;
  together: boolean; // PDF: front and back on one page · JPEG: one combined image
  limitBytes: number | null; // null = "Originale"
};

export type SendDocument = {
  title: string;
  category: Pick<Category, 'isBuiltin' | 'symbol'>;
  files: DocumentFile[];
};

export type PreparedFile = { uri: string; name: string; bytes: number };

export type PreparedSend = {
  files: PreparedFile[];
  pages: number | null; // PDF pages (null for JPEG or an imported PDF we don't open)
  bytes: number; // total
  quality: QualityLabel | 'Originale';
  warnings: string[];
};

// Draws two faces into one JPEG (the off-screen FrontBackComposer of the sheet)
export type Composer = (options: ComposeOptions) => Promise<{ uri: string; width: number }>;

const OUTPUT_FOLDER = 'invio';

type Face = { uri: string; side: 'front' | 'back'; aspect: number };

async function facesOf(doc: SendDocument): Promise<Face[]> {
  const images = doc.files
    .filter((f) => f.kind === 'image')
    .sort((a, b) => (a.side === 'back' ? 1 : 0) - (b.side === 'back' ? 1 : 0));
  const faces: Face[] = [];
  for (const file of images) {
    const uri = resolveDocumentFile(file.path).uri;
    const size = await imageSize(uri);
    faces.push({ uri, side: file.side === 'back' ? 'back' : 'front', aspect: size.width / size.height });
  }
  return faces;
}

// Copies a result into Paths.cache/invio/ with its readable name (replacing an older copy)
async function toOutput(uri: string, name: string): Promise<PreparedFile> {
  const directory = new Directory(Paths.cache, OUTPUT_FOLDER);
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  const target = new File(directory, name);
  if (target.exists) target.delete();
  await new File(uri).copy(target);
  return { uri: target.uri, name, bytes: target.size ?? 0 };
}

function fileBytes(uri: string): number {
  return new File(uri).size ?? 0;
}

// ---- PDF from photos ----

type PdfResult = { uri: string; pages: number };

async function renderPdf(
  docs: { faces: Face[]; format: PrintFormat }[],
  together: boolean,
  step: LadderStep | null, // null = original images, untouched
): Promise<Rendered<PdfResult>> {
  const pages: PdfPage[] = [];
  let ppi = Infinity;
  for (const doc of docs) {
    const shared = together && doc.faces.length > 1;
    const rendered: PdfFace[] = [];
    for (const face of doc.faces) {
      const printed = printedSizeMm(doc.format, face.aspect, shared);
      if (step) {
        const image = await renderImage(face.uri, printed.width, step);
        ppi = Math.min(ppi, image.ppi);
        rendered.push({ uri: image.uri, widthMm: printed.width, heightMm: printed.height });
      } else {
        const size = await imageSize(face.uri);
        ppi = Math.min(ppi, effectivePpi(size.width, printed.width));
        rendered.push({ uri: face.uri, widthMm: printed.width, heightMm: printed.height });
      }
    }
    if (shared) pages.push({ faces: rendered });
    else rendered.forEach((face) => pages.push({ faces: [face] }));
  }
  const pdf = await buildPdf(pages);
  return { ...pdf, bytes: fileBytes(pdf.uri), ppi };
}

// ---- JPEG ----

type JpegResult = { uris: string[] };

async function renderJpeg(
  faces: Face[],
  format: PrintFormat,
  together: boolean,
  step: LadderStep | null,
  composer: Composer | null,
): Promise<Rendered<JpegResult>> {
  if (together && faces.length > 1) {
    if (!composer) throw new Error('Impossibile unire fronte e retro in questo momento.');
    // The combined image is as wide as one face printed at its size
    const printedWidth = printedSizeMm(format, faces[0].aspect, false).width;
    const width = step ? Math.round((step.maxPpi * printedWidth) / 25.4 * step.scale) : undefined;
    const result = await composer({ width, quality: (step?.quality ?? 90) / 100 });
    return { uris: [result.uri], bytes: fileBytes(result.uri), ppi: effectivePpi(result.width, printedWidth) };
  }

  const uris: string[] = [];
  let bytes = 0;
  let ppi = Infinity;
  for (const face of faces) {
    const printed = printedSizeMm(format, face.aspect, false);
    if (step) {
      const image = await renderImage(face.uri, printed.width, step);
      uris.push(image.uri);
      bytes += fileBytes(image.uri);
      ppi = Math.min(ppi, image.ppi);
    } else {
      uris.push(face.uri); // original file, copied as is
      bytes += fileBytes(face.uri);
      ppi = Math.min(ppi, effectivePpi((await imageSize(face.uri)).width, printed.width));
    }
  }
  return { uris, bytes, ppi };
}

// ---- Entry point ----

export async function prepareSend(
  docs: SendDocument[],
  options: SendOptions,
  baseName: string,
  composer: Composer | null,
): Promise<PreparedSend> {
  // An imported PDF goes out as it is (its compression comes in a later phase)
  const importedPdf = docs.length === 1 ? docs[0].files.find((f) => f.kind === 'pdf') : undefined;
  if (importedPdf) {
    const file = await toOutput(resolveDocumentFile(importedPdf.path).uri, `${baseName}.pdf`);
    return { files: [file], pages: null, bytes: file.bytes, quality: 'Originale', warnings: [] };
  }

  const prepared = await Promise.all(
    docs.map(async (doc) => ({ faces: await facesOf(doc), format: printFormatFor(doc.category) })),
  );
  const withFaces = prepared.filter((d) => d.faces.length > 0);
  if (withFaces.length === 0) throw new Error('Nessuna foto da inviare.');

  // Several documents always become one PDF, each document on its own page
  const format: SendFormat = docs.length > 1 ? 'pdf' : options.format;
  const together = docs.length > 1 ? true : options.together;

  if (format === 'pdf') {
    if (options.limitBytes === null) {
      const pdf = await renderPdf(withFaces, together, null);
      return single(await toOutput(pdf.uri, `${baseName}.pdf`), pdf.pages, 'Originale', []);
    }
    const result = await compressToLimit((step) => renderPdf(withFaces, together, step), options.limitBytes);
    const file = await toOutput(result.output.uri, `${baseName}.pdf`);
    return single(file, result.output.pages, result.qualityLabel, result.warnings);
  }

  const { faces, format: printFormat } = withFaces[0];
  const render = (step: LadderStep | null) => renderJpeg(faces, printFormat, together, step, composer);
  let output: Rendered<JpegResult>;
  let quality: QualityLabel | 'Originale' = 'Originale';
  let warnings: string[] = [];
  if (options.limitBytes === null) {
    output = await render(null);
  } else {
    const result = await compressToLimit(render, options.limitBytes);
    output = result.output;
    quality = result.qualityLabel;
    warnings = result.warnings;
  }

  const names =
    output.uris.length === 1 ? [`${baseName}.jpg`] : [`${baseName}-fronte.jpg`, `${baseName}-retro.jpg`];
  const files: PreparedFile[] = [];
  for (const [index, uri] of output.uris.entries()) {
    files.push(await toOutput(uri, names[index]));
  }
  return { files, pages: null, bytes: files.reduce((sum, f) => sum + f.bytes, 0), quality, warnings };
}

function single(file: PreparedFile, pages: number, quality: QualityLabel | 'Originale', warnings: string[]): PreparedSend {
  return { files: [file], pages, bytes: file.bytes, quality, warnings };
}
