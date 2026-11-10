// In SDK 58 only the legacy API of expo-calendar is included in Expo Go
import * as Calendar from 'expo-calendar/legacy';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getCalendarSettings } from '@/calendar/calendar-settings';
import { getPreferences, reminderDaysFor } from '@/settings/preferences';
import { parseISODate } from '@/utils/dates';

// Every document with an expiry becomes an all-day event "Scade: <title>" in the chosen calendar
// (iCloud, or Google/Exchange accounts added in the iPhone Settings). Nothing else from the
// document (number, notes, person, files) is written to the calendar.

const REMINDER_HOUR = 9; // the alarm rings at 9:00, N days before

// Alarms: only ONE reminder per deadline. When the app's own reminders ("Notifiche") are on,
// the app notifies, so the calendar events have no alarm; when they are off, the calendar
// event rings at 9:00, N days before. N follows the same rule as the app notifications
// (reminderDaysFor): the document's own value, otherwise the default from Notifiche.

type EventSource = {
  id: number;
  title: string;
  expires_at: string | null;
  reminder_days: number | null;
  calendar_event_id: string | null;
};

async function canWrite(): Promise<boolean> {
  const permission = await Calendar.getCalendarPermissionsAsync();
  return permission.granted;
}

function eventDetails(doc: EventSource & { expires_at: string }) {
  const day = parseISODate(doc.expires_at); // local midnight
  // relativeOffset is in minutes from the start of the event (midnight of the expiry day).
  // An empty list also REMOVES the alarm of an existing event when it is updated.
  const preferences = getPreferences();
  const days = reminderDaysFor(doc.reminder_days, preferences);
  const alarms = preferences.remindersEnabled ? [] : [{ relativeOffset: -days * 24 * 60 + REMINDER_HOUR * 60 }];
  return { title: `Scade: ${doc.title}`, startDate: day, endDate: day, allDay: true, alarms };
}

async function setEventId(db: SQLiteDatabase, documentId: number, eventId: string | null) {
  await db.runAsync('UPDATE documents SET calendar_event_id = ? WHERE id = ?', eventId, documentId);
}

// Removes an event; an event already deleted by the user in Calendar is not an error
export async function removeCalendarEvent(eventId: string | null): Promise<void> {
  if (!eventId) return;
  try {
    await Calendar.deleteEventAsync(eventId);
  } catch {
    // already gone
  }
}

// Brings the calendar event of one document in line with the document: creates, updates or removes it
async function syncOne(db: SQLiteDatabase, doc: EventSource, calendarId: string): Promise<void> {
  if (!doc.expires_at) {
    if (doc.calendar_event_id) {
      await removeCalendarEvent(doc.calendar_event_id);
      await setEventId(db, doc.id, null);
    }
    return;
  }

  const details = eventDetails({ ...doc, expires_at: doc.expires_at });
  if (doc.calendar_event_id) {
    try {
      await Calendar.updateEventAsync(doc.calendar_event_id, details);
      return;
    } catch {
      // The event was deleted in the Calendar app: create it again below
    }
  }
  const eventId = await Calendar.createEventAsync(calendarId, details);
  await setEventId(db, doc.id, eventId);
}

// After a document is created or edited. Never throws: the document is already saved,
// a calendar problem must not look like a failed save.
export async function syncDocumentEvent(db: SQLiteDatabase, documentId: number): Promise<void> {
  try {
    const { enabled, calendarId } = getCalendarSettings();
    if (!enabled || !calendarId || !(await canWrite())) return;
    const doc = await db.getFirstAsync<EventSource>(
      'SELECT id, title, expires_at, reminder_days, calendar_event_id FROM documents WHERE id = ?',
      documentId,
    );
    if (doc) await syncOne(db, doc, calendarId);
  } catch (error) {
    console.warn('Calendar sync failed', error);
  }
}

// Switch turned on (or calendar changed): one event for every document with an expiry.
// Returns how many documents are now in the calendar.
export async function syncAllEvents(db: SQLiteDatabase, calendarId: string): Promise<number> {
  const docs = await db.getAllAsync<EventSource>(
    `SELECT id, title, expires_at, reminder_days, calendar_event_id FROM documents
     WHERE expires_at IS NOT NULL OR calendar_event_id IS NOT NULL`,
  );
  for (const doc of docs) {
    await syncOne(db, doc, calendarId);
  }
  return docs.filter((d) => d.expires_at).length;
}

// "Promemoria scadenze" switched on or off: rewrite the existing events with or without their
// alarm. Never throws: the switch is already saved, a calendar problem must not undo it.
export async function resyncCalendarAlarms(db: SQLiteDatabase): Promise<void> {
  try {
    const { enabled, calendarId } = getCalendarSettings();
    if (!enabled || !calendarId || !(await canWrite())) return;
    await syncAllEvents(db, calendarId);
  } catch (error) {
    console.warn('Calendar alarms sync failed', error);
  }
}

// Switch turned off (or calendar changed): removes every event created by the app
export async function removeAllEvents(db: SQLiteDatabase): Promise<void> {
  const docs = await db.getAllAsync<{ id: number; calendar_event_id: string }>(
    'SELECT id, calendar_event_id FROM documents WHERE calendar_event_id IS NOT NULL',
  );
  for (const doc of docs) {
    await removeCalendarEvent(doc.calendar_event_id);
  }
  await db.runAsync('UPDATE documents SET calendar_event_id = NULL WHERE calendar_event_id IS NOT NULL');
}

export type WritableCalendar = { id: string; title: string; source: string; color: string };

// Calendars the app may write to (iCloud, Google, Exchange…), grouped by account
export async function listWritableCalendars(): Promise<WritableCalendar[]> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars
    .filter((c) => c.allowsModifications)
    .map((c) => ({ id: c.id, title: c.title, source: c.source?.name ?? '', color: c.color ?? '#8E8E93' }))
    .sort((a, b) => a.source.localeCompare(b.source) || a.title.localeCompare(b.title));
}

export const requestCalendarPermission = Calendar.requestCalendarPermissionsAsync;
export const getCalendarPermission = Calendar.getCalendarPermissionsAsync;
