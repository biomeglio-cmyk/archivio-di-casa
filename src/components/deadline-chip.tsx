import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useI18n } from '@/i18n';
import { onSoftTint, type Palette, softTint } from '@/constants/theme';
import { isLightColor, textOn } from '@/utils/colors';
import { daysUntil } from '@/utils/deadlines';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const RED = (p: Palette) => p.error;
const RED_SOFT = (p: Palette) => p.errorBackground;
const AMBER = (p: Palette) => onSoftTint(p, '#8A5A00', '#F5CF7A');
const AMBER_SOFT = (p: Palette) => softTint(p, '#FFF1D6', '#2A2420');
// Behind the tile's own text color: translucent white under dark text (pastel tiles),
// translucent black under light text (palette "Notte", dark cover colors)
const NEUTRAL_ON_LIGHT = 'rgba(255, 255, 255, 0.55)';
const NEUTRAL_ON_DARK = 'rgba(0, 0, 0, 0.28)';

type Props = {
  expiresAt: string | null; // 'YYYY-MM-DD'
  neutralColor: string; // text and bell when the deadline is far (the tile's text color)
};

// The deadline on a document tile: an icon and the days left ("-12").
// Far (>30 days) neutral with a bell, ≤30 amber with a clock, ≤7 and today red with an
// exclamation mark, past "Scaduta" in solid red with a warning triangle: the urgency is in the
// shape of the icon too, not only in the color (Differenzia senza colore).
// Nothing when there is no deadline. The full date is on the document screen.
export function DeadlineChip({ expiresAt, neutralColor }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  if (!expiresAt) return null;
  const days = daysUntil(expiresAt);

  let label: string;
  let spoken: string;
  let colors: { background: string; text: string };
  let symbol: SFSymbol;
  if (days < 0) {
    label = t('deadlineChip.overdue');
    spoken = label;
    // White on the light red of the dark palette is unreadable: dark ink there
    colors = { background: RED(theme), text: textOn(RED(theme)) };
    symbol = 'exclamationmark.triangle.fill';
  } else if (days === 0) {
    label = t('deadlineChip.today');
    spoken = t('deadlineChip.dueToday');
    colors = { background: RED_SOFT(theme), text: RED(theme) };
    symbol = 'exclamationmark.circle.fill';
  } else {
    label = `-${days}`;
    spoken = t('deadlineChip.dueIn', { count: days });
    if (days <= 7) {
      colors = { background: RED_SOFT(theme), text: RED(theme) };
      symbol = 'exclamationmark.circle.fill';
    } else if (days <= 30) {
      colors = { background: AMBER_SOFT(theme), text: AMBER(theme) };
      symbol = 'clock';
    } else {
      colors = { background: isLightColor(neutralColor) ? NEUTRAL_ON_DARK : NEUTRAL_ON_LIGHT, text: neutralColor };
      symbol = 'bell';
    }
  }

  return (
    <View
      style={[styles.chip, { backgroundColor: colors.background }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={spoken}>
      <SymbolView name={symbol} tintColor={colors.text} size={12} />
      <Text style={[styles.label, { color: colors.text }]} maxFontSizeMultiplier={2}>
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
});
