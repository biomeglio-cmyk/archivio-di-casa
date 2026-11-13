import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/logo-mark';
import { PrimaryButton } from '@/components/primary-button';
import { ProgressBar } from '@/components/progress-bar';
import { NoBreakText } from '@/components/tile-title';
import { Text } from '@/components/text';
import { WhiteCard } from '@/components/white-card';
import { onSoftTint, type Palette, softTint, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useDbQuery } from '@/hooks/use-db-query';
import { t as translate, useI18n } from '@/i18n';
import { getFreeUsage, unlockPrice } from '@/settings/free-limit';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const MINT_TINT = (p: Palette) => softTint(p, '#E6F7F0', '#14282A');
const MINT_INK = (p: Palette) => onSoftTint(p, '#1F7A5A', '#7FE0BC');
// Keys of unlock.benefits.<key>.title / .text
const BENEFITS = ['unlimited', 'reminders', 'offline', 'family'] as const;

// The purchase needs StoreKit, which only works in a build from the App Store (not in Expo Go)
function storeOnly() {
  Alert.alert(translate('unlock.storeOnly'));
}

function remainingText(remaining: number): string {
  if (remaining === 0) return translate('unlock.remainingNone');
  return translate('unlock.remaining', { count: remaining });
}

// "Sblocca" (docs/design/Sblocca.dc.html): what the free version allows, how much is used, the
// one-time 0,99 € purchase. Purchase and "Ripristina acquisto" are stubs for now.
export default function UnlockScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const large = useWindowDimensions().fontScale > 1.3; // larger text: the price goes under its texts
  const { data: usage } = useDbQuery(getFreeUsage, []);
  const used = usage?.shown ?? 0; // never more than the limit ("7 di 7")
  const limit = usage?.limit ?? 7;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: 24, paddingBottom: insets.bottom + 36 }]}>
      <View style={styles.top}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <SymbolView name="xmark" tintColor={theme.text} size={18} weight="semibold" />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.logo} accessible accessibilityRole="image" accessibilityLabel="Sottomano" /* i18n-ignore: brand */>
          <LogoMark size={76} radius={17} />
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{t('unlock.tag', { used, limit })}</Text>
        </View>
        <NoBreakText style={styles.title} accessibilityRole="header">
          {t('unlock.title')}
        </NoBreakText>
        <Text style={styles.intro}>{t('unlock.intro', { count: limit })}</Text>
      </View>

      <WhiteCard style={styles.benefits}>
        {BENEFITS.map((benefit) => (
          // One element for VoiceOver: "Documenti illimitati, …"
          <View
            key={benefit}
            style={styles.benefit}
            accessible
            accessibilityLabel={`${t(`unlock.benefits.${benefit}.title`)}, ${t(`unlock.benefits.${benefit}.text`)}`}>
            <View style={styles.check}>
              <SymbolView name="checkmark" tintColor={MINT_INK(theme)} size={13} weight="bold" />
            </View>
            <View style={styles.benefitTexts}>
              <Text style={styles.benefitTitle}>{t(`unlock.benefits.${benefit}.title`)}</Text>
              <Text style={styles.benefitText}>{t(`unlock.benefits.${benefit}.text`)}</Text>
            </View>
          </View>
        ))}
      </WhiteCard>

      <Text style={styles.sectionTitle} accessibilityRole="header">
        {t('unlock.sectionTitle')}
      </Text>
      <WhiteCard style={styles.usage}>
        <View
          style={styles.usageRow}
          accessible
          accessibilityLabel={`${t('unlock.usageLabel')}, ${t('unlock.usageValue', { used, limit })}`}>
          <Text style={styles.usageLabel}>{t('unlock.usageLabel')}</Text>
          <Text style={styles.usageValue}>{t('unlock.usageValue', { used, limit })}</Text>
        </View>
        <View style={styles.usageBar}>
          <ProgressBar
            share={usage?.share ?? 0}
            height={10}
            accessibilityLabel={t('unlock.usageA11y')}
            max={limit}
            now={Math.min(used, limit)}
          />
        </View>
        <Text style={styles.usageNote}>
          {remainingText(usage?.remaining ?? limit)} {t('unlock.keptNote')}
        </Text>
      </WhiteCard>

      <View
        style={[styles.price, large && styles.priceLarge]}
        accessible
        accessibilityLabel={`${t('unlock.priceTitle')}, ${unlockPrice()}, ${t('unlock.priceText')}`}>
        <View style={styles.priceTexts}>
          <Text style={styles.priceTitle}>{t('unlock.priceTitle')}</Text>
          <Text style={styles.priceText}>{t('unlock.priceText')}</Text>
        </View>
        <Text style={styles.priceValue}>{unlockPrice()}</Text>
      </View>

      <View style={styles.buy}>
        <PrimaryButton label={t('unlock.buy', { price: unlockPrice() })} onPress={storeOnly} />
      </View>
      <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.free}>
        <Text style={styles.freeText}>{t('unlock.continueFree')}</Text>
      </Pressable>
      <View style={styles.links}>
        <Link label={t('unlock.restore')} onPress={storeOnly} role="button" />
        <Link label={t('unlock.terms')} onPress={() => router.push('/terms')} />
        <Link label={t('unlock.privacy')} onPress={() => router.push('/about')} />
      </View>
    </ScrollView>
  );
}

// role: "link" for the pages it opens, "button" for an action ("Ripristina acquisto")
function Link({ label, onPress, role = 'link' }: { label: string; onPress: () => void; role?: 'link' | 'button' }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} accessibilityRole={role} hitSlop={{ top: 14, bottom: 14, left: 6, right: 6 }}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    paddingHorizontal: Spacing.side,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  hero: {
    alignItems: 'center',
  },
  logo: {
    borderRadius: 17,
    boxShadow: '0 6px 10px rgba(100, 90, 235, 0.28)',
  },
  tag: {
    marginTop: 16,
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: c.lilac,
    justifyContent: 'center',
  },
  tagText: {
    color: c.indigo,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.96, // 0.08em of the design
  },
  title: {
    marginTop: 14,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: FONTS.bold,
    textAlign: 'center',
    color: c.text,
  },
  intro: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    color: c.textSecondary,
  },
  benefits: {
    marginTop: 22,
    padding: 18,
    gap: 14,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: MINT_TINT(c),
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTexts: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  benefitText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  sectionTitle: {
    marginTop: 24,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: c.textSecondary,
  },
  usage: {
    marginTop: 12,
    padding: 18,
  },
  usageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap', // larger text: the value goes under the label
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  usageLabel: {
    flexShrink: 1,
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  usageValue: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: c.indigo,
  },
  usageBar: {
    marginTop: 10,
  },
  usageNote: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  price: {
    marginTop: 14,
    padding: 20,
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: '#6D5CE6',
    backgroundColor: c.paleLilac,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceLarge: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  priceTexts: {
    flexShrink: 1,
  },
  priceTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  priceText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  priceValue: {
    fontSize: 30,
    fontFamily: FONTS.bold,
    color: c.indigo,
  },
  buy: {
    marginTop: 18,
  },
  free: {
    marginTop: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeText: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: c.accent,
  },
  links: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap', // larger text: the links go on more lines
    justifyContent: 'center',
    columnGap: 18,
    rowGap: 14,
  },
  link: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: c.accent,
  },
});
