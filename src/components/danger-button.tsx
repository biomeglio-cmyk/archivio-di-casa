import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';

import { DANGER_COLOR as DANGER, FONTS } from '@/constants/brand';

type Props = {
  label: string;
  disabled?: boolean;
  onPress: () => void;
};

// Destructive action ("Elimina …"): red text on a light red background
export function DangerButton({ label, disabled = false, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}>
      <SymbolView name="trash" tintColor={DANGER} size={17} />
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
    backgroundColor: `${DANGER}1A`,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    color: DANGER,
    fontSize: 17,
    fontFamily: FONTS.titleSemiBold,
  },
});
