import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/progress-bar';
import { Text } from '@/components/text';
import { BRAND_GRADIENT, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { FONTS } from '@/constants/typography';
import { useDbQuery } from '@/hooks/use-db-query';
import { getFreeUsage, UNLOCK_PRICE } from '@/settings/free-limit';

type Props = {
  variant: 'menu' | 'settings'; // menu: "Gratis: …" with a chevron; settings: bigger, white "Sblocca" pill
  onOpen?: () => void; // how to open Sblocca (the menu closes itself first)
};

// Purple card "Gratis: 5 di 7 usati" / "Versione gratuita: 5 di 7 usati" with its bar; opens Sblocca
export function FreeUsageCard({ variant, onOpen = () => router.push('/unlock') }: Props) {
  const { data: usage } = useDbQuery(getFreeUsage, []);
  if (!usage || usage.unlocked) return null;
  const settings = variant === 'settings';
  const title = `${settings ? 'Versione gratuita' : 'Gratis'}: ${usage.used} di ${usage.limit} usati`;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${title}. Sblocca senza limiti a ${UNLOCK_PRICE}`}
      style={({ pressed }) => [settings ? styles.cardSettings : styles.cardMenu, pressed && styles.pressed]}>
      <LinearGradient
        colors={BRAND_GRADIENT}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={[styles.fill, settings ? styles.fillSettings : styles.fillMenu]}>
        <View style={[styles.icon, settings && styles.iconSettings]}>
          <SymbolView name="gift" tintColor="#FFFFFF" size={settings ? 22 : 20} />
        </View>
        <View style={styles.texts}>
          <Text style={[styles.title, settings && styles.titleSettings]}>{title}</Text>
          <Text style={styles.subtitle}>Sblocca senza limiti a {UNLOCK_PRICE}</Text>
          <View style={styles.bar}>
            <ProgressBar share={usage.share} onGradient />
          </View>
        </View>
        {settings ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>Sblocca</Text>
          </View>
        ) : (
          <SymbolView name="chevron.right" tintColor="#FFFFFF" size={14} weight="semibold" />
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardMenu: {
    borderRadius: 20,
    boxShadow: '0 10px 20px rgba(100, 90, 235, 0.25)',
  },
  cardSettings: {
    borderRadius: 22,
    boxShadow: '0 10px 22px rgba(100, 90, 235, 0.25)',
  },
  pressed: {
    opacity: 0.85,
  },
  fill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  fillMenu: {
    padding: 14,
    gap: 12,
    borderRadius: 20,
  },
  fillSettings: {
    padding: 16,
    gap: 14,
    borderRadius: 22,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSettings: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
  titleSettings: {
    fontSize: 16,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONTS.regular,
  },
  bar: {
    marginTop: 6,
  },
  pill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  pillText: {
    color: '#4A3FD9',
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
});
