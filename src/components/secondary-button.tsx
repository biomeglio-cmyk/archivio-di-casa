import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';

import { useIconRow } from '@/components/icon-row';
import { Text } from '@/components/text';
import { NoBreakText } from '@/components/tile-title';
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
  singleLine?: boolean; // one line, shrinking a little instead of wrapping (rows of buttons); wraps with larger text
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string; // when the visible label alone is not enough
  accessibilityHint?: string;
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
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { pressed, handlers } = usePressed();
  // Larger text: the icon above the label, both centered (full-width buttons, as in the design)
  const iconRow = useIconRow();
  const { fontScale } = useWindowDimensions();
  const oneLine = singleLine && fontScale <= 1.3; // larger text: the label wraps, never cut or tiny
  const ink = color ?? theme.indigo;
  const fill = background ?? theme.lilac;
  return (
    <Pressable
      {...handlers}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={selected === undefined ? { disabled } : { disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        iconRow.rowCentered,
        { backgroundColor: fill },
        style,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      {symbol && <SymbolView name={symbol} tintColor={symbolColor ?? ink} size={18} />}
      {oneLine ? (
        <Text
          style={[styles.label, { color: ink }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
      ) : (
        // Wraps between words only: a long word (German, Finnish…) shrinks instead of breaking
        <NoBreakText style={[styles.label, { color: ink }]} containerStyle={[styles.labelBox, iconRow.texts]}>
          {label}
        </NoBreakText>
      )}
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
  labelBox: {
    flexShrink: 1,
  },
  label: {
    flexShrink: 1,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
  },
});
