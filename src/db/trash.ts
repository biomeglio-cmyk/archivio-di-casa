import type { SQLiteDatabase } from 'expo-sqlite';

import { removeCalendarEvent, syncDocumentEvent } from '@/calendar/calendar-sync';
import { otherCategoryId } from '@/db/categories';
import { deleteDocumentForever } from '@/db/documents';
import { rescheduleReminders } from '@/notifications/reminders';
import { deletePassword } from '@/security/password-vault';

// The "Cestino": "Elimina" on a document only sets deleted_at. Trashed documents are hidden
// everywhere (every query filters deleted_at IS NULL), but keep their photos, PDFs and Keychain
// password until "Elimina definitivamente", "Svuota cestino" or 30 days in the Cestino.

export const TRASH_DAYS = 30;

// "Elimina": into the Cestino. Out of Preferiti; its calendar event goes now (it is recreated
// on "Ripristina"); reminders and badge are rebuilt once at the end.
export async function moveToTrash(db: SQLiteDatabase, ids: number[]): Promise<void> {
  const events: (string | null)[] = [];
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      const row = await db.getFirstAsync<{ calendar_event_id: string | null }>(
        'SELECT calendar_event_id FROM documents WHERE id = ? AND deleted_at IS NULL',
        id,
      );
      if (!row) continue;
      events.push(row.calendar_event_id);
      await db.runAsync(
        `UPDATE documents
         SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), is_pinned = 0, pin_order = 0, calendar_event_id = NULL
         WHERE id = ?`,
        id,
      );
    }
  });
  for (const event of events) await removeCalendarEvent(event);
  await rescheduleReminders(db);
}

export type RestoreResult = { movedToOther: boolean };

// "Ripristina": back where it was. If its category was deleted meanwhile (a built-in one is only
// hidden), it goes to "Altro"; coming from "Password", user name and password are removed there
// (Altro has no field to show them), as with "Sposta in Altro".
export async function restoreFromTrash(db: SQLiteDatabase, id: number): Promise<RestoreResult> {
  const row = await db.getFirstAsync<{ hidden: number; kind: string | null }>(
    `SELECT c.hidden, c.kind FROM documents d JOIN categories c ON c.id = d.category_id
     WHERE d.id = ? AND d.deleted_at IS NOT NULL`,
    id,
  );
  if (!row) return { movedToOther: false };
  const movedToOther = row.hidden === 1;
  if (movedToOther) {
    await db.runAsync(
      `UPDATE documents
       SET deleted_at = NULL, category_id = ?, username = CASE WHEN ? = 'password' THEN NULL ELSE username END,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ?`,
      await otherCategoryId(db),
      row.kind ?? '',
      id,
    );
    if (row.kind === 'password') await deletePassword(id);
  } else {
    await db.runAsync('UPDATE documents SET deleted_at = NULL WHERE id = ?', id);
  }
  await syncDocumentEvent(db, id);
  await rescheduleReminders(db);
  return { movedToOther };
}

// "Svuota cestino"
export async function emptyTrash(db: SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{ id: number }>('SELECT id FROM documents WHERE deleted_at IS NOT NULL');
  for (const { id } of rows) await deleteDocumentForever(db, id);
}

// At launch: what has been in the Cestino for more than 30 days is deleted for good
// (files and Keychain items too). Never throws: it is housekeeping, it must not block the app.
export async function purgeOldTrash(db: SQLiteDatabase): Promise<void> {
  try {
    const rows = await db.getAllAsync<{ id: number }>(
      `SELECT id FROM documents
       WHERE deleted_at IS NOT NULL AND deleted_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-${TRASH_DAYS} days')`,
    );
    for (const { id } of rows) await deleteDocumentForever(db, id);
  } catch (error) {
    console.warn('Trash cleanup failed', error);
  }
}

// Days left before a trashed document is deleted for good (0 = at the next launch)
export function daysLeftInTrash(deletedAt: string, now = new Date()): number {
  const purgeAt = new Date(deletedAt).getTime() + TRASH_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - now.getTime()) / (24 * 60 * 60 * 1000)));
}
