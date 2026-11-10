import { useMemo } from 'react';
import { PanResponder, View } from 'react-native';

import { CalendarHeader, calendarStyles, DayCell } from '@/components/calendar-parts';
import { WEEKDAY_INITIALS } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatWeekRange, parseISODate, toISODate } from '@/utils/dates';

const SWIPE_DISTANCE = 50; // points of horizontal movement needed to change week

type Props = {
  weekStartIso: string; // Monday of the week shown
  todayIso: string;
  selectedIso: string;
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

  // Plain React Native gesture: take over only clearly horizontal moves, so taps on the days
  // and the vertical scroll of the screen keep working. Rebuilt when the callbacks change.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_, g) => {
          if (g.dx <= -SWIPE_DISTANCE) onNextWeek();
          else if (g.dx >= SWIPE_DISTANCE) onPrevWeek();
        },
      }),
    [onPrevWeek, onNextWeek],
  );

  return (
    <View style={[calendarStyles.card, { backgroundColor: theme.backgroundElement }]} {...panResponder.panHandlers}>
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
