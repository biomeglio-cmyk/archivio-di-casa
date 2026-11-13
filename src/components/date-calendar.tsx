import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { BRAND_GRADIENT, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { monthName, weekdayLetters } from '@/i18n/format';
import { formatMonthTitle, toISODate } from '@/utils/dates';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const CELL = 38;

type Props = {
  value: Date;
  onChange: (date: Date) => void;
};

// Month calendar of the Modifica design: ‹ month › on pale lilac, L M M G V S D, 38pt days;
// the chosen day in the main gradient, today on lilac with indigo text
export function DateCalendar({ value, onChange }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const blanks = (new Date(year, monthIndex, 1).getDay() + 6) % 7; // Monday first
  const todayIso = toISODate(new Date());
  const valueIso = toISODate(value);

  const cells: (number | null)[] = [...Array<null>(blanks).fill(null)];
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  const shift = (delta: number) => setMonth(new Date(year, monthIndex + delta, 1));

  return (
    <View>
      <View style={styles.header}>
        <MonthButton symbol="chevron.left" label="Mese precedente" onPress={() => shift(-1)} />
        <Text style={styles.month} accessibilityRole="header">
          {formatMonthTitle(year, monthIndex)}
        </Text>
        <MonthButton symbol="chevron.right" label="Mese successivo" onPress={() => shift(1)} />
      </View>
      <View style={styles.week} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {weekdayLetters().map((day, index) => (
          <Text key={index} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) return <View key={`b${index}`} style={styles.cell} />;
          const iso = toISODate(new Date(year, monthIndex, day));
          const selected = iso === valueIso;
          const today = iso === todayIso;
          return (
            <View key={iso} style={styles.cell}>
              <Pressable
                onPress={() => onChange(new Date(year, monthIndex, day))}
                accessibilityRole="button"
                accessibilityLabel={`${day} ${monthName(monthIndex)}`}
                accessibilityState={{ selected }}
                style={[styles.day, today && !selected && styles.today]}>
                {selected && (
                  <LinearGradient
                    colors={BRAND_GRADIENT}
                    start={GRADIENT_START}
                    end={GRADIENT_END}
                    style={[StyleSheet.absoluteFill, styles.selected]}
                  />
                )}
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[styles.number, selected && styles.numberSelected, today && !selected && styles.numberToday]}>
                  {day}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MonthButton({
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={styles.monthButton}>
      <SymbolView name={symbol} tintColor={theme.text} size={15} weight="semibold" />
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.paleLilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  month: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  week: {
    marginTop: 10,
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: c.textSecondary,
  },
  grid: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
  },
  day: {
    width: CELL,
    height: CELL,
    borderRadius: CELL / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    borderRadius: CELL / 2,
    boxShadow: '0 6px 12px rgba(100, 90, 235, 0.28)',
  },
  today: {
    backgroundColor: c.lilac,
  },
  number: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: c.text,
  },
  numberSelected: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  numberToday: {
    color: c.indigo,
    fontFamily: FONTS.bold,
  },
});
