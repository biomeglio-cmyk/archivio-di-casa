import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useFormat } from '@/i18n/use-format';
import { parseISODate } from '@/utils/dates';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

type Props = {
  iso: string; // 'YYYY-MM-DD'
  highlighted?: boolean; // the nearest deadline: main gradient; the others lilac
};

// Day and month in a 46 × 50 square (lists of deadlines)
export function DateSquare({ iso, highlighted = false }: Props) {
  const fmt = useFormat();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const date = parseISODate(iso);
  const color = highlighted ? '#FFFFFF' : theme.indigo;
  const content = (
    <>
      <Text style={[styles.day, { color }]} maxFontSizeMultiplier={2}>
        {date.getDate()}
      </Text>
      <Text style={[styles.month, { color }]} maxFontSizeMultiplier={2}>
        {fmt.monthName(date.getMonth(), 'short')}
      </Text>
    </>
  );
  return highlighted ? (
    <LinearGradient
      colors={theme.gradient}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={[styles.square, styles.highlighted]}
      accessible
      accessibilityLabel={fmt.date(iso)}>
      {content}
    </LinearGradient>
  ) : (
    <View style={[styles.square, styles.idle]} accessible accessibilityLabel={fmt.date(iso)}>
      {content}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  square: {
    minWidth: 46,
    minHeight: 50,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlighted: {
    boxShadow: '0 6px 12px rgba(100, 90, 235, 0.25)',
  },
  idle: {
    backgroundColor: c.lilac,
  },
  day: {
    fontSize: 18,
    lineHeight: 19,
    fontFamily: FONTS.bold,
  },
  month: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: FONTS.medium,
  },
});
