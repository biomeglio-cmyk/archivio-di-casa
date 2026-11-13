import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { type Palette } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const GLYPH_ASPECT = 712 / 657; // logo-glyph.png is 712 × 657 px
const GLYPH_SHARE = 0.64; // the hand with the document fills about 64% of the icon width

// The app logo drawn in the app: white hand with document on the main gradient. Decorative: hidden
// from VoiceOver (the app name is always written next to it).
// (The app icon file, assets/images/logo-icon.png, is still the old one: the final logo is
// one of the open choices of docs/design-guide.md.)
export function LogoMark({ size, radius = size * 0.25 }: { size: number; radius?: number }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const glyph = size * GLYPH_SHARE;
  return (
    <LinearGradient
      colors={theme.gradient}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={[styles.mark, { width: size, height: size, borderRadius: radius }]}
      accessibilityIgnoresInvertColors
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Image
        source={require('@/assets/images/logo-glyph.png')}
        style={{ width: glyph, height: glyph / GLYPH_ASPECT }}
        contentFit="contain"
      />
    </LinearGradient>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
});
