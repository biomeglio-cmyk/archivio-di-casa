import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { SQLiteDatabase } from 'expo-sqlite';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import { listDocumentFiles, listDocumentsByCategory } from '@/db/documents';
import type { DocumentFile, DocumentListItem } from '@/db/types';
import { compressToLimit, type LadderStep, type QualityLabel } from '@/send/compression';
import { fileBaseName } from '@/send/file-name';
import { imageSize, renderImage } from '@/send/images';
import { A4_MM, MM_PER_INCH, printFormatFor, printedSizeMm, effectivePpi } from '@/send/physical-size';
import type { PreparedFile } from '@/send/prepare';
import { resolveDocumentFile } from '@/storage/document-files';
import { formatDate, toISODate } from '@/utils/dates';
import { formatEuro } from '@/utils/money';

// "Prepara per il commercialista" (Spese 730): ONE PDF with an index page (title, date, person,
// page) and every document of the year, in date order: photos and imported PDFs together
// (pdf-lib, pure JavaScript). A PDF that cannot be opened (password-protected or damaged) is
// listed as "inviato a parte" and shared next to the main file, untouched.
// Photos follow the size limit with the same ladder as "Invia"; imported PDFs are copied as
// they are. Memory: one photo or one PDF at a time is read, embedded, then let go.

// The built-in key of "Spese 730" (its original icon): it survives a rename
export const TAX_CATEGORY_KEY = 'cross.case';

const PT_PER_MM = 72 / MM_PER_INCH;
const PAGE = { width: A4_MM.width * PT_PER_MM, height: A4_MM.height * PT_PER_MM };
const MARGIN = 40;
const ROW_HEIGHT = 18;
const HEADER_HEIGHT = 110; // title, subtitle and column names on the first index page
const ROWS_FIRST_PAGE = Math.floor((PAGE.height - 2 * MARGIN - HEADER_HEIGHT) / ROW_HEIGHT);
const ROWS_OTHER_PAGES = Math.floor((PAGE.height - 2 * MARGIN - 30) / ROW_HEIGHT);
const OUTPUT_FOLDER = 'invio';

// The date that places a document in a year: its deadline or payment day, else the day it was added
export function documentDate(document: DocumentListItem): string {
  return document.expiresAt ?? document.paidAt ?? toISODate(new Date(document.createdAt));
}

export const yearOf = (document: DocumentListItem) => Number(documentDate(document).slice(0, 4));

export type TaxItem = { document: DocumentListItem; date: string; files: DocumentFile[] };

// The documents of that year (null = every year), in date order (then title)
export async function loadTaxItems(db: SQLiteDatabase, categoryId: number, year: number | null): Promise<TaxItem[]> {
  const documents = await listDocumentsByCategory(db, categoryId);
  const items: TaxItem[] = [];
  for (const document of documents) {
    const date = documentDate(document);
    if (year !== null && Number(date.slice(0, 4)) !== year) continue;
    items.push({ document, date, files: await listDocumentFiles(db, document.id) });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || a.document.title.localeCompare(b.document.title, 'it'));
}

// Years that have documents, the most recent first
export async function taxYears(db: SQLiteDatabase, categoryId: number): Promise<number[]> {
  const documents = await listDocumentsByCategory(db, categoryId);
  return [...new Set(documents.map(yearOf))].sort((a, b) => b - a);
}

// "Spese 730 – 2026": the title of a year's PDF and its file name (kept readable)
export const yearTitle = (categoryName: string, year: number) => `${categoryName} – ${year}`;

export type YearPackages = { files: PreparedFile[]; years: { year: number; pages: number; bytes: number }[]; sentApart: string[]; warnings: string[] };

