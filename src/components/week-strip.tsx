import { StyleSheet, View } from 'react-native';

import { DayCell, useHorizontalSwipe } from '@/components/calendar-parts';
import { WEEKDAY_INITIALS } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { addDaysIso } from '@/utils/dates';

type Props = {
  weekStartIso: string; // Monday of the week shown
  todayIso: string;
  selectedIso: string | null; // null = no day selected
  markers: Map<string, string[]>; // dot colors per day
  onSelect: (iso: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
};

// Compact week, straight on the background: 7 columns with the weekday letter, the day number
// (today in a pink circle, the selected day in a dark one) and the dots. Swipe to change week.
export function WeekStrip({ weekStartIso, todayIso, selectedIso, markers, onSelect, onPrevWeek, onNextWeek }: Props) {
  const swipe = useHorizontalSwipe(onPrevWeek, onNextWeek);
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(weekStartIso, i));

  return (
    <View {...swipe}>
      <View style={styles.week}>
        {WEEKDAY_INITIALS.map((letter, index) => (
          <ThemedText key={index} type="smallBold" themeColor="textSecondary" style={styles.weekday}>
            {letter}
          </ThemedText>
        ))}
      </View>
      <View style={styles.week}>
        {days.map((iso) => (
          <DayCell
            key={iso}
            iso={iso}
            isToday={iso === todayIso}
            isSelected={iso === selectedIso}
            dots={markers.get(iso) ?? []}
            onSelect={onSelect}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  week: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    paddingBottom: 2,
  },
});
