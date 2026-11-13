import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';
import { usePressed } from '@/hooks/use-pressed';

type Props = {
  symbol: SFSymbol;
  accessibilityLabel: string;
  onPress: () => void;
  background?: string; // lilac by default, or the tint of the section
  color?: string; // indigo by default, or the text on that tint
};

// Round 44 × 44 button at the top of a page: back, search, "…", share, menu
export function RoundIconButton({
  symbol,
  accessibilityLabel,
  onPress,
  background = Colors.current.lilac,
  color = Colors.current.indigo,
}: Props) {
  const { pressed, handlers } = usePressed();
  return (
    <Pressable
      {...handlers}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.button, { backgroundColor: background }, pressed && styles.pressed]}>
      <SymbolView name={symbol} tintColor={color} size={20} weight="semibold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
