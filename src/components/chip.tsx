import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useIconRow } from '@/components/icon-row';
import { NoBreakText } from '@/components/tile-title';
import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { type Palette, Radius } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { readableGradient } from '@/utils/colors';

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
  gradient: gradientProp,
  tint,
  tintText,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const gradient = gradientProp ?? theme.gradient;
  const fill = tint ?? theme.lilac; // inactive background: a section tint, lilac by default
  const ink = tintText ?? theme.text;
  // Larger text: the check above the label, both centered in the pill
  const iconRow = useIconRow();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, { backgroundColor: fill }, pressed && styles.pressed]}>
      {selected && (
        <LinearGradient colors={readableGradient(gradient)} start={GRADIENT_START} end={GRADIENT_END} style={StyleSheet.absoluteFill} />
      )}
      {/* Not only the fill: the active chip also has a checkmark (Differenzia senza colore) */}
      <View style={[styles.content, iconRow.rowCentered]}>
        {selected && <SymbolView name="checkmark" tintColor="#FFFFFF" size={12} weight="bold" />}
        <NoBreakText style={[styles.label, selected ? styles.labelSelected : { color: ink }]} containerStyle={[styles.labelBox, iconRow.texts]}>
          {label}
        </NoBreakText>
      </View>
    </Pressable>
  );
}

// A row of chips that wraps onto more lines (never a horizontal scroll)
export function ChipGroup({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.group}>{children}</View>;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
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
  content: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  labelBox: {
    flexShrink: 1,
  },
  label: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: FONTS.medium,
  },
  labelSelected: {
    color: '#FFFFFF',
    fontFamily: FONTS.semiBold,
  },
});
