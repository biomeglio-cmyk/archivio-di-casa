import { router } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/logo-mark';
import { RoundIconButton } from '@/components/round-icon-button';
import { Text } from '@/components/text';
import { BRAND_COLOR } from '@/constants/brand';
import type { MenuSection } from '@/constants/navigation';
import { Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';

export type TabHeaderAction =
  | { label: string; onPress: () => void } // text button ("Mese", "Modifica")
  | { symbol: SFSymbol; accessibilityLabel: string; onPress: () => void }; // icon button ("+")

type Props = {
  section: MenuSection; // highlighted in the menu
  title: string; // "Sottomano" on Home, the tab name elsewhere
  action?: TabHeaderAction; // the page action, just left of the menu button
};

// The ONE header of the four tabs (Home, Scadenze, Preferiti, Famiglia): logo, title in the
// Onest Bold wordmark, the page action and the round Menu button on the right.
// Fixed at the top (the tabs hide the navigation bar), same paddings everywhere.
// Inner screens (category, person, document) keep the standard iOS header with "back".
export function TabHeader({ section, title, action }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <LogoMark size={28} radius={7} />
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
        {title}
      </Text>
      <View style={styles.actions}>
        {action &&
          ('label' in action ? (
            <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button" style={styles.action}>
              <Text style={styles.actionLabel} maxFontSizeMultiplier={1.6}>
                {action.label}
              </Text>
            </Pressable>
          ) : (
            <RoundIconButton symbol={action.symbol} accessibilityLabel={action.accessibilityLabel} onPress={action.onPress} />
          ))}
        <RoundIconButton symbol="circle.grid.3x3.fill" accessibilityLabel="Menu" onPress={() => router.push({ pathname: '/menu', params: { current: section } })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.side,
    paddingBottom: 8,
  },
  title: {
    flexShrink: 1,
    fontSize: 28,
    lineHeight: 36,
    fontFamily: FONTS.wordmark,
  },
  actions: {
    marginLeft: 'auto', // pushed to the right edge
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  actionLabel: {
    color: BRAND_COLOR,
    fontSize: 17,
  },
});
