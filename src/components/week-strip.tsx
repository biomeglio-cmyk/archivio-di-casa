import { View } from 'react-native';

import { CalendarHeader, calendarStyles, DayCell, useHorizontalSwipe } from '@/components/calendar-parts';
import { WEEKDAY_INITIALS } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatWeekRange, parseISODate, toISODate } from '@/utils/dates';

type Props = {
  weekStartIso: string; // Monday of the week shown
  todayIso: string;
  selectedIso: string | null; // null = no day selected
  markers: Map<string, string[]>;
  onSelect: (iso: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
};

// One week, Monday → Sunday, with the same day cells as the month grid.
// Arrows or a horizontal swipe change week.
export function WeekStrip(props: Props) {
  const { weekStartIso, todayIso, selectedIso, markers, onSelect, onPrevWeek, onNextWeek, onToday } = props;
  const theme = useTheme();

  const monday = parseISODate(weekStartIso);
  const days = Array.from({ length: 7 }, (_, i) =>
    toISODate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)),
  );

  const swipe = useHorizontalSwipe(onPrevWeek, onNextWeek);

  return (
    <View style={[calendarStyles.card, { backgroundColor: theme.backgroundElement }]} {...swipe}>
      <CalendarHeader
        title={formatWeekRange(weekStartIso)}
        previousLabel="Settimana precedente"
        nextLabel="Settimana successiva"
        onPrevious={onPrevWeek}
        onNext={onNextWeek}
        onToday={onToday}
      />

      <View style={calendarStyles.week}>
        {WEEKDAY_INITIALS.map((letter, index) => (
          <ThemedText key={index} type="smallBold" themeColor="textSecondary" style={calendarStyles.weekday}>
            {letter}
          </ThemedText>
        ))}
      </View>

      <View style={calendarStyles.week}>
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
