import { addDatabaseChangeListener, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect } from 'react';

import { openPdf, PdfError } from '@/pdf/pdf-renderer';
import { deleteStoredFile, resolveDocumentFile } from '@/storage/document-files';

// Page 1 of every imported PDF, drawn once as a JPEG next to the file ("…-thumb.jpg" in
// documents/, so backups carry it): the image of the document in tiles, covers, the detail and
// Preferiti, like a scan. Runs in the background, one PDF at a time: right after an import, and
// once for the PDFs imported before this existed (or restored from an older backup). A protected
// or damaged PDF is marked as such and keeps the generic PDF icon; one that took too long is tried
// again at the next launch.
const THUMB_WIDTH = 1000; // px
const THUMB_QUALITY = 0.85;
const START_DELAY_MS = 1500; // after the launch work (database, notifications, Home)
const BATCH = 10;

type PendingRow = { id: number; path: string; page_count: number | null };

// "documents/123-file.pdf" → "documents/123-file-thumb.jpg"
export function thumbPathFor(pdfPath: string): string {
  return `${pdfPath.replace(/\.pdf$/i, '')}-thumb.jpg`;
}

async function drawPageOne(db: SQLiteDatabase, row: PendingRow, later: Set<number>): Promise<void> {
  const source = resolveDocumentFile(row.path);
  if (!source.exists) {
    await db.runAsync(`UPDATE document_files SET preview_state = 'invalid' WHERE id = ?`, row.id);
    return;
  }
  let pdf: Awaited<ReturnType<typeof openPdf>> | null = null;
  try {
    pdf = await openPdf(source.uri);
    const page = await pdf.render(1, THUMB_WIDTH, THUMB_QUALITY);
    const thumbPath = thumbPathFor(row.path);
    await resolveDocumentFile(thumbPath).write(page.base64, { encoding: 'base64' });
    const result = await db.runAsync(
      `UPDATE document_files SET thumb_path = ?, preview_state = 'ok', page_count = COALESCE(page_count, ?) WHERE id = ?`,
      thumbPath,
      pdf.pages,
      row.id,
    );
    if (result.changes === 0) deleteStoredFile(thumbPath); // the PDF was removed meanwhile
  } catch (error) {
    const reason = error instanceof PdfError ? error.reason : 'invalid';
    if (reason === 'password' || reason === 'invalid') {
      await db.runAsync('UPDATE document_files SET preview_state = ? WHERE id = ?', reason, row.id);
    } else {
      later.add(row.id); // too slow or pdf.js not available now: next launch
    }
  } finally {
    pdf?.close();
  }
}

// Mounted once inside the SQLiteProvider; draws nothing
export function PdfPreviews() {
  const db = useSQLiteContext();

  useEffect(() => {
    let active = true;
    let running = false;
    let again = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const later = new Set<number>();

    const run = async () => {
      if (running) {
        again = true;
        return;
      }
      running = true;
      try {
        while (active) {
          const rows = await db.getAllAsync<PendingRow>(
            `SELECT id, path, page_count FROM document_files
             WHERE kind = 'pdf' AND preview_state IS NULL ORDER BY id DESC LIMIT ${BATCH + later.size}`,
          );
          const next = rows.filter((row) => !later.has(row.id));
          if (next.length === 0) break;
          for (const row of next) {
            if (!active) break;
            await drawPageOne(db, row, later);
          }
        }
      } catch {
        // the database is closing (restore of a backup): the next launch continues
      } finally {
        running = false;
        if (again && active) {
          again = false;
          void run();
        }
      }
    };

    const schedule = (delay: number) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void run();
      }, delay);
    };

    schedule(START_DELAY_MS);
    // A new PDF saved (or a backup restored): its page 1 shortly after
    const subscription = addDatabaseChangeListener((event) => {
      if (event.tableName === 'document_files') schedule(400);
    });
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [db]);

  return null;
}
