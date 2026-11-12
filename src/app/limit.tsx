import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/logo-mark';
import { PrimaryButton } from '@/components/primary-button';
import { Text } from '@/components/text';
import { Colors } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { FREE_LIMIT, UNLOCK_PRICE } from '@/settings/free-limit';

const STILL_WORKS = ['Consultare i tuoi documenti', 'Inviarli e condividerli', 'Mostrare le tessere alla cassa', 'Ricevere i promemoria'];

// The limit panel (docs/design/ProvaFinita.dc.html), a sheet over the screen that tried to add:
// the logo, "Hai usato i 7 spazi gratuiti", what keeps working (ticks) and what doesn't (lock),
// "Sblocca senza limiti a 0,99 €" and "Più tardi". Tap outside to close.
export default function LimitPanel() {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View entering={FadeIn.duration(160)} style={styles.dim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Più tardi" />
      <Animated.View
        entering={SlideInDown.duration(240)}
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 14 }]}
        accessibilityViewIsModal>
        <View style={styles.grabber} />
        <View style={styles.logo}>
          <LogoMark size={60} radius={14} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {`Hai usato i ${FREE_LIMIT} spazi gratuiti`}
        </Text>
        <Text style={styles.text}>
          Tutto quello che hai salvato resta qui e funziona come sempre. Per aggiungere altri documenti e tessere, sblocca
          Sottomano.
        </Text>
        <View style={styles.list}>
          {STILL_WORKS.map((item) => (
            <View key={item} style={styles.item}>
              <View style={[styles.mark, styles.markOn]}>
                <SymbolView name="checkmark" tintColor="#1F7A5A" size={13} weight="bold" />
              </View>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
          <View style={styles.item}>
            <View style={[styles.mark, styles.markOff]}>
              <SymbolView name="lock.fill" tintColor="#6A6D80" size={12} />
            </View>
            <Text style={[styles.itemText, styles.itemOff]}>Aggiungere altri documenti o tessere</Text>
          </View>
        </View>
        <PrimaryButton
          label={`Sblocca senza limiti a ${UNLOCK_PRICE}`}
          onPress={() => router.replace('/unlock')}
          style={styles.unlock}
        />
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.later}>
          <Text style={styles.laterText}>Più tardi</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#FFFFFF',
    boxShadow: '0 -10px 30px rgba(28, 30, 70, 0.15)',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.light.switchOff,
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
    color: Colors.light.text,
    textAlign: 'center',
  },
  text: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  list: {
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    backgroundColor: Colors.light.paleLilac,
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
    backgroundColor: '#E6F7F0',
  },
  markOff: {
    backgroundColor: '#F0F1F5',
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: Colors.light.text,
  },
  itemOff: {
    color: Colors.light.textSecondary,
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
    color: Colors.light.accent,
  },
});
