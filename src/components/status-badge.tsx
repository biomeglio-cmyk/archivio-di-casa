import { StyleSheet } from 'react-native';

import { Text } from '@/components/text';
import { type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import type { PaymentStatus } from '@/db/types';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

// "Da pagare" (#B42318 on #FDECEC) / "Pagata" (#0B6B4F on #E3F6EE), as in the design
export function StatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const due = status === 'due';
  return (
    <Text
      style={[
        styles.badge,
        due
          ? { color: theme.error, backgroundColor: theme.errorBackground }
          : { color: theme.success, backgroundColor: theme.successBackground },
      ]}
      maxFontSizeMultiplier={1.4}>
      {due ? t('statusBadge.due') : t('statusBadge.paid')}
    </Text>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  badge: {
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
});
