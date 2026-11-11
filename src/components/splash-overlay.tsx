import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { BRAND_GRADIENT, FONTS } from '@/constants/brand';

const HOLD_MS = 700; // logo on screen…
const FADE_MS = 300; // …then a fade into the app: about one second in total

const GLYPH_ASPECT = 712 / 657; // logo-glyph.png is 712 × 657 px

// In-app opening screen, shown right after the native splash: logo gradient, white hand with
// document, "sottomano" and the tagline. It fades out on top of the first screen (Home).
export function SplashOverlay() {
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
    <Animated.View exiting={FadeOut.duration(FADE_MS)} style={[StyleSheet.absoluteFill, styles.overlay]}>
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
        <Text style={styles.name}>sottomano</Text>
        <Text style={styles.tagline}>I documenti di casa, pronti da inviare</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: FONTS.titleBold,
  },
  tagline: {
    marginTop: 6,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    textAlign: 'center',
    fontFamily: FONTS.titleMedium,
  },
});
