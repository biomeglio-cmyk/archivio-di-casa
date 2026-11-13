import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/logo-mark';
import { PrimaryButton } from '@/components/primary-button';
import { ProgressBar } from '@/components/progress-bar';
import { Text } from '@/components/text';
import { WhiteCard } from '@/components/white-card';
import { onSoftTint, type Palette, softTint, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useDbQuery } from '@/hooks/use-db-query';
import { getFreeUsage, UNLOCK_PRICE } from '@/settings/free-limit';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const MINT_TINT = (p: Palette) => softTint(p, '#E6F7F0', '#15332A');
const MINT_INK = (p: Palette) => onSoftTint(p, '#1F7A5A', '#7FE0BC');
const BENEFITS = [
  { title: 'Documenti senza limiti', text: 'Bollette, tessere, garanzie e tutto il resto' },
  { title: 'Promemoria delle scadenze', text: 'Ti avvisiamo prima che sia tardi' },
  { title: 'Funziona senza internet', text: 'Tutto resta sul tuo telefono, anche il backup' },
  { title: 'Tutta la famiglia', text: 'Un profilo per ogni persona di casa' },
];

// The purchase needs StoreKit, which only works in a build from the App Store (not in Expo Go)
function storeOnly() {
  Alert.alert("Disponibile nella versione dell'App Store");
}

function remainingText(remaining: number): string {
  if (remaining === 0) return 'Hai usato tutti gli spazi gratuiti.';
  return `Ne puoi aggiungere ancora ${remaining}.`;
}

// "Sblocca" (docs/design/Sblocca.dc.html): what the free version allows, how much is used, the
// one-time 0,99 € purchase. Purchase and "Ripristina acquisto" are stubs for now.
export default function UnlockScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { data: usage } = useDbQuery(getFreeUsage, []);
  const used = usage?.used ?? 0;
  const limit = usage?.limit ?? 7;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: 24, paddingBottom: insets.bottom + 36 }]}>
      <View style={styles.top}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Chiudi"
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <SymbolView name="xmark" tintColor={theme.text} size={18} weight="semibold" />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.logo} accessible accessibilityRole="image" accessibilityLabel="Sottomano">
          <LogoMark size={76} radius={17} />
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>
            Versione gratuita · {used} di {limit} usati
          </Text>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Tutti i tuoi documenti, senza limiti
        </Text>
        <Text style={styles.intro}>
          Gratis fino a {limit} documenti e tessere. Per aggiungerne quanti vuoi, la sblocchi con un solo pagamento.
        </Text>
      </View>

      <WhiteCard style={styles.benefits}>
        {BENEFITS.map((benefit) => (
          <View key={benefit.title} style={styles.benefit}>
            <View style={styles.check}>
              <SymbolView name="checkmark" tintColor={MINT_INK(theme)} size={13} weight="bold" />
            </View>
            <View style={styles.benefitTexts}>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitText}>{benefit.text}</Text>
            </View>
          </View>
        ))}
      </WhiteCard>

      <Text style={styles.sectionTitle} accessibilityRole="header">
        La tua versione gratuita
      </Text>
      <WhiteCard style={styles.usage}>
        <View style={styles.usageRow}>
          <Text style={styles.usageLabel}>Documenti e tessere</Text>
          <Text style={styles.usageValue}>
            {used} di {limit}
          </Text>
        </View>
        <View style={styles.usageBar}>
          <ProgressBar
            share={usage?.share ?? 0}
            height={10}
            accessibilityLabel="Spazi gratuiti usati"
            max={limit}
            now={Math.min(used, limit)}
          />
        </View>
        <Text style={styles.usageNote}>
          {remainingText(usage?.remaining ?? limit)} Quelli già salvati restano sempre tuoi, anche senza sbloccare.
        </Text>
      </WhiteCard>

      <View style={styles.price}>
        <View style={styles.priceTexts}>
          <Text style={styles.priceTitle}>Per sempre</Text>
          <Text style={styles.priceText}>Senza limiti · un solo pagamento</Text>
        </View>
        <Text style={styles.priceValue}>{UNLOCK_PRICE}</Text>
      </View>

      <View style={styles.buy}>
        <PrimaryButton label={`Sblocca per ${UNLOCK_PRICE}`} onPress={storeOnly} />
      </View>
      <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.free}>
        <Text style={styles.freeText}>Continua gratis</Text>
      </Pressable>
      <View style={styles.links}>
        <Link label="Ripristina acquisto" onPress={storeOnly} />
        <Link label="Termini" onPress={() => router.push('/terms')} />
        <Link label="Privacy" onPress={() => router.push('/about')} />
      </View>
    </ScrollView>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={{ top: 14, bottom: 14, left: 6, right: 6 }}>
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
    justifyContent: 'center',
    gap: 18,
  },
  link: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: c.accent,
  },
});
