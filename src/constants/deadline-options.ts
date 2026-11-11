import { MAX_REPEAT } from '@/utils/recurrence';

// Choices shared by the document form and the "Scadenza" screen

// "Promemoria": the value 0 means "no value of its own", saved as NULL, so the document follows
// the default "Avvisa prima di" of Notifiche (settings/preferences.ts reminderDaysFor)
export const DEFAULT_REMINDER = 0;
export const REMINDER_DAYS = [1, 7, 15, 30, 60, 90];

export function reminderLabel(days: number, defaultDays: number): string {
  if (days === DEFAULT_REMINDER) {
    return `Predefinito (${defaultDays === 1 ? '1 giorno' : `${defaultDays} giorni`} prima)`;
  }
  return days === 1 ? '1 giorno prima' : `${days} giorni prima`;
}

// "Ogni": 1…99
export const EVERY_OPTIONS = Array.from({ length: MAX_REPEAT }, (_, i) => i + 1);

// The "Promemoria" choices, plus the saved value when it is not one of them (kept, not lost)
export function reminderChoices(current: number): number[] {
  const all = [DEFAULT_REMINDER, ...REMINDER_DAYS];
  return all.includes(current) ? all : [...all, current].sort((a, b) => a - b);
}
