import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR, DANGER_COLOR } from '@/constants/brand';
import { usePressed } from '@/hooks/use-pressed';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  symbol: SFSymbol;
  label: string;
  onPress: () => void;
  destructive?: boolean; // red icon and text, no chevron (e.g. "Cancella")
  grouped?: boolean; // inside a rounded group: the group draws the corners and the background
};

// One tappable row: icon | full label (never truncated) | chevron.
// Used in bottom sheets and, grouped, for the actions at the end of the detail screens.
export function SheetOption({ symbol, label, onPress, destructive = false, grouped = false }: Props) {
  const theme = useTheme();
  const { pressed, handlers } = usePressed();
  const color = destructive ? DANGER_COLOR : BRAND_COLOR;
  const background = pressed ? theme.backgroundSelected : grouped ? 'transparent' : theme.surface;

  return (
    <Pressable
      {...handlers}
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.row, !grouped && styles.rounded, { backgroundColor: background }]}>
      <View style={styles.icon}>
        <SymbolView name={symbol} tintColor={color} size={22} />
      </View>
      <ThemedText style={[styles.label, destructive && { color: DANGER_COLOR }]}>{label}</ThemedText>
      {!destructive && <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={14} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rounded: {
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  icon: {
    width: 28,
    alignItems: 'center',
  },
  label: {
    flex: 1, // takes the free width and wraps instead of being cut
  },
});
