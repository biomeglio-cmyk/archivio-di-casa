import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/logo-mark';
import { PrimaryButton } from '@/components/primary-button';
import { Text } from '@/components/text';
import { onSoftTint, type Palette, softTint } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { FREE_LIMIT, unlockPrice } from '@/settings/free-limit';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

const MINT_TINT = (p: Palette) => softTint(p, '#E6F7F0', '#15332A');
const MINT_INK = (p: Palette) => onSoftTint(p, '#1F7A5A', '#7FE0BC');
// What keeps working at the limit: keys of limit.stillWorks
const STILL_WORKS = ['view', 'send', 'cards', 'reminders'] as const;

// The limit panel (docs/design/ProvaFinita.dc.html), a sheet over the screen that tried to add:
// the logo, "Hai usato i 7 spazi gratuiti", what keeps working (ticks) and what doesn't (lock),
// "Sblocca senza limiti a 0,99 €" and "Più tardi". Tap outside to close.
export default function LimitPanel() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  return (
    <Animated.View entering={FadeIn.duration(160)} style={styles.dim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('limit.later')} />
      <Animated.View
        entering={SlideInDown.duration(240)}
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 14 }]}
        accessibilityViewIsModal>
        <View style={styles.grabber} />
        <View style={styles.logo}>
          <LogoMark size={60} radius={14} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {t('limit.title', { count: FREE_LIMIT })}
        </Text>
        <Text style={styles.text}>{t('limit.text')}</Text>
        <View style={styles.list}>
          {STILL_WORKS.map((item) => (
            <View key={item} style={styles.item}>
              <View style={[styles.mark, styles.markOn]}>
                <SymbolView name="checkmark" tintColor={MINT_INK(theme)} size={13} weight="bold" />
              </View>
              <Text style={styles.itemText}>{t(`limit.stillWorks.${item}`)}</Text>
            </View>
          ))}
          <View style={styles.item}>
            <View style={[styles.mark, styles.markOff]}>
              <SymbolView name="lock.fill" tintColor={theme.textSecondary} size={12} />
            </View>
            <Text style={[styles.itemText, styles.itemOff]}>{t('limit.blocked')}</Text>
          </View>
        </View>
        <PrimaryButton
          label={t('limit.unlock', { price: unlockPrice() })}
          onPress={() => router.replace('/unlock')}
          style={styles.unlock}
        />
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.later}>
          <Text style={styles.laterText}>{t('limit.later')}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  dim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(28, 30, 70, 0.42)',
  },
  sheet: {
    paddingTop: 12,
    paddingHorizontal: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: c.surface,
    boxShadow: '0 -10px 30px rgba(28, 30, 70, 0.15)',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: c.switchOff,
  },
  logo: {
    marginTop: 18,
    alignSelf: 'center',
    borderRadius: 14,
    boxShadow: '0 6px 10px rgba(100, 90, 235, 0.28)',
  },
  title: {
    marginTop: 14,
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: c.text,
    textAlign: 'center',
  },
  text: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
    textAlign: 'center',
  },
  list: {
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    backgroundColor: c.paleLilac,
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOn: {
    backgroundColor: MINT_TINT(c),
  },
  markOff: {
    backgroundColor: c.elevated,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: c.text,
  },
  itemOff: {
    color: c.textSecondary,
  },
  unlock: {
    marginTop: 20,
  },
  later: {
    marginTop: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterText: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: c.accent,
  },
});
