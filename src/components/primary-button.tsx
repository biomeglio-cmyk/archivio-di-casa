import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/text';
import { NoBreakText } from '@/components/tile-title';
import { BRAND_GRADIENT, BRAND_SHADOW, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { type Palette, Radius } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { usePressed } from '@/hooks/use-pressed';
import { useThemedStyles } from '@/hooks/use-theme';

type Props = {
  label: string;
  symbol?: SFSymbol;
  disabled?: boolean;
  onPress: () => void;
  gradient?: readonly [string, string]; // a section gradient; the main gradient by default
  shadow?: string; // its boxShadow; the main gradient shadow by default
  singleLine?: boolean; // one line, shrinking a little instead of wrapping (rows of buttons)
  style?: StyleProp<ViewStyle>;
};

const HEIGHT = 56;

// Main action: full-width pill (56 high) in the 135° gradient, white 16/600 label
export function PrimaryButton({
  label,
  symbol,
  disabled = false,
  onPress,
  gradient = BRAND_GRADIENT,
  shadow = BRAND_SHADOW,
  singleLine = false,
  style,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const { pressed, handlers } = usePressed();
  return (
    <Pressable
      {...handlers}
      accessibilityRole="button"
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
      <LinearGradient colors={gradient} start={GRADIENT_START} end={GRADIENT_END} style={styles.fill}>
        {symbol && <SymbolView name={symbol} tintColor="#FFFFFF" size={18} />}
        {singleLine ? (
          <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.2}>
            {label}
          </Text>
        ) : (
          // Wraps between words only: a long word (German, Finnish…) shrinks instead of breaking
          <NoBreakText style={styles.label} containerStyle={styles.labelBox}>
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
