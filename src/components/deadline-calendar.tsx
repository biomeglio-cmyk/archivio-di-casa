import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { useHorizontalSwipe } from '@/components/calendar-parts';
import { Text } from '@/components/text';
import { WhiteCard } from '@/components/white-card';
import { BRAND_GRADIENT, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { Colors } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { addDaysIso, formatMonthTitle, MONTHS, parseISODate, toISODate } from '@/utils/dates';

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const WEEKDAY_NAMES = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];

export type DayMarkers = Map<string, { color: string; count: number }>; // 'YYYY-MM-DD' → first dot

type WeekProps = {
  weekStartIso: string; // a Monday
  todayIso: string;
  selectedIso: string;
  markers: DayMarkers;
  onSelect: (iso: string) => void;
  onPrevious: () => void;
  onNext: () => void;
};

// "Settimana" of Scadenze: L M M G V S D in a white card, 38pt days (today in the main gradient,
// the chosen day on lilac), a 6pt dot under the days with deadlines. Swipe for the next week.
export function WeekCalendar({ weekStartIso, todayIso, selectedIso, markers, onSelect, onPrevious, onNext }: WeekProps) {
  const swipe = useHorizontalSwipe(onPrevious, onNext);
  return (
    <WhiteCard
      style={styles.weekCard}
      {...swipe}
      accessibilityActions={[
        { name: 'increment', label: 'Settimana successiva' },
        { name: 'decrement', label: 'Settimana precedente' },
      ]}
      onAccessibilityAction={(event) => (event.nativeEvent.actionName === 'increment' ? onNext() : onPrevious())}>
      {WEEKDAYS.map((letter, index) => {
        const iso = addDaysIso(weekStartIso, index);
        const today = iso === todayIso;
        const selected = iso === selectedIso && !today;
        const marker = markers.get(iso);
        const day = parseISODate(iso).getDate();
        return (
          <Pressable
            key={iso}
            onPress={() => onSelect(iso)}
            accessibilityRole="button"
            accessibilityState={{ selected: iso === selectedIso }}
            accessibilityLabel={dayLabel(iso, marker?.count ?? 0, WEEKDAY_NAMES[index])}
            style={styles.weekDay}>
            <Text style={styles.weekLetter} maxFontSizeMultiplier={1.3}>
              {letter}
            </Text>
            <View style={[styles.weekCircle, selected && styles.weekSelected]}>
              {today && <Gradient style={styles.weekCircleFill} />}
              <Text
                maxFontSizeMultiplier={1.3}
                style={[styles.weekNumber, today && styles.numberOnGradient, selected && styles.numberToday]}>
                {day}
              </Text>
            </View>
            <View style={[styles.weekDot, { backgroundColor: marker?.color ?? 'transparent' }]} />
          </Pressable>
        );
      })}
    </WhiteCard>
  );
}

type MonthProps = {
  year: number;
  month: number; // 0 = January
  todayIso: string;
  selectedIso: string;
  markers: DayMarkers;
  onSelect: (iso: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  children?: React.ReactNode; // the deadlines of the chosen day, under the grid
};

// "Mese" of Scadenze: ‹ Novembre 2026 › on pale lilac, L M M G V S D, 40 × 44 days with a 5pt
// dot; the chosen day in the main gradient (white dot), today on lilac with indigo text
export function MonthCalendar({ year, month, todayIso, selectedIso, markers, onSelect, onPrevious, onNext, children }: MonthProps) {
  const swipe = useHorizontalSwipe(onPrevious, onNext);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
  const cells: (number | null)[] = [...Array<null>(blanks).fill(null)];
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  return (
    <WhiteCard style={styles.monthCard}>
      <View {...swipe}>
        <View style={styles.monthHeader}>
          <MonthArrow symbol="chevron.left" label="Mese precedente" onPress={onPrevious} />
          <Text style={styles.monthTitle} accessibilityRole="header">
            {formatMonthTitle(year, month)}
          </Text>
          <MonthArrow symbol="chevron.right" label="Mese successivo" onPress={onNext} />
        </View>
        <View style={styles.letters} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {WEEKDAYS.map((letter, index) => (
            <Text key={index} style={styles.letter} maxFontSizeMultiplier={1.3}>
              {letter}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((day, index) => {
            if (day === null) return <View key={`b${index}`} style={styles.cell} />;
            const iso = toISODate(new Date(year, month, day));
            const selected = iso === selectedIso;
            const today = iso === todayIso && !selected;
            const marker = markers.get(iso);
            return (
              <View key={iso} style={styles.cell}>
                <Pressable
                  onPress={() => onSelect(iso)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={dayLabel(iso, marker?.count ?? 0)}
                  style={[styles.monthDay, today && styles.monthToday]}>
                  {selected && <Gradient style={[StyleSheet.absoluteFill, styles.monthSelected]} />}
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={[
                      styles.monthNumber,
                      selected && styles.numberOnGradient,
                      today && styles.numberToday,
                    ]}>
                    {day}
                  </Text>
                  <View
                    style={[
                      styles.monthDot,
                      { backgroundColor: marker ? (selected ? '#FFFFFF' : marker.color) : 'transparent' },
                    ]}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
      {children}
    </WhiteCard>
  );
}

// "14 novembre, 2 scadenze"
function dayLabel(iso: string, count: number, weekday?: string): string {
  const date = parseISODate(iso);
  const base = `${weekday ? `${weekday} ` : ''}${date.getDate()} ${MONTHS[date.getMonth()]}`;
  if (count === 0) return base;
  return `${base}, ${count === 1 ? '1 scadenza' : `${count} scadenze`}`;
}

function Gradient({ style }: { style: object }) {
  return <LinearGradient colors={BRAND_GRADIENT} start={GRADIENT_START} end={GRADIENT_END} style={style} />;
}

function MonthArrow({
  symbol,
  label,
  onPress,
}: {
  symbol: 'chevron.left' | 'chevron.right';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4} style={styles.arrow}>
      <SymbolView name={symbol} tintColor={Colors.light.text} size={15} weight="semibold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  weekCard: {
    marginTop: 12,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  weekLetter: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: Colors.light.textSecondary,
  },
  weekCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCircleFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 19,
    boxShadow: '0 6px 14px rgba(100, 90, 235, 0.28)',
  },
  weekSelected: {
    backgroundColor: Colors.light.lilac,
  },
  weekNumber: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: Colors.light.text,
  },
  weekDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  numberOnGradient: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  numberToday: {
    color: Colors.light.indigo,
    fontFamily: FONTS.bold,
  },
  monthCard: {
    marginTop: 12,
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.paleLilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: Colors.light.text,
  },
  letters: {
    marginTop: 10,
    flexDirection: 'row',
  },
  letter: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: Colors.light.textSecondary,
  },
  grid: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 2,
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
  },
  monthDay: {
    width: 40,
    height: 44,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  monthToday: {
    backgroundColor: Colors.light.lilac,
  },
  monthSelected: {
    borderRadius: 14,
    boxShadow: '0 6px 12px rgba(100, 90, 235, 0.28)',
  },
  monthNumber: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: Colors.light.text,
  },
  monthDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
