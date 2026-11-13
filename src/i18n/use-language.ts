import { useSQLiteContext } from 'expo-sqlite';
import { useSyncExternalStore } from 'react';

import { changeAppLanguage } from '@/i18n';
import { rescheduleReminders } from '@/notifications/reminders';
import {
  getLanguageSetting,
  resolveLanguage,
  storeLanguageSetting,
  subscribeLanguageSetting,
  type LanguageSetting,
} from '@/settings/language';

// "Lingua" of Impostazioni › Aspetto: Automatica / Italiano / English. Switching re-renders in
// place (like the theme): the screens stay where they are, with the same stack.
export function useLanguageSetting() {
  const db = useSQLiteContext();
  const setting = useSyncExternalStore(subscribeLanguageSetting, getLanguageSetting);

  async function setSetting(next: LanguageSetting) {
    storeLanguageSetting(next);
    await changeAppLanguage(resolveLanguage(next));
    // The reminders already scheduled were written in the old language
    try {
      await rescheduleReminders(db);
    } catch {
      // they are rewritten at the next change of a deadline
    }
  }

  return { setting, setSetting };
}
