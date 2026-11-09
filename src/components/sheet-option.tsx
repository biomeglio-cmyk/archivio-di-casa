import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/brand';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  symbol: SFSymbol;
  label: string;
  onPress: () => void;
};

// One tappable row inside a bottom sheet: icon + label
export function SheetOption({ symbol, label, onPress }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
      ]}>
      <View style={styles.icon}>
        <SymbolView name={symbol} tintColor={BRAND_COLOR} size={24} />
      </View>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={14} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  icon: {
    width: 28,
    alignItems: 'center',
  },
  label: {
    flex: 1,
  },
});
