import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { Text } from '@/components/text';
import { BRAND_GRADIENT } from '@/constants/brand';
import { FONTS } from '@/constants/typography';
import { type Palette } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

const HOLD_MS = 700; // logo on screen…
const FADE_MS = 300; // …then a fade into the app: about one second in total

const GLYPH_ASPECT = 712 / 657; // logo-glyph.png is 712 × 657 px

// In-app opening screen, shown right after the native splash: logo gradient, white hand with
// document, "sottomano" and the tagline. It fades out on top of the first screen (Home).
export function SplashOverlay() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);
  const [shown, setShown] = useState(false);

  // Starts counting once our overlay is on screen (and the native splash is gone)
  useEffect(() => {
    if (!shown) return;
    const timer = setTimeout(() => setVisible(false), HOLD_MS);
    return () => clearTimeout(timer);
  }, [shown]);

  if (!visible) return null;

  return (
    // Under one second on screen: only a picture for VoiceOver, which starts on the first screen
    <Animated.View
      exiting={FadeOut.duration(FADE_MS)}
      style={[StyleSheet.absoluteFill, styles.overlay]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <LinearGradient
        colors={BRAND_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
        onLayout={() => {
          // Hide the native splash (same color and logo) only when this screen is ready: no flash
          SplashScreen.hideAsync().finally(() => setShown(true));
        }}>
        <Image source={require('@/assets/images/logo-glyph.png')} style={styles.glyph} contentFit="contain" />
        {/* i18n-ignore: brand */}
        <Text style={styles.name} allowFontScaling={false}>Sottomano</Text>
        <Text style={styles.tagline} maxFontSizeMultiplier={2}>
          {t('splashOverlay.tagline')}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  overlay: {
    zIndex: 1000,
  },
  background: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  glyph: {
    width: 120,
    height: 120 / GLYPH_ASPECT,
    marginBottom: 20,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 40,
    lineHeight: 50,
    fontFamily: FONTS.wordmark,
  },
  tagline: {
    marginTop: 6,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    textAlign: 'center',
    fontFamily: FONTS.medium,
  },
});
