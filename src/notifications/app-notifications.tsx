import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';

import { configureNotificationHandler, rescheduleReminders } from '@/notifications/reminders';

function openFrom(response: Notifications.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url;
  if (typeof url === 'string') {
    router.push(url as Href);
  }
}

// Mounted once inside SQLiteProvider: sets up notifications at app start and opens the
// document when a reminder is tapped (also when the tap launched the app).
export function AppNotifications() {
  const db = useSQLiteContext();

  useEffect(() => {
    configureNotificationHandler();
    rescheduleReminders(db);

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

  return null;
}
