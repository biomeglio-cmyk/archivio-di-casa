import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { addDatabaseChangeListener, useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { migrateLegacyCalendar } from '@/calendar/calendar-sync';
import { configureNotificationHandler, rescheduleReminders, updateAppBadge } from '@/notifications/reminders';

function openFrom(response: Notifications.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url;
  if (typeof url === 'string') {
    router.push(url as Href);
  }
}

// Mounted once inside SQLiteProvider: sets up notifications at app start, keeps the number on
// the app icon up to date, and opens the document when a reminder is tapped (also when the tap
// launched the app).
export function AppNotifications() {
  const db = useSQLiteContext();

  useEffect(() => {
    configureNotificationHandler();
    rescheduleReminders(db);
    // Once, after an update: remove the events an older version put in a personal calendar
    migrateLegacyCalendar(db);

    // The app was launched by tapping a notification
    const launch = Notifications.getLastNotificationResponse();
    if (launch) {
      openFrom(launch);
      Notifications.clearLastNotificationResponse();
    }

    // Taps while the app is running or in the background
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openFrom(response);
      Notifications.clearLastNotificationResponse();
    });
    return () => subscription.remove();
  }, [db]);

  // Number on the app icon: at start, when the app comes back to the foreground (the day may
  // have changed), and after every change in the database
  useEffect(() => {
    updateAppBadge(db);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') updateAppBadge(db);
    });
    // Many changes in a row (a transaction) → one update, after a short pause
    let timer: ReturnType<typeof setTimeout> | null = null;
    const dbChanges = addDatabaseChangeListener(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        updateAppBadge(db);
      }, 250);
    });
    return () => {
      if (timer) clearTimeout(timer);
      appState.remove();
      dbChanges.remove();
    };
  }, [db]);

  return null;
}
