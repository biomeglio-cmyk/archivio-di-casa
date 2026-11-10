import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR, FONTS } from '@/constants/brand';
import { useTheme } from '@/hooks/use-theme';
import { formatMonthTitle, toISODate } from '@/utils/dates';

const WEEKDAY_INITIALS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']; // Monday first, as in Italy
const MAX_DOTS = 3;

type Props = {
  year: number;
  month: number; // 0 = January
  todayIso: string;
  selectedIso: string;
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
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{formatMonthTitle(year, month)}</Text>
        <Pressable onPress={onToday} hitSlop={8} accessibilityRole="button" style={styles.todayButton}>
          <Text style={styles.todayLabel}>Oggi</Text>
        </Pressable>
        <View style={styles.spacer} />
        <Pressable onPress={onPrevMonth} accessibilityRole="button" accessibilityLabel="Mese precedente" style={styles.arrow}>
          <SymbolView name="chevron.left" tintColor={BRAND_COLOR} size={18} />
        </Pressable>
        <Pressable onPress={onNextMonth} accessibilityRole="button" accessibilityLabel="Mese successivo" style={styles.arrow}>
          <SymbolView name="chevron.right" tintColor={BRAND_COLOR} size={18} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEKDAY_INITIALS.map((letter, index) => (
          <ThemedText key={index} type="smallBold" themeColor="textSecondary" style={styles.weekday}>
            {letter}
          </ThemedText>
        ))}
      </View>

      {monthWeeks(year, month).map((week, weekIndex) => (
        <View key={weekIndex} style={styles.week}>
          {week.map((iso, dayIndex) => {
            if (!iso) return <View key={dayIndex} style={styles.day} />;

            const isToday = iso === todayIso;
            const isSelected = iso === selectedIso;
            const dots = (markers.get(iso) ?? []).slice(0, MAX_DOTS);
            // Today always keeps its brand circle; another selected day gets a dark one
            const circleColor = isToday ? BRAND_COLOR : isSelected ? theme.text : 'transparent';
            const numberColor = isToday ? '#FFFFFF' : isSelected ? theme.background : theme.text;

            return (
              <Pressable
                key={iso}
                onPress={() => onSelect(iso)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${Number(iso.slice(8))}${dots.length ? ', con scadenze' : ''}`}
                style={styles.day}>
                <View style={[styles.circle, { backgroundColor: circleColor }]}>
                  <Text style={[styles.number, { color: numberColor }, (isToday || isSelected) && styles.numberBold]}>
                    {Number(iso.slice(8))}
                  </Text>
                </View>
                <View style={styles.dots}>
                  {dots.map((color, i) => (
                    <View key={i} style={[styles.dot, { backgroundColor: color }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderCurve: 'continuous',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.titleBold,
  },
  todayButton: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: `${BRAND_COLOR}1F`,
  },
  todayLabel: {
    color: BRAND_COLOR,
    fontSize: 14,
    fontFamily: FONTS.titleSemiBold,
  },
  spacer: {
    flex: 1,
  },
  arrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  week: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 4,
  },
  day: {
    flex: 1, // 7 equal columns
    height: 48,
    alignItems: 'center',
    paddingTop: 2,
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 17,
  },
  numberBold: {
    fontWeight: 600,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    marginTop: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
