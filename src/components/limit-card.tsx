import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/progress-bar';
import { Text } from '@/components/text';
import { BRAND_GRADIENT, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { Colors, themedStyles } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import type { FreeUsage } from '@/settings/free-limit';

// Home at the free limit (docs/design/HomeLimite.dc.html), in place of the backup notice:
// "7 di 7 spazi gratuiti usati", "SBLOCCA" and the full bar, on pale lilac. Opens Sblocca.
export function LimitCard({ usage }: { usage: FreeUsage }) {
  const title = `${usage.used} di ${usage.limit} spazi gratuiti usati`;
  return (
    <Pressable
      onPress={() => router.push('/unlock')}
      accessibilityRole="button"
      accessibilityLabel={`${title}. Sblocca`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <LinearGradient colors={BRAND_GRADIENT} start={GRADIENT_START} end={GRADIENT_END} style={styles.icon}>
        <SymbolView name="lock.fill" tintColor="#FFFFFF" size={18} />
      </LinearGradient>
      <View style={styles.texts}>
        <View style={styles.line}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.unlock}>Sblocca</Text>
        </View>
        <ProgressBar share={usage.share} />
      </View>
    </Pressable>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  card: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: Colors.current.paleLilac,
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
  title: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
  },
  unlock: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
    color: Colors.current.accent,
  },
}));
