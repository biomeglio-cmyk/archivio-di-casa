// In SDK 58 only the legacy API of expo-calendar is included in Expo Go
import * as Calendar from 'expo-calendar/legacy';
import type { SQLiteDatabase } from 'expo-sqlite';

import { APP_CALENDAR_TITLE, getCalendarSettings, saveCalendarSettings } from '@/calendar/calendar-settings';
import { getPreferences, reminderDaysFor } from '@/settings/preferences';
import { parseISODate } from '@/utils/dates';

// Every document with an expiry becomes an all-day event "Scade: <title>" in the app's OWN
// calendar, "Sottomano", created when sync is turned on and deleted (with all its events) when it
// is turned off. The user's personal calendars are never read, written or cleaned up.
// Nothing else from the document (number, notes, person, files) is written to the calendar.

const APP_CALENDAR_COLOR = '#4A5CF0'; // main gradient start (only for a newly created calendar)
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
  // No alarm while the app reminds, or when "Ricordamelo" is off for this document (days < 0)
  const alarms = preferences.remindersEnabled || days < 0 ? [] : [{ relativeOffset: -days * 24 * 60 + REMINDER_HOUR * 60 }];
  return { title: `Scade: ${doc.title}`, startDate: day, endDate: day, allDay: true, alarms };
}

async function setEventId(db: SQLiteDatabase, documentId: number, eventId: string | null) {
  await db.runAsync('UPDATE documents SET calendar_event_id = ? WHERE id = ?', eventId, documentId);
}

// Whether this event is one of ours, i.e. it is in the "Sottomano" calendar. An event moved by
// the user to another calendar is no longer ours: the app leaves it alone.
async function isInAppCalendar(eventId: string, calendarId: string): Promise<boolean> {
  try {
    const event = await Calendar.getEventAsync(eventId);
    return event.calendarId === calendarId;
  } catch {
    return false; // already deleted
  }
}

// Removes the event of a deleted document, only if it is in the "Sottomano" calendar
export async function removeCalendarEvent(eventId: string | null): Promise<void> {
  const calendarId = activeCalendarId();
  if (!eventId || !calendarId || !(await canWrite())) return;
  if (!(await isInAppCalendar(eventId, calendarId))) return;
  try {
    await Calendar.deleteEventAsync(eventId);
  } catch {
    // already gone
  }
}

// Brings the calendar event of one document in line with the document: creates, updates or removes it
async function syncOne(db: SQLiteDatabase, doc: EventSource, calendarId: string): Promise<void> {
  const ours = doc.calendar_event_id ? await isInAppCalendar(doc.calendar_event_id, calendarId) : false;

  if (!doc.expires_at) {
    if (ours) {
      await Calendar.deleteEventAsync(doc.calendar_event_id!);
    }
    if (doc.calendar_event_id) await setEventId(db, doc.id, null);
    return;
  }

  const details = eventDetails({ ...doc, expires_at: doc.expires_at });
  if (ours) {
    await Calendar.updateEventAsync(doc.calendar_event_id!, details);
    return;
  }
  // No event yet, deleted by the user, or moved out of "Sottomano": a new one in our calendar
  const eventId = await Calendar.createEventAsync(calendarId, details);
  await setEventId(db, doc.id, eventId);
}

// ---- The "Sottomano" calendar ----

// The id of our calendar while sync is on (never a personal calendar)
function activeCalendarId(): string | null {
  const settings = getCalendarSettings();
  return settings.enabled && settings.dedicated && settings.calendarId ? settings.calendarId : null;
}

// Creates "Sottomano" in the default calendar account (usually iCloud); if that account doesn't
// allow new calendars, on the phone only ("Sul mio iPhone")
async function createAppCalendar(): Promise<string> {
  const details = {
    title: APP_CALENDAR_TITLE,
    name: APP_CALENDAR_TITLE,
    color: APP_CALENDAR_COLOR,
    entityType: Calendar.EntityTypes.EVENT,
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
    ownerAccount: 'personal',
  };
  try {
    const source = (await Calendar.getDefaultCalendarAsync()).source;
    return await Calendar.createCalendarAsync({ ...details, sourceId: source.id, source });
  } catch {
    const local = (await Calendar.getSourcesAsync()).find((s) => s.type === Calendar.SourceType.LOCAL);
    if (!local) throw new Error('Impossibile creare il calendario «Sottomano» su questo iPhone.');
    return Calendar.createCalendarAsync({ ...details, sourceId: local.id, source: local });
  }
}

