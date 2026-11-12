import type { SQLiteDatabase } from 'expo-sqlite';

import { getDocumentDetail, listDocumentFiles } from '@/db/documents';
import type { Category } from '@/db/types';
import type { SendDocument } from '@/send/prepare';

export type SendItem = SendDocument & {
  id: number;
  category: Category; // the whole category: its colors tint the sheet
  personName: string | null;
  notes: string | null; // "Includi la nota del documento"
  faces: number; // photos: front, back, or all the pages of a scan
  hasPdf: boolean;
};

// The documents chosen for the "Invia" sheet, in the given order, with their files
export async function loadSendItems(db: SQLiteDatabase, ids: number[]): Promise<SendItem[]> {
  const items: SendItem[] = [];
  for (const id of ids) {
    const detail = await getDocumentDetail(db, id);
    if (!detail) continue;
    const files = await listDocumentFiles(db, id);
    items.push({
      id,
      title: detail.title,
      personName: detail.person?.name ?? null,
      notes: detail.notes,
      category: detail.category,
      files,
      faces: files.filter((f) => f.kind === 'image').length,
      hasPdf: files.some((f) => f.kind === 'pdf'),
    });
  }
  return items;
}