// "Tutti gli anni" (or one year): one PDF per year, each with its own index and total, then the
// PDFs that could not be merged; all the files together for one delivery
export async function buildYearPackages(
  items: TaxItem[],
  categoryName: string,
  limitBytes: number | null,
  onProgress?: (text: string) => void,
): Promise<YearPackages> {
  const byYear = new Map<number, TaxItem[]>();
  for (const item of items) {
    const year = Number(item.date.slice(0, 4));
    byYear.set(year, [...(byYear.get(year) ?? []), item]);
  }
  const result: YearPackages = { files: [], years: [], sentApart: [], warnings: [] };
  for (const year of [...byYear.keys()].sort((a, b) => b - a)) {
    const built = await buildTaxPackage(byYear.get(year)!, yearTitle(categoryName, year), limitBytes, (text) =>
      onProgress?.(byYear.size > 1 ? `${year}: ${text}` : text),
    );
    result.files.push(...built.files);
    result.years.push({ year, pages: built.pages, bytes: built.bytes });
    result.sentApart.push(...built.sentApart);
    result.warnings.push(...built.warnings.map((w) => (byYear.size > 1 ? `${year}: ${w}` : w)));
  }
  return result;
}

export type TaxPackage = {
  files: PreparedFile[]; // the main PDF first, then the PDFs sent apart
  pages: number;
  bytes: number; // the main PDF
  quality: QualityLabel | 'Originale';
  sentApart: string[]; // titles of the documents whose PDF could not be merged
  warnings: string[];
};

// One build, written to a file (never kept in memory between the attempts of the size ladder)
type Built = { uri: string; pages: number; ppi: number; sentApart: Set<number> };

// Builds the package; `limitBytes` null = "Originale" (photos at full size)
export async function buildTaxPackage(
  items: TaxItem[],
  title: string, // "Spese 730 · 2025"
  limitBytes: number | null,
  onProgress?: (text: string) => void,
): Promise<TaxPackage> {
  const work = new Directory(Paths.cache, 'commercialista');
  if (work.exists) work.delete();
  work.create({ intermediates: true });

  try {
    let built: Built & { bytes: number };
    let quality: QualityLabel | 'Originale' = 'Originale';
    const warnings: string[] = [];
    let attempt = 0;
    const render = async (step: LadderStep | null) => {
      attempt++;
      onProgress?.(attempt === 1 ? 'Preparo il PDF…' : `Riduco le foto (tentativo ${attempt})…`);
      const result = await buildPdf(items, title, step, new File(work, `tentativo-${attempt}.pdf`));
      return { ...result, bytes: new File(result.uri).size ?? 0 };
    };

    if (limitBytes === null) {
      built = await render(null);
    } else {
      const compressed = await compressToLimit(render, limitBytes);
      built = compressed.output;
      quality = compressed.qualityLabel;
      warnings.push(...compressed.warnings);
    }

    // The main PDF, then each PDF that could not be merged, with readable names
    const output = new Directory(Paths.cache, OUTPUT_FOLDER);
    if (!output.exists) output.create({ intermediates: true, idempotent: true });
    // "Spese 730 – 2026.pdf": readable, as the accountant sees it (no characters iOS refuses)
    const mainName = `${title.replace(/[\\/:*?"<>|]/g, '-')}.pdf`;
    const main = new File(output, mainName);
    if (main.exists) main.delete();
    await new File(built.uri).copy(main);
    const files: PreparedFile[] = [{ uri: main.uri, name: mainName, bytes: built.bytes }];

    const sentApart: string[] = [];
    for (const item of items) {
      if (!built.sentApart.has(item.document.id)) continue;
      sentApart.push(item.document.title);
      for (const [index, pdf] of item.files.filter((f) => f.kind === 'pdf').entries()) {
        const name = `${fileBaseName([item.document.title, index > 0 ? String(index + 1) : null])}.pdf`;
        const target = new File(output, name);
        if (target.exists) target.delete();
        await resolveDocumentFile(pdf.path).copy(target);
        files.push({ uri: target.uri, name, bytes: target.size ?? 0 });
      }
    }
    return { files, pages: built.pages, bytes: built.bytes, quality, sentApart, warnings };
  } finally {
    if (work.exists) work.delete();
  }
}

