import { useMemo } from 'react';

import { useI18n } from '@/i18n';
import { formatNumber, monthName, weekdayLetters, weekdayName, weekdayNamesFromMonday } from '@/i18n/format';
import {
  describeDayDistance,
  describeDistance,
  formatDate,
  formatDayMonth,
  formatLongDay,
  formatMonthTitle,
  formatShortDate,
} from '@/utils/dates';
import { formatEuro } from '@/utils/money';

// Dates and amounts for components: const fmt = useFormat(); fmt.monthTitle(2026, 10).
// A new object when the language changes, so the React Compiler doesn't keep old texts.
export function useFormat() {
  const { language } = useI18n();
  return useMemo(
    () => ({
      language,
      date: formatDate,
      shortDate: formatShortDate,
      longDay: formatLongDay,
      monthTitle: formatMonthTitle,
      dayMonth: formatDayMonth,
      distance: describeDistance,
      dayDistance: describeDayDistance,
      euro: formatEuro,
      number: formatNumber,
      monthName,
      weekdayName,
      weekdayLetters,
      weekdayNamesFromMonday,
    }),
    [language],
  );
}
