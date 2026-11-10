import Storage from 'expo-sqlite/kv-store';

// Calendar sync settings, kept on the phone with the expo-sqlite key-value store
const KEY = 'calendar.settings';

export const APP_CALENDAR_TITLE = 'Sottomano';

export type CalendarSettings = {
  enabled: boolean;
  calendarId: string | null; // the app's own "Sottomano" calendar (never a personal calendar)
  calendarTitle: string | null; // "Sottomano" while sync is on (shown in the Menu and the detail)
  // true since the app writes only to its own calendar. Older versions wrote into a calendar
  // chosen by the user: without this flag, those events are removed once (migrateLegacyCalendar).
  dedicated: boolean;
};

const DEFAULTS: CalendarSettings = { enabled: false, calendarId: null, calendarTitle: null, dedicated: false };

export function getCalendarSettings(): CalendarSettings {
  try {
    const saved = Storage.getItemSync(KEY);
    return saved ? { ...DEFAULTS, ...(JSON.parse(saved) as Partial<CalendarSettings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function saveCalendarSettings(settings: CalendarSettings): void {
  Storage.setItemSync(KEY, JSON.stringify(settings));
}