// One full build at one ladder step (null = original size), saved to `target`
async function buildPdf(items: TaxItem[], title: string, step: LadderStep | null, target: File): Promise<Built> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setCreator('Sottomano');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const startPage = new Map<number, number>(); // document id → first page (1-based, index included)
  const sentApart = new Set<number>();
  let ppi = Infinity;
  const indexPages = countIndexPages(items.length);

  for (const item of items) {
    const first = indexPages + pdf.getPageCount() + 1;
    const format = printFormatFor(item.document.category);

    // Photos: one A4 page each, centered at their printed size
    for (const file of item.files.filter((f) => f.kind === 'image')) {
      const uri = resolveDocumentFile(file.path).uri;
      const size = await imageSize(uri);
      const printed = printedSizeMm(format === 'card' ? 'card' : 'a4', size.width / size.height, false);
      const image = step
        ? await renderImage(uri, printed.width, step)
        : await asJpeg(uri, size, printed.width); // "Originale": full size, as JPEG (HEIC/PNG too)
      ppi = Math.min(ppi, image.ppi);
      const jpeg = await pdf.embedJpg(await new File(image.uri).bytes());
      new File(image.uri).delete(); // the rendered copy is not needed any more
      const width = printed.width * PT_PER_MM;
      const height = printed.height * PT_PER_MM;
      pdf.addPage([PAGE.width, PAGE.height]).drawImage(jpeg, {
        x: (PAGE.width - width) / 2,
        y: (PAGE.height - height) / 2,
        width,
        height,
      });
    }

    // Imported PDFs: their pages copied as they are; one that can't be opened goes apart
    for (const file of item.files.filter((f) => f.kind === 'pdf')) {
      try {
        const source = await PDFDocument.load(await resolveDocumentFile(file.path).bytes());
        const pages = await pdf.copyPages(source, source.getPageIndices());
        pages.forEach((page) => pdf.addPage(page));
      } catch {
        sentApart.add(item.document.id);
      }
    }
    if (indexPages + pdf.getPageCount() + 1 > first) startPage.set(item.document.id, first);
  }

  // The index, inserted in front now that every page number is known
  drawIndex(pdf, indexPages, items, title, startPage, sentApart, font, bold);

  await target.write(await pdf.save({ useObjectStreams: true }));
  return { uri: target.uri, pages: pdf.getPageCount(), ppi: ppi === Infinity ? 300 : ppi, sentApart };
}

// Index rows per page are fixed, so the number of index pages is known before drawing them
function countIndexPages(rows: number): number {
  return rows <= ROWS_FIRST_PAGE ? 1 : 1 + Math.ceil((rows - ROWS_FIRST_PAGE) / ROWS_OTHER_PAGES);
}

// "Originale": the photo at full size, re-encoded as JPEG only so pdf-lib can embed any format
async function asJpeg(uri: string, size: { width: number; height: number }, printedWidthMm: number) {
  const image = await ImageManipulator.manipulate(uri).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
  return { uri: saved.uri, ppi: effectivePpi(size.width, printedWidthMm) };
}

