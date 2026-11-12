import { MAX_REPEAT } from '@/utils/recurrence';

// Choices shared by the document form and the "Scadenza" screen

// "Promemoria" / "Avvisami" values (Picker values must be numbers):
// - DEFAULT_REMINDER: no value of its own, saved as NULL, so the document follows the default
//   "Avviso predefinito" of Impostazioni (settings/preferences.ts reminderDaysFor);
// - NO_REMINDER (-1, saved as is): "Ricordamelo" off, no notification and no calendar alarm;
// - 0 = the same day, then days before.
export const DEFAULT_REMINDER = -2;
export const NO_REMINDER = -1;
export const REMINDER_DAYS = [0, 1, 2, 7, 15, 30, 60, 90];

function daysBefore(days: number): string {
  if (days === 0) return 'Il giorno stesso';
  if (days === 1) return '1 giorno prima';
  if (days === 7) return '1 settimana prima';
  return `${days} giorni prima`;
}

export function reminderLabel(days: number, defaultDays: number): string {
  if (days === DEFAULT_REMINDER) return `Predefinito (${daysBefore(defaultDays).toLowerCase()})`;
  if (days === NO_REMINDER) return 'Nessun promemoria';
  return daysBefore(days);
}

// Short label for a narrow row ("Promemoria" in Scadenza): "1 settimana prima", and
// "(predefinito)" after it only when there is room for it (`roomChars`: characters that fit)
export function shortReminderLabel(days: number, defaultDays: number, roomChars: number): string {
  if (days === NO_REMINDER) return 'Nessuno';
  if (days !== DEFAULT_REMINDER) return daysBefore(days);
  const plain = daysBefore(defaultDays);
  const marked = `${plain} (predefinito)`;
  return marked.length <= roomChars ? marked : plain;
}

// The saved reminder_days of a document as a picker value, and back
export const reminderPickerValue = (saved: number | null): number => saved ?? DEFAULT_REMINDER;
export const reminderToSave = (value: number): number | null => (value === DEFAULT_REMINDER ? null : value);

// "Ogni": 1…99
export const EVERY_OPTIONS = Array.from({ length: MAX_REPEAT }, (_, i) => i + 1);

// The "Promemoria" choices, plus the saved value when it is not one of them (kept, not lost)
export function reminderChoices(current: number): number[] {
  const all = [DEFAULT_REMINDER, NO_REMINDER, ...REMINDER_DAYS];
  return all.includes(current) ? all : [...all, current].sort((a, b) => a - b);
}
