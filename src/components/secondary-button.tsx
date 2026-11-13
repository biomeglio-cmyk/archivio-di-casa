import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/text';
import { type Palette, Radius } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { usePressed } from '@/hooks/use-pressed';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

type Props = {
  label: string;
  symbol?: SFSymbol;
  disabled?: boolean;
  onPress: () => void;
  color?: string; // label (and icon) color; indigo by default
  symbolColor?: string; // icon color, when different from the label
  background?: string; // lilac by default; a section tint, or the soft red of "Cancella"
  selected?: boolean; // toggle buttons ("Nei preferiti")
  singleLine?: boolean; // one line, shrinking a little instead of wrapping (rows of buttons)
  style?: StyleProp<ViewStyle>;
};

const HEIGHT = 48;

// Quiet action: lilac pill (48 high), indigo 16/600 label
export function SecondaryButton({
  label,
  symbol,
  disabled = false,
  onPress,
  color,
  symbolColor,
  background,
  selected,
  singleLine = false,
  style,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { pressed, handlers } = usePressed();
  const ink = color ?? theme.indigo;
  const fill = background ?? theme.lilac;
  return (
    <Pressable
      {...handlers}
      accessibilityRole="button"
      accessibilityState={selected === undefined ? { disabled } : { disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: fill },
        style,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      {symbol && <SymbolView name={symbol} tintColor={symbolColor ?? ink} size={18} />}
      <Text
        style={[styles.label, { color: ink }]}
        numberOfLines={singleLine ? 1 : undefined}
        adjustsFontSizeToFit={singleLine}
        minimumFontScale={0.8}
        maxFontSizeMultiplier={singleLine ? 1.2 : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  button: {
    minHeight: HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    flexShrink: 1,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
  },
});