function drawIndex(
  pdf: PDFDocument,
  indexPages: number,
  items: TaxItem[],
  title: string,
  startPage: Map<number, number>,
  sentApart: Set<number>,
  font: PDFFont,
  bold: PDFFont,
) {
  const black = rgb(0.1, 0.1, 0.12);
  const grey = rgb(0.42, 0.42, 0.46);
  // Importo is right-aligned on its column end, Pagina on the right margin
  const columns = { number: MARGIN, title: MARGIN + 28, date: 250, person: 320, amount: 480, page: PAGE.width - MARGIN };
  const total = items.reduce((sum, item) => sum + (item.document.amountCents ?? 0), 0);

  // A new index page (inserted in front, in order) with the column names; returns where rows start
  const newPage = (pageIndex: number): { page: PDFPage; y: number } => {
    const page = pdf.insertPage(pageIndex, [PAGE.width, PAGE.height]);
    let y = PAGE.height - MARGIN;
    if (pageIndex === 0) {
      page.drawText(safe(title), { x: MARGIN, y: y - 20, size: 20, font: bold, color: black });
      const count = items.length === 1 ? '1 documento' : `${items.length} documenti`;
      const sum = total > 0 ? ` · totale ${formatEuro(total)}` : '';
      page.drawText(safe(`Preparato il ${formatDate(toISODate(new Date()))} con Sottomano · ${count}${sum}`), {
        x: MARGIN,
        y: y - 42,
        size: 10,
        font,
        color: grey,
      });
      y -= HEADER_HEIGHT - 28;
    }
    page.drawText('N.', { x: columns.number, y, size: 9, font: bold, color: grey });
    page.drawText('Documento', { x: columns.title, y, size: 9, font: bold, color: grey });
    page.drawText('Data', { x: columns.date, y, size: 9, font: bold, color: grey });
    page.drawText('Persona', { x: columns.person, y, size: 9, font: bold, color: grey });
    page.drawText('Importo', { x: columns.amount - bold.widthOfTextAtSize('Importo', 9), y, size: 9, font: bold, color: grey });
    page.drawText('Pagina', { x: columns.page - bold.widthOfTextAtSize('Pagina', 9), y, size: 9, font: bold, color: grey });
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE.width - MARGIN, y }, thickness: 0.5, color: grey });
    return { page, y: y - (ROW_HEIGHT - 4) };
  };

  let pageIndex = 0;
  let { page, y } = newPage(pageIndex);
  let rowsLeft = ROWS_FIRST_PAGE;
  items.forEach((item, index) => {
    if (rowsLeft === 0) {
      pageIndex++;
      ({ page, y } = newPage(pageIndex));
      rowsLeft = ROWS_OTHER_PAGES;
    }
    const { document } = item;
    const where = sentApart.has(document.id)
      ? 'inviato a parte'
      : startPage.has(document.id)
        ? String(startPage.get(document.id))
        : 'senza pagine';
    page.drawText(String(index + 1), { x: columns.number, y, size: 10, font, color: grey });
    // "Visita (Dentista) · pagata": the title with its Tipo and its payment status
    const status = document.paymentStatus === 'paid' ? ' · pagata' : document.paymentStatus === 'due' ? ' · da pagare' : '';
    const name = `${document.title}${document.docType ? ` (${document.docType})` : ''}${status}`;
    page.drawText(fit(name, font, 10, columns.date - columns.title - 8), { x: columns.title, y, size: 10, font, color: black });
    page.drawText(formatDate(item.date), { x: columns.date, y, size: 10, font, color: black });
    if (document.amountCents !== null) {
      const amount = safe(formatEuro(document.amountCents));
      page.drawText(amount, { x: columns.amount - font.widthOfTextAtSize(amount, 10), y, size: 10, font, color: black });
    }
    page.drawText(fit(document.personName ?? '—', font, 10, columns.amount - columns.person - 60), {
      x: columns.person,
      y,
      size: 10,
      font,
      color: black,
    });
    page.drawText(where, { x: columns.page - font.widthOfTextAtSize(where, 10), y, size: 10, font, color: black });
    y -= ROW_HEIGHT;
    rowsLeft--;
  });
  // The content page numbers were computed with this many index pages
  if (pageIndex + 1 !== indexPages) throw new Error('Indice non valido');
}

// Characters the standard PDF fonts can write (WinAnsi); anything else becomes "?"
const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
function safe(text: string): string {
  return [...text]
    .map((char) => {
      const code = char.charCodeAt(0);
      return (code >= 32 && code < 127) || (code >= 160 && code <= 255) || WIN_ANSI_EXTRA.includes(char) ? char : '?';
    })
    .join('');
}

// Cuts a text with "…" so it fits the column
function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  let value = safe(text);
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  while (value.length > 1 && font.widthOfTextAtSize(`${value}…`, size) > maxWidth) value = value.slice(0, -1);
  return `${value.trimEnd()}…`;
}