// Our calendar: the stored one if it still exists (the user may have deleted it in the Calendar
// app), otherwise a new one. Only the list of calendars is read, never their events.
async function ensureAppCalendar(): Promise<string> {
  const stored = getCalendarSettings().calendarId;
  if (stored) {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    if (calendars.some((c) => c.id === stored)) return stored;
  }
  return createAppCalendar();
}

// Switch turned on: create (or reuse) "Sottomano" and add every deadline to it.
// Returns how many documents are now in the calendar.
export async function enableCalendarSync(db: SQLiteDatabase): Promise<number> {
  const calendarId = await ensureAppCalendar();
  saveCalendarSettings({ enabled: true, calendarId, calendarTitle: APP_CALENDAR_TITLE, dedicated: true });
  return syncAllEvents(db, calendarId);
}

// Switch turned off: delete the whole "Sottomano" calendar (its events go with it)
export async function disableCalendarSync(db: SQLiteDatabase): Promise<void> {
  const { calendarId, dedicated } = getCalendarSettings();
  if (calendarId && dedicated) {
    try {
      await Calendar.deleteCalendarAsync(calendarId);
    } catch {
      // already deleted in the Calendar app
    }
  }
  await db.runAsync('UPDATE documents SET calendar_event_id = NULL WHERE calendar_event_id IS NOT NULL');
  saveCalendarSettings({ enabled: false, calendarId: null, calendarTitle: null, dedicated: true });
}

// Once, after updating from a version that wrote into a personal calendar: delete the events the
// app created there (only those, by their stored ids), then move to "Sottomano" if sync was on.
// Needs the calendar permission: without it, it simply runs again next time.
export async function migrateLegacyCalendar(db: SQLiteDatabase): Promise<void> {
  try {
    const settings = getCalendarSettings();
    if (settings.dedicated) return;
    const hasEvents = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM documents WHERE calendar_event_id IS NOT NULL LIMIT 1',
    );
    if (!hasEvents && !settings.enabled) {
      saveCalendarSettings({ ...settings, calendarId: null, calendarTitle: null, dedicated: true });
      return;
    }
    if (!(await canWrite())) return;

    const docs = await db.getAllAsync<{ calendar_event_id: string }>(
      'SELECT calendar_event_id FROM documents WHERE calendar_event_id IS NOT NULL',
    );
    for (const doc of docs) {
      try {
        await Calendar.deleteEventAsync(doc.calendar_event_id);
      } catch {
        // already deleted by the user
      }
    }
    await db.runAsync('UPDATE documents SET calendar_event_id = NULL WHERE calendar_event_id IS NOT NULL');
    saveCalendarSettings({ enabled: false, calendarId: null, calendarTitle: null, dedicated: true });
    if (settings.enabled) await enableCalendarSync(db);
  } catch (error) {
    console.warn('Calendar migration failed', error);
  }
}

// After a document is created or edited. Never throws: the document is already saved,
// a calendar problem must not look like a failed save.
export async function syncDocumentEvent(db: SQLiteDatabase, documentId: number): Promise<void> {
  try {
    if (!activeCalendarId() || !(await canWrite())) return;
    const calendarId = await ensureAppCalendar(); // recreated if the user deleted it
    saveCalendarSettings({ ...getCalendarSettings(), calendarId });
    const doc = await db.getFirstAsync<EventSource>(
      'SELECT id, title, expires_at, reminder_days, calendar_event_id FROM documents WHERE id = ? AND deleted_at IS NULL',
      documentId,
    );
    if (doc) await syncOne(db, doc, calendarId);
  } catch (error) {
    console.warn('Calendar sync failed', error);
  }
}

// One event in "Sottomano" for every document with an expiry; returns how many there are
async function syncAllEvents(db: SQLiteDatabase, calendarId: string): Promise<number> {
  const docs = await db.getAllAsync<EventSource>(
    `SELECT id, title, expires_at, reminder_days, calendar_event_id FROM documents
     WHERE (expires_at IS NOT NULL AND deleted_at IS NULL) OR calendar_event_id IS NOT NULL`,
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
    if (!activeCalendarId() || !(await canWrite())) return;
    const calendarId = await ensureAppCalendar();
    saveCalendarSettings({ ...getCalendarSettings(), calendarId });
    await syncAllEvents(db, calendarId);
  } catch (error) {
    console.warn('Calendar alarms sync failed', error);
  }
}

export const requestCalendarPermission = Calendar.requestCalendarPermissionsAsync;
export const getCalendarPermission = Calendar.getCalendarPermissionsAsync;
