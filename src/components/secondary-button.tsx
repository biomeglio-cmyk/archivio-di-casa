import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/text';
import { BRAND_COLOR } from '@/constants/brand';
import { FONTS } from '@/constants/typography';

type Props = {
  label: string;
  symbol?: SFSymbol;
  disabled?: boolean;
  onPress: () => void;
};

// Clearly visible but secondary to the gradient button: brand-tinted background, brand text
export function SecondaryButton({ label, symbol, disabled = false, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}>
      {symbol && <SymbolView name={symbol} tintColor={BRAND_COLOR} size={18} />}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: `${BRAND_COLOR}1F`, // brand color at ~12% opacity
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    color: BRAND_COLOR,
    fontSize: 17,
    fontFamily: FONTS.semiBold,
  },
});
