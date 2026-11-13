import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useI18n } from '@/i18n';
import { onSoftTint, type Palette, softTint } from '@/constants/theme';
import { isLightColor } from '@/utils/colors';
import { daysUntil } from '@/utils/deadlines';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const RED = (p: Palette) => p.error;
const RED_SOFT = (p: Palette) => p.errorBackground;
const AMBER = (p: Palette) => onSoftTint(p, '#8A5A00', '#F5CB6B');
const AMBER_SOFT = (p: Palette) => softTint(p, '#FFF1D6', '#352A12');
// Behind the tile's own text color: translucent white under dark text (pastel tiles),
// translucent black under light text (palette "Notte", dark cover colors)
const NEUTRAL_ON_LIGHT = 'rgba(255, 255, 255, 0.55)';
const NEUTRAL_ON_DARK = 'rgba(0, 0, 0, 0.28)';

type Props = {
  expiresAt: string | null; // 'YYYY-MM-DD'
  neutralColor: string; // text and bell when the deadline is far (the tile's text color)
};

// The deadline on a document tile: a bell and the days left ("-12").
// Far (>30 days) neutral, ≤30 amber, ≤7 red, today "Oggi", past "Scaduta" in solid red.
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
  if (days < 0) {
    label = t('deadlineChip.overdue');
    spoken = label;
    colors = { background: RED(theme), text: '#FFFFFF' };
  } else if (days === 0) {
    label = t('deadlineChip.today');
    spoken = t('deadlineChip.dueToday');
    colors = { background: RED_SOFT(theme), text: RED(theme) };
  } else {
    label = `-${days}`;
    spoken = t('deadlineChip.dueIn', { count: days });
    colors =
      days <= 7
        ? { background: RED_SOFT(theme), text: RED(theme) }
        : days <= 30
          ? { background: AMBER_SOFT(theme), text: AMBER(theme) }
          : { background: isLightColor(neutralColor) ? NEUTRAL_ON_DARK : NEUTRAL_ON_LIGHT, text: neutralColor };
  }

  return (
    <View
      style={[styles.chip, { backgroundColor: colors.background }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={spoken}>
      <SymbolView name="bell" tintColor={colors.text} size={12} />
      <Text style={[styles.label, { color: colors.text }]} maxFontSizeMultiplier={1.6}>
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
