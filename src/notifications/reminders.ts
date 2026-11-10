import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';

import { getPreferences } from '@/settings/preferences';
import { describeDistance, formatShortDate, parseISODate, toISODate } from '@/utils/dates';
import { daysUntil } from '@/utils/deadlines';

// Local reminders for the deadlines (no server, no push): one notification per document,
// `reminder_days` before its expiry (the document's value, otherwise the default from the
// settings), at the chosen time. Everything is rebuilt from the database each time.

const IOS_PENDING_LIMIT = 64; // iOS keeps at most 64 scheduled local notifications per app
const ASKED_KEY = 'notifications.asked';

type ReminderSource = {
  id: number;
  title: string;
  expires_at: string;
  reminder_days: number | null;
  person_name: string | null;
};

// Notifications that arrive while the app is open are shown as banners too
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

async function canNotify(): Promise<boolean> {
  const permission = await Notifications.getPermissionsAsync();
  return permission.granted;
}

// Asked in context: the first time a document with a deadline is saved, never at launch.
// Returns whether reminders are allowed.
export async function askPermissionForDeadline(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain || Storage.getItemSync(ASKED_KEY) === '1') return false;
  Storage.setItemSync(ASKED_KEY, '1');
  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return result.granted;
}

// After saving a document: if it has a deadline, ask for notifications (only the first time)
// and schedule the reminders right away when allowed
export async function afterDocumentSaved(db: SQLiteDatabase, expiresAt: string | null): Promise<void> {
  if (!expiresAt) return;
  if (await askPermissionForDeadline()) {
    await rescheduleReminders(db);
  }
}

// When the reminder for this document should ring (local time), or null if it can't anymore
function reminderDate(doc: ReminderSource, defaultDays: number, hour: number, minute: number, now: Date): Date | null {
  const expiry = parseISODate(doc.expires_at);
  const days = doc.reminder_days ?? defaultDays;
  const at = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate() - days, hour, minute);
  if (at > now) return at;
  // The reminder day has passed but the deadline hasn't: remind on the expiry day itself
  const onTheDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate(), hour, minute);
  return onTheDay > now ? onTheDay : null;
}

// "Carta d'identità · Step scade gio 12 nov (tra 2 giorni)"
function reminderBody(doc: ReminderSource, at: Date): string {
  const who = doc.person_name ? ` · ${doc.person_name}` : '';
  const distance = describeDistance(daysUntil(doc.expires_at, at));
  return `${doc.title}${who} scade ${formatShortDate(doc.expires_at)} (${distance})`;
}

// Rebuilds all reminders: on app start, and after every create, edit or delete. Never throws.
export async function rescheduleReminders(db: SQLiteDatabase): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const preferences = getPreferences();
    if (!preferences.remindersEnabled || !(await canNotify())) return;

    const now = new Date();
    const docs = await db.getAllAsync<ReminderSource>(
      `SELECT d.id, d.title, d.expires_at, d.reminder_days, p.name AS person_name
       FROM documents d LEFT JOIN people p ON p.id = d.person_id
       WHERE d.expires_at IS NOT NULL AND d.expires_at >= ?`,
      toISODate(now),
    );

    // The nearest ones first, so the iOS limit keeps those that matter now
    const planned = docs
      .map((doc) => ({
        doc,
        at: reminderDate(doc, preferences.defaultReminderDays, preferences.reminderHour, preferences.reminderMinute, now),
      }))
      .filter((r): r is { doc: ReminderSource; at: Date } => r.at !== null)
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .slice(0, IOS_PENDING_LIMIT);

    for (const { doc, at } of planned) {
      await Notifications.scheduleNotificationAsync({
        identifier: `deadline-${doc.id}`,
        content: {
          title: 'Scadenza in arrivo',
          body: reminderBody(doc, at),
          sound: 'default',
          // Tapping the notification opens this document (see useNotificationTaps)
          data: { url: `/(tabs)/(deadlines)/document/${doc.id}` },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
    }
  } catch (error) {
    console.warn('Reminders could not be scheduled', error);
  }
}
