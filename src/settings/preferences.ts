import Storage from 'expo-sqlite/kv-store';

// App preferences, kept on the phone with the expo-sqlite key-value store
const KEY = 'app.preferences';

export type Preferences = {
  remindersEnabled: boolean; // "Promemoria scadenze"
  reminderHour: number; // "Ora dell'avviso", 0–23
  reminderMinute: number;
  defaultReminderDays: number; // "Avvisa prima di", for documents without their own value
  iconBadgeEnabled: boolean; // "Numero sull'icona"
};

export const DEFAULT_PREFERENCES: Preferences = {
  remindersEnabled: true,
  reminderHour: 9,
  reminderMinute: 0,
  defaultReminderDays: 7,
  iconBadgeEnabled: true,
};

export function getPreferences(): Preferences {
  try {
    const saved = Storage.getItemSync(KEY);
    return saved ? { ...DEFAULT_PREFERENCES, ...(JSON.parse(saved) as Partial<Preferences>) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(change: Partial<Preferences>): Preferences {
  const next = { ...getPreferences(), ...change };
  Storage.setItemSync(KEY, JSON.stringify(next));
  return next;
}
