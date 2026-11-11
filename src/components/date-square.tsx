import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { BRAND_GRADIENT, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { Colors } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { formatDate, MONTHS_SHORT, parseISODate } from '@/utils/dates';

type Props = {
  iso: string; // 'YYYY-MM-DD'
  highlighted?: boolean; // the nearest deadline: main gradient; the others lilac
};

// Day and month in a 46 × 50 square (lists of deadlines)
export function DateSquare({ iso, highlighted = false }: Props) {
  const date = parseISODate(iso);
  const color = highlighted ? '#FFFFFF' : Colors.light.indigo;
  const content = (
    <>
      <Text style={[styles.day, { color }]} maxFontSizeMultiplier={1.2}>
        {date.getDate()}
      </Text>
      <Text style={[styles.month, { color }]} maxFontSizeMultiplier={1.2}>
        {MONTHS_SHORT[date.getMonth()]}
      </Text>
    </>
  );
  return highlighted ? (
    <LinearGradient
      colors={BRAND_GRADIENT}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={[styles.square, styles.highlighted]}
      accessible
      accessibilityLabel={formatDate(iso)}>
      {content}
    </LinearGradient>
  ) : (
    <View style={[styles.square, styles.idle]} accessible accessibilityLabel={formatDate(iso)}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  square: {
    width: 46,
    height: 50,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlighted: {
    boxShadow: '0 6px 12px rgba(100, 90, 235, 0.25)',
  },
  idle: {
    backgroundColor: Colors.light.lilac,
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
