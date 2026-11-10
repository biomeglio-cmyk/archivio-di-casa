import Storage from 'expo-sqlite/kv-store';

// Calendar sync settings, kept on the phone with the expo-sqlite key-value store
const KEY = 'calendar.settings';

export type CalendarSettings = {
  enabled: boolean;
  calendarId: string | null;
  calendarTitle: string | null; // shown in the document detail ("Nel calendario: iCloud")
};

const DEFAULTS: CalendarSettings = { enabled: false, calendarId: null, calendarTitle: null };

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
