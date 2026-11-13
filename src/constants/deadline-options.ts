import { t } from '@/i18n';
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

// "Il giorno stesso", "1 giorno prima", "2 giorni prima", "7 giorni prima"…
export function daysBefore(days: number): string {
  if (days === 0) return t('deadlineOptions.sameDay');
  return t('deadlineOptions.daysBefore', { count: days });
}

// The value shown in a row: the default is written as its days, without "(predefinito)"
export function reminderLabel(days: number, defaultDays: number): string {
  if (days === DEFAULT_REMINDER) return daysBefore(defaultDays);
  if (days === NO_REMINDER) return t('common.none');
  return daysBefore(days);
}

// In the list of choices the default is marked, so it isn't mistaken for the same days chosen by hand
export function reminderChoiceLabel(days: number, defaultDays: number): string {
  return days === DEFAULT_REMINDER
    ? t('deadlineOptions.defaultChoice', { label: daysBefore(defaultDays) })
    : reminderLabel(days, defaultDays);
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
