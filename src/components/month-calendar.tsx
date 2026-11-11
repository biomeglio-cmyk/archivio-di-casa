import { View } from 'react-native';

import { CalendarHeader, calendarStyles, DayCell, EmptyDayCell, useHorizontalSwipe } from '@/components/calendar-parts';
import { ThemedText } from '@/components/themed-text';
import { CardSurface } from '@/constants/theme';
import { formatMonthTitle, toISODate } from '@/utils/dates';

export const WEEKDAY_INITIALS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']; // Monday first, as in Italy

type Props = {
  year: number;
  month: number; // 0 = January
  todayIso: string;
  selectedIso: string | null; // null = no day selected
  // Dot colors for each day with deadlines ('YYYY-MM-DD' → colors)
  markers: Map<string, string[]>;
  onSelect: (iso: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
};

// The days of the month in weeks (Monday → Sunday); null = empty cell before the 1st or after the last day
function monthWeeks(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7; // empty cells before the 1st (Monday = 0)

  const cells: (string | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toISODate(new Date(year, month, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// Month card like the iPhone Calendar: today in a brand-colored circle, the selected day in a
// dark circle, and under each day small dots in the colors of the categories expiring that day
export function MonthCalendar(props: Props) {
  const { year, month, todayIso, selectedIso, markers, onSelect, onPrevMonth, onNextMonth, onToday } = props;
  const swipe = useHorizontalSwipe(onPrevMonth, onNextMonth); // swipe between months

  return (
    <View style={[calendarStyles.card, CardSurface]} {...swipe}>
      <CalendarHeader
        title={formatMonthTitle(year, month)}
        previousLabel="Mese precedente"
        nextLabel="Mese successivo"
        onPrevious={onPrevMonth}
        onNext={onNextMonth}
        onToday={onToday}
      />

      <View style={calendarStyles.week}>
        {WEEKDAY_INITIALS.map((letter, index) => (
          <ThemedText key={index} type="smallBold" themeColor="textSecondary" style={calendarStyles.weekday}>
            {letter}
          </ThemedText>
        ))}
      </View>

      {monthWeeks(year, month).map((week, weekIndex) => (
        <View key={weekIndex} style={calendarStyles.week}>
          {week.map((iso, dayIndex) =>
            iso ? (
              <DayCell
                key={iso}
                iso={iso}
                isToday={iso === todayIso}
                isSelected={iso === selectedIso}
                dots={markers.get(iso) ?? []}
                onSelect={onSelect}
              />
            ) : (
              <EmptyDayCell key={dayIndex} />
            ),
          )}
        </View>
      ))}
    </View>
  );
}
