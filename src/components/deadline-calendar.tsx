import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { announce } from '@/a11y/accessibility';
import { useHorizontalSwipe } from '@/components/calendar-parts';
import { Text } from '@/components/text';
import { WhiteCard } from '@/components/white-card';
import { BRAND_GRADIENT, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useI18n } from '@/i18n';
import { useFormat } from '@/i18n/use-format';
import { addDaysIso, parseISODate, toISODate } from '@/utils/dates';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';


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
// the chosen day on lilac with a ring), a 6pt dot under the days with deadlines. Swipe for the next
// week, or the ‹ › buttons around the month of the week (no swipe needed, VoiceOver included).
export function WeekCalendar({ weekStartIso, todayIso, selectedIso, markers, onSelect, onPrevious, onNext }: WeekProps) {
  const { t } = useI18n();
  const fmt = useFormat();
  const styles = useThemedStyles(makeStyles);
  // The buttons and the swipe say the new week to VoiceOver ("Settimana del 16 novembre")
  const previous = () => {
    onPrevious();
    announce(t('a11y.deadlineCalendar.weekOf', { date: fmt.dayMonth(parseISODate(addDaysIso(weekStartIso, -7))) }));
  };
  const next = () => {
    onNext();
    announce(t('a11y.deadlineCalendar.weekOf', { date: fmt.dayMonth(parseISODate(addDaysIso(weekStartIso, 7))) }));
  };
  const swipe = useHorizontalSwipe(previous, next);
  const thursday = parseISODate(addDaysIso(weekStartIso, 3)); // the month most of the week is in
  const weekdays = fmt.weekdayNamesFromMonday();
  return (
    <WhiteCard style={styles.weekCard} {...swipe}>
      <View style={styles.weekHeader}>
        <MonthArrow symbol="chevron.left" label={t('deadlineCalendar.previousWeek')} onPress={previous} />
        <Text style={styles.monthTitle} accessibilityRole="header">
          {fmt.monthTitle(thursday.getFullYear(), thursday.getMonth())}
        </Text>
        <MonthArrow symbol="chevron.right" label={t('deadlineCalendar.nextWeek')} onPress={next} />
      </View>
      <View style={styles.weekRow}>
        {fmt.weekdayLetters().map((letter, index) => {
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
              accessibilityLabel={dayLabel(t, fmt, iso, marker?.count ?? 0, today, weekdays[index])}
              style={styles.weekDay}>
              <Text style={styles.weekLetter} maxFontSizeMultiplier={2}>
                {letter}
              </Text>
              <View style={[styles.weekCircle, selected && styles.weekSelected]}>
                {today && <Gradient style={styles.weekCircleFill} />}
                <Text
                  maxFontSizeMultiplier={2}
                  style={[styles.weekNumber, today && styles.numberOnGradient, selected && styles.numberToday]}>
                  {day}
                </Text>
              </View>
              <View style={[styles.weekDot, { backgroundColor: marker?.color ?? 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
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
  const { t } = useI18n();
  const fmt = useFormat();
  const styles = useThemedStyles(makeStyles);
  // The buttons and the swipe say the new month to VoiceOver
  const previous = () => {
    onPrevious();
    announce(fmt.monthTitle(month === 0 ? year - 1 : year, (month + 11) % 12));
  };
  const next = () => {
    onNext();
    announce(fmt.monthTitle(month === 11 ? year + 1 : year, (month + 1) % 12));
  };
  const swipe = useHorizontalSwipe(previous, next);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
  const cells: (number | null)[] = [...Array<null>(blanks).fill(null)];
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  return (
    <WhiteCard style={styles.monthCard}>
      <View {...swipe}>
        <View style={styles.monthHeader}>
          <MonthArrow symbol="chevron.left" label={t('dateCalendar.previousMonth')} onPress={previous} />
          <Text style={styles.monthTitle} accessibilityRole="header">
            {fmt.monthTitle(year, month)}
          </Text>
          <MonthArrow symbol="chevron.right" label={t('dateCalendar.nextMonth')} onPress={next} />
        </View>
        <View style={styles.letters} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {fmt.weekdayLetters().map((letter, index) => (
            <Text key={index} style={styles.letter} maxFontSizeMultiplier={2}>
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
                  accessibilityLabel={dayLabel(t, fmt, iso, marker?.count ?? 0, iso === todayIso)}
                  style={[styles.monthDay, today && styles.monthToday]}>
                  {selected && <Gradient style={[StyleSheet.absoluteFill, styles.monthSelected]} />}
                  <Text
                    maxFontSizeMultiplier={2}
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

// "14 novembre, oggi, 2 scadenze"
function dayLabel(
  t: ReturnType<typeof useI18n>['t'],
  fmt: ReturnType<typeof useFormat>,
  iso: string,
  count: number,
  today: boolean,
  weekday?: string,
): string {
  const date = fmt.dayMonth(parseISODate(iso));
  const day = weekday ? t('deadlineCalendar.weekdayDate', { weekday, date }) : date;
  const base = today ? t('a11y.calendar.today', { date: day }) : day;
  if (count === 0) return base;
  return t('deadlineCalendar.dayWithDeadlines', { day: base, count });
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
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4} style={styles.arrow}>
      <SymbolView name={symbol} tintColor={theme.text} size={15} weight="semibold" />
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  weekCard: {
    marginTop: 12,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  weekLetter: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: c.textSecondary,
  },
  weekCircle: {
    minWidth: 38,
    minHeight: 38,
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
    backgroundColor: c.lilac,
    borderWidth: 1.5, // a ring, not only a color (Differenzia senza colore)
    borderColor: c.indigo,
  },
  weekNumber: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: c.text,
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
    color: c.indigo,
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
    minWidth: 36,
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: c.paleLilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  letters: {
    marginTop: 10,
    flexDirection: 'row',
  },
  letter: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: c.textSecondary,
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
    minWidth: 40,
    minHeight: 44,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  monthToday: {
    backgroundColor: c.lilac,
    borderWidth: 1.5, // a ring, not only a color (Differenzia senza colore)
    borderColor: c.indigo,
  },
  monthSelected: {
    borderRadius: 14,
    boxShadow: '0 6px 12px rgba(100, 90, 235, 0.28)',
  },
  monthNumber: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: c.text,
  },
  monthDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
