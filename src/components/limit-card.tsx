import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ProgressBar } from '@/components/progress-bar';
import { Text } from '@/components/text';
import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import type { FreeUsage } from '@/settings/free-limit';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

// Home at the free limit (docs/design/HomeLimite.dc.html), in place of the backup notice:
// "7 di 7 spazi gratuiti usati", "SBLOCCA" and the full bar, on pale lilac. Opens Sblocca.
export function LimitCard({ usage }: { usage: FreeUsage }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const large = useWindowDimensions().fontScale > 1.3; // larger text: "Sblocca" goes under the title
  const title = t('limitCard.title', { used: usage.shown, count: usage.limit });
  return (
    <Pressable
      onPress={() => router.push('/unlock')}
      accessibilityRole="button"
      accessibilityLabel={t('limitCard.accessibility', { title })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <LinearGradient colors={theme.gradient} start={GRADIENT_START} end={GRADIENT_END} style={styles.icon}>
        <SymbolView name="lock.fill" tintColor="#FFFFFF" size={18} />
      </LinearGradient>
      <View style={styles.texts}>
        <View style={[styles.line, large && styles.lineLarge]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.unlock}>{t('limitCard.unlock')}</Text>
        </View>
        <ProgressBar share={usage.share} />
      </View>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  card: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: c.paleLilac,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 12px rgba(100, 90, 235, 0.25)',
  },
  texts: {
    flex: 1,
    gap: 6,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  lineLarge: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  title: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  unlock: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
    color: c.accent,
  },
});
