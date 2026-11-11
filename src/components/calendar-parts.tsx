import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { BRAND_COLOR } from '@/constants/brand';
import { FONTS } from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';

// Pieces shared by the month grid and the week strip of Scadenze

const MAX_DOTS = 3;
const SWIPE_DISTANCE = 50; // points of horizontal movement needed to change week or month
const DAY_MAX_FONT_SCALE = 1.5; // day numbers grow with Dynamic Type, but 7 columns must still fit

// Horizontal swipe on a calendar card: left = next, right = previous. Only clearly horizontal
// moves are taken, so taps on the days and the vertical scroll keep working.
export function useHorizontalSwipe(onPrevious: () => void, onNext: () => void) {
  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_, g) => {
          if (g.dx <= -SWIPE_DISTANCE) onNext();
          else if (g.dx >= SWIPE_DISTANCE) onPrevious();
        },
      }),
    [onPrevious, onNext],
  ).panHandlers;
}

type DayCellProps = {
  iso: string;
  isToday: boolean;
  isSelected: boolean;
  dots: string[]; // colors of the deadlines of the day
  onSelect: (iso: string) => void;
};

// One day: number in a circle (brand color for today, dark for the selected day), dots below
export function DayCell({ iso, isToday, isSelected, dots, onSelect }: DayCellProps) {
  const theme = useTheme();
  const day = Number(iso.slice(8));
  // Today always keeps its brand circle; another selected day gets a dark one
  const circleColor = isToday ? BRAND_COLOR : isSelected ? theme.text : 'transparent';
  const numberColor = isToday ? '#FFFFFF' : isSelected ? theme.surface : theme.text;

  return (
    <Pressable
      onPress={() => onSelect(iso)}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${day}${dots.length ? ', con scadenze' : ''}`}
      style={styles.day}>
      <View style={[styles.circle, { backgroundColor: circleColor }]}>
        <Text
          maxFontSizeMultiplier={DAY_MAX_FONT_SCALE}
          style={[styles.number, { color: numberColor }, (isToday || isSelected) && styles.numberBold]}>
          {day}
        </Text>
      </View>
      <View style={styles.dots}>
        {dots.slice(0, MAX_DOTS).map((color, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: color }]} />
        ))}
      </View>
    </Pressable>
  );
}

// An empty cell with the same width as a day (before the 1st, after the last day)
export function EmptyDayCell() {
  return <View style={styles.day} />;
}

type HeaderProps = {
  title: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
};

// "Novembre 2026  [Oggi]          <  >"
export function CalendarHeader({ title, previousLabel, nextLabel, onPrevious, onNext, onToday }: HeaderProps) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
        {title}
      </Text>
      <Pressable onPress={onToday} hitSlop={8} accessibilityRole="button" style={styles.todayButton}>
        <Text style={styles.todayLabel}>Oggi</Text>
      </Pressable>
      <View style={styles.spacer} />
      <Pressable onPress={onPrevious} accessibilityRole="button" accessibilityLabel={previousLabel} style={styles.arrow}>
        <SymbolView name="chevron.left" tintColor={BRAND_COLOR} size={18} />
      </Pressable>
      <Pressable onPress={onNext} accessibilityRole="button" accessibilityLabel={nextLabel} style={styles.arrow}>
        <SymbolView name="chevron.right" tintColor={BRAND_COLOR} size={18} />
      </Pressable>
    </View>
  );
}

export const calendarStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 12,
  },
  week: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 4,
  },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    marginBottom: 4,
  },
  title: {
    flexShrink: 1,
    fontSize: 20,
    fontFamily: FONTS.bold,
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
    fontFamily: FONTS.semiBold,
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
  day: {
    flex: 1, // 7 equal columns
    minHeight: 48, // grows with large text instead of cutting the number
    alignItems: 'center',
    paddingTop: 2,
  },
  circle: {
    minWidth: 34,
    minHeight: 34,
    paddingHorizontal: 4,
    borderRadius: 999, // a circle, or a pill when the number is larger
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
