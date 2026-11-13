import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { BRAND_GRADIENT, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { Colors, Radius } from '@/constants/theme';
import { FONTS } from '@/constants/typography';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  gradient?: readonly [string, string]; // active: a section gradient, the main one by default
  tint?: string; // inactive background: a section tint, lilac by default
  tintText?: string; // inactive text: the text on that tint, ink by default
};

const HEIGHT = 38;

// Filter chip: active = gradient with white 600 text, inactive = light tint with 500 text
export function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
  gradient = BRAND_GRADIENT,
  tint = Colors.current.lilac,
  tintText = Colors.current.text,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, { backgroundColor: tint }, pressed && styles.pressed]}>
      {selected && (
        <LinearGradient colors={gradient} start={GRADIENT_START} end={GRADIENT_END} style={StyleSheet.absoluteFill} />
      )}
      <Text style={[styles.label, selected ? styles.labelSelected : { color: tintText }]} maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
    </Pressable>
  );
}

// A row of chips that wraps onto more lines (never a horizontal scroll)
export function ChipGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: HEIGHT,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: 15,
    fontFamily: FONTS.medium,
  },
  labelSelected: {
    color: '#FFFFFF',
    fontFamily: FONTS.semiBold,
  },
});
