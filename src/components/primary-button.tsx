import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';

import { useIconRow } from '@/components/icon-row';
import { Text } from '@/components/text';
import { NoBreakText } from '@/components/tile-title';
import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { type Palette, Radius } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { usePressed } from '@/hooks/use-pressed';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { readableGradient } from '@/utils/colors';

type Props = {
  label: string;
  symbol?: SFSymbol;
  disabled?: boolean;
  onPress: () => void;
  gradient?: readonly [string, string]; // a section gradient; the main gradient by default
  shadow?: string; // its boxShadow; the main gradient shadow by default
  singleLine?: boolean; // one line, shrinking a little instead of wrapping (rows of buttons); wraps with larger text
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string; // when the visible label alone is not enough
  accessibilityHint?: string;
};

const HEIGHT = 56;

// Main action: full-width pill (56 high) in the 135° gradient, white 16/600 label
export function PrimaryButton({
  label,
  symbol,
  disabled = false,
  onPress,
  gradient: gradientProp,
  shadow: shadowProp,
  singleLine = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const theme = useTheme();
  // The main gradient and its glow of the active theme (Tema notte: brighter, glow 45 %)
  const gradient = gradientProp ?? theme.gradient;
  const shadow = shadowProp ?? theme.brandShadow;
  const { pressed, handlers } = usePressed();
  // Larger text: the icon above the label, both centered (full-width buttons, as in the design)
  const iconRow = useIconRow();
  const { fontScale } = useWindowDimensions();
  const oneLine = singleLine && fontScale <= 1.3; // larger text: the label wraps, never cut or tiny
  return (
    <Pressable
      {...handlers}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        !disabled && { boxShadow: shadow },
        style,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <LinearGradient colors={readableGradient(gradient)} start={GRADIENT_START} end={GRADIENT_END} style={[styles.fill, iconRow.rowCentered]}>
        {symbol && <SymbolView name={symbol} tintColor="#FFFFFF" size={18} />}
        {oneLine ? (
          <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} maxFontSizeMultiplier={1.3}>
            {label}
          </Text>
        ) : (
          // Wraps between words only: a long word (German, Finnish…) shrinks instead of breaking
          <NoBreakText style={styles.label} containerStyle={[styles.labelBox, iconRow.texts]}>
            {label}
          </NoBreakText>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  button: {
    minHeight: HEIGHT,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  fill: {
    flexGrow: 1,
    minHeight: HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
  labelBox: {
    flexShrink: 1,
  },
  label: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
  },
});
