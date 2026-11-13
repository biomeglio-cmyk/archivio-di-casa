import { Directory, File, Paths } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';

import type { DocumentFile } from '@/db/types';
import { openPdf, PdfError, type OpenPdf, type PdfFailure } from '@/pdf/pdf-renderer';
import { resolveDocumentFile } from '@/storage/document-files';

// The pages of an imported PDF as images for "Visualizza", drawn with pdf.js only when they come
// near the screen (`want(page)`), one at a time, into the cache (deleted when the screen closes).
//   status 'loading' → 'ready' (pages known) or 'failed' (protected, damaged, too slow: the caller
//   falls back to the iOS PDF view)
export type PdfPageImage = { uri: string; ratio: number }; // ratio = width / height

export type PdfPages = {
  status: 'loading' | 'ready' | 'failed';
  failure: PdfFailure | null;
  pageCount: number;
  images: Record<number, PdfPageImage>;
  want: (pages: number[]) => void;
};

let session = 0;

export function usePdfPages(file: DocumentFile | null, width: number): PdfPages {
  const [status, setStatus] = useState<PdfPages['status']>('loading');
  const [failure, setFailure] = useState<PdfFailure | null>(null);
  const [pageCount, setPageCount] = useState(file?.pageCount ?? 0);
  const [images, setImages] = useState<Record<number, PdfPageImage>>({});
  const wanted = useRef<number[]>([]);
  const pump = useRef<() => void>(() => undefined);

  const fileId = file?.id ?? null;
  const path = file?.path ?? null;
  const pixels = Math.round(width);

  useEffect(() => {
    if (fileId === null || path === null || pixels <= 0) return;
    let active = true;
    let pdf: OpenPdf | null = null;
    let busy = false;
    const done = new Set<number>();
    const folder = new Directory(Paths.cache, `pdf-view-${++session}`);

    // Draws the wanted pages that are missing, closest first, one at a time
    const next = async () => {
      if (busy || !pdf || !active) return;
      const page = wanted.current.find((p) => !done.has(p) && p >= 1 && p <= pdf!.pages);
      if (page === undefined) return;
      busy = true;
      done.add(page);
      try {
        const result = await pdf.render(page, pixels, 0.85);
        if (!active) return;
        if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
        const target = new File(folder, `${page}.jpg`);
        await target.write(result.base64, { encoding: 'base64' });
        if (!active) return;
        setImages((current) => ({ ...current, [page]: { uri: target.uri, ratio: result.width / result.height } }));
      } catch {
        done.delete(page); // tried again when it is wanted again
      } finally {
        busy = false;
        if (active) void next();
      }
    };
    pump.current = () => void next();

    openPdf(resolveDocumentFile(path).uri).then(
      (opened) => {
        if (!active) {
          opened.close();
          return;
        }
        pdf = opened;
        setPageCount(opened.pages);
        setStatus('ready');
        if (wanted.current.length === 0) wanted.current = [1, 2];
        void next();
      },
      (error: unknown) => {
        if (!active) return;
        setFailure(error instanceof PdfError ? error.reason : 'invalid');
        setStatus('failed');
      },
    );

    return () => {
      active = false;
      pump.current = () => undefined;
      pdf?.close();
      try {
        if (folder.exists) folder.delete();
      } catch {
        // the cache is cleared by iOS anyway
      }
    };
  }, [fileId, path, pixels]);

  return {
    status,
    failure,
    pageCount,
    images,
    want: (pages) => {
      const key = pages.join(',');
      if (wanted.current.join(',') === key) return;
      wanted.current = pages;
      pump.current();
    },
  };
}
