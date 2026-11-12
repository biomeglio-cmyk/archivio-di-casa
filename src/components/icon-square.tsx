import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet } from 'react-native';

import { BRAND_GRADIENT, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { iconShadow, Radius } from '@/constants/theme';
import type { CategoryColors } from '@/db/types';
import { categoryShadowRgb } from '@/utils/colors';

type Props = {
  symbol: SFSymbol;
  colors?: CategoryColors; // a category's gradient and icon color; the main gradient by default
  size?: number; // 40–52 in the guide; smaller in dense lists
  shadow?: boolean; // the small colored shadow (off in dense lists)
  radius?: number; // corners: 13 by default (16 for the 52pt squares of Preferiti)
};

// Icon in a small gradient square (135°), corners 12–14
export function IconSquare({ symbol, colors, size = 44, shadow = false, radius: cornerRadius }: Props) {
  const gradient = colors ? ([colors.top, colors.bottom] as const) : BRAND_GRADIENT;
  const radius = cornerRadius ?? (size >= 40 ? Radius.iconSquare : Math.round(size * 0.3));
  return (
    <LinearGradient
      colors={gradient}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={[
        styles.square,
        { width: size, height: size, borderRadius: radius },
        shadow && { boxShadow: iconShadow(colors ? categoryShadowRgb(colors) : '100, 90, 235') },
      ]}>
      <SymbolView name={symbol} tintColor={colors?.text ?? '#FFFFFF'} size={Math.round(size * 0.5)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  square: {
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
});
