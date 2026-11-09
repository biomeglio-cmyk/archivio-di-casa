import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  symbol: SFSymbol;
  label: string; // read by VoiceOver
  onPress: () => void;
};

// Small grey SF Symbol button inside a list row, with a 44×44 pt touch area (Apple's minimum)
export function RowIconButton({ symbol, label, onPress }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <SymbolView name={symbol} tintColor={theme.textSecondary} size={17} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.4,
  },
});
