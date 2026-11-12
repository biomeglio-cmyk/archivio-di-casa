import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { RoundIconButton } from '@/components/round-icon-button';
import { Text } from '@/components/text';
import { Colors } from '@/constants/theme';
import { FONTS } from '@/constants/typography';

type Props = {
  title: string; // "Scadenze", "Preferiti", "Tessere", "Famiglia"
  subtitle?: string; // "4 cose da fare nei prossimi mesi"
  right?: ReactNode; // round buttons on the right ("+", search)
  tint?: string; // background of the round buttons: lilac, or the tint of the section (Tessere)
  onBack?: () => void; // back by default; the tab roots go to Home
};

// Top of the section pages of the design (Scadenze, Preferiti, Tessere, Famiglia): a round back
// button on the left, actions on the right, then the 30/700 title and a 15 grey subtitle
export function PageHeader({ title, subtitle, right, tint = Colors.light.lilac, onBack }: Props) {
  return (
    <View>
      <View style={styles.bar}>
        <RoundIconButton
          symbol="chevron.left"
          accessibilityLabel="Indietro"
          background={tint}
          color={Colors.light.text}
          onPress={onBack ?? (() => router.back())}
        />
        <View style={styles.right}>{right}</View>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// The tab roots have no page behind them: "back" shows Home
export function goHome() {
  router.navigate('/');
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    marginTop: 22,
    fontSize: 30,
    lineHeight: 37,
    fontFamily: FONTS.bold,
    color: Colors.light.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
  },
});
