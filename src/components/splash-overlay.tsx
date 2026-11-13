import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { G, Path, Rect } from 'react-native-svg';

import { useReduceMotion } from '@/a11y/accessibility';
import { Text } from '@/components/text';
import { FONTS } from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

// The opening animation, right after the native splash (same color), on top of Home:
//   0.00–0.35 s  the gradient fades in
//   0.30–0.90 s  the logo square grows from 0.6 to 1 with a little spring
//   0.75–1.20 s  the hand slides in from the left
//   1.00–1.55 s  the document drops into the hand, with a small bounce
//   1.45–2.05 s  "Sottomano" letter by letter (fade and rise, 50 ms apart)
//   2.05–2.55 s  the tagline fades in
//   4.00–4.50 s  everything fades out (and grows a little) onto Home
// One clock (milliseconds) drives every step on the UI thread. A tap anywhere skips to Home.
// Riduci movimento: only fade in, hold, fade out, same length. The app keeps starting underneath
// (database, notifications, Home): nothing waits for this screen.
const TOTAL_MS = 4500;
const EXIT_AT = 4000;
const SKIP_MS = 250;

const NAME = 'Sottomano'; // i18n-ignore: brand
const LETTERS = NAME.split('');
const LETTER_AT = 1450;
const LETTER_STEP = 50;
const LETTER_MS = 200;

const TILE = 132;
const MARK = TILE * 0.68;
// The mark drawn in the coordinates of the app icon (1024 × 1024), framed on the hand and document
const VIEW_BOX = '172 196 680 630';
const MARK_HEIGHT = (MARK * 630) / 680;

// 0 → 1 between start and end (ms), clamped, with an easing
function progress(time: number, start: number, end: number, ease: (p: number) => number = (p) => p): number {
  'worklet';
  const p = Math.min(1, Math.max(0, (time - start) / (end - start)));
  return ease(p);
}

const springy = Easing.out(Easing.back(1.8)); // overshoots a little, then settles
const bouncy = Easing.out(Easing.back(1.5));
const smooth = Easing.out(Easing.cubic);

export function SplashOverlay() {
  const theme = useTheme();
  const { t } = useI18n();
  const reduceMotion = useReduceMotion();
  const [visible, setVisible] = useState(true);
  const [shown, setShown] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const time = useSharedValue(0);
  const skip = useSharedValue(0);

  // The clock starts once this screen is drawn and the native splash is gone; Home is never
  // hidden longer than 4.5 s from then
  useEffect(() => {
    if (!shown) return;
    time.set(withTiming(TOTAL_MS, { duration: TOTAL_MS, easing: Easing.linear }));
    const timer = setTimeout(() => setVisible(false), TOTAL_MS);
    return () => clearTimeout(timer);
  }, [shown, time]);

  // A tap: a quick fade, then Home
  useEffect(() => {
    if (!skipped) return;
    skip.set(withTiming(1, { duration: SKIP_MS }));
    const timer = setTimeout(() => setVisible(false), SKIP_MS);
    return () => clearTimeout(timer);
  }, [skipped, skip]);

  const whole = useAnimatedStyle(() => {
    const out = progress(time.get(), EXIT_AT, TOTAL_MS, Easing.inOut(Easing.quad));
    const scale = reduceMotion ? 1 : 1 + 0.06 * out;
    return { opacity: (1 - out) * (1 - skip.get()), transform: [{ scale }] };
  });
  const background = useAnimatedStyle(() => ({
    opacity: progress(time.get(), 0, 350),
  }));
  // Riduci movimento: the content fades in with the background and doesn't move
  const content = useAnimatedStyle(() => ({
    opacity: reduceMotion ? progress(time.get(), 0, 350) : 1,
  }));
  const tile = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 1, transform: [{ scale: 1 }] };
    return {
      opacity: progress(time.get(), 300, 500),
      transform: [{ scale: 0.6 + 0.4 * progress(time.get(), 300, 900, springy) }],
    };
  });
  const hand = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 1, transform: [{ translateX: 0 }] };
    return {
      opacity: progress(time.get(), 750, 950),
      transform: [
        {
          translateX: -MARK * 0.7 * (1 - progress(time.get(), 750, 1200, smooth)),
        },
      ],
    };
  });
  const documentStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 1, transform: [{ translateY: 0 }] };
    return {
      opacity: progress(time.get(), 1000, 1150),
      transform: [
        {
          translateY: -MARK * 0.55 * (1 - progress(time.get(), 1000, 1550, bouncy)),
        },
      ],
    };
  });
  const tagline = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 1, transform: [{ translateY: 0 }] };
    const p = progress(time.get(), 2050, 2550, smooth);
    return { opacity: p, transform: [{ translateY: 8 * (1 - p) }] };
  });

  if (!visible) return null;

  return (
    // A few seconds on screen: only a picture for VoiceOver, which starts on Home
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.overlay, whole]}
      pointerEvents={skipped ? 'none' : 'auto'}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {/* The native splash color underneath: no flash of Home while the gradient fades in */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.gradient[0] }]} />
      <Animated.View style={[StyleSheet.absoluteFill, background]}>
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          onLayout={() => {
            // Hide the native splash only when this screen is ready: no flash
            SplashScreen.hideAsync().finally(() => setShown(true));
          }}
        />
      </Animated.View>
      <Pressable style={styles.center} onPress={() => setSkipped(true)}>
        <Animated.View style={[styles.center, content]}>
          <Animated.View style={[styles.tile, tile]}>
            {/* The hand and the document enter from inside the square */}
            <View style={styles.clip}>
              <View style={styles.mark}>
                <Animated.View style={[StyleSheet.absoluteFill, hand]}>
                  <HandShape />
                </Animated.View>
                <Animated.View style={[StyleSheet.absoluteFill, documentStyle]}>
                  <DocumentShape lineColor={theme.gradient[1]} />
                </Animated.View>
              </View>
            </View>
          </Animated.View>
          <View style={styles.name}>
            {LETTERS.map((letter, index) => (
              <Letter key={index} letter={letter} index={index} time={time} reduceMotion={reduceMotion} />
            ))}
          </View>
          <Animated.View style={[styles.taglineBox, tagline]}>
            <Text style={styles.tagline} maxFontSizeMultiplier={2}>
              {t('splashOverlay.tagline')}
            </Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function Letter({
  letter,
  index,
  time,
  reduceMotion,
}: {
  letter: string;
  index: number;
  time: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const style = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 1, transform: [{ translateY: 0 }] };
    const start = LETTER_AT + index * LETTER_STEP;
    const p = progress(time.get(), start, start + LETTER_MS, smooth);
    return { opacity: p, transform: [{ translateY: 12 * (1 - p) }] };
  });
  return (
    <Animated.View style={style}>
      <Text style={styles.letter} allowFontScaling={false}>
        {letter}
      </Text>
    </Animated.View>
  );
}

// The open hand of the logo (white)
function HandShape() {
  return (
    <Svg width={MARK} height={MARK_HEIGHT} viewBox={VIEW_BOX}>
      <Path
        fill="#FFFFFF"
        d="M212 670 L262 670 C300 636 336 597 392 597 L586 597 A35 35 0 0 1 586 667 L506 667 A19 19 0 0 0 506 705
           L630 705 L776 604 A38 38 0 0 1 822 666 L684 776 C656 800 626 815 590 815 L212 815
           A30 30 0 0 1 182 785 L182 700 A30 30 0 0 1 212 670 Z"
      />
    </Svg>
  );
}

// The document of the logo (white, folded corner, two lines), a little tilted
function DocumentShape({ lineColor }: { lineColor: string }) {
  return (
    <Svg width={MARK} height={MARK_HEIGHT} viewBox={VIEW_BOX}>
      <G rotation={-5} origin="518, 370">
        <Path
          fill="#FFFFFF"
          d="M428 220 L578 220 L638 280 L638 490 Q638 520 608 520 L428 520 Q398 520 398 490 L398 250 Q398 220 428 220 Z"
        />
        <Path fill="#FFFFFF" fillOpacity={0.55} d="M578 220 L578 262 Q578 280 596 280 L638 280 Z" />
        <Rect x={446} y={334} width={146} height={22} rx={11} fill={lineColor} fillOpacity={0.55} />
        <Rect x={446} y={390} width={112} height={22} rx={11} fill={lineColor} fillOpacity={0.55} />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 1000,
  },
  center: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 34,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    boxShadow: '0 14px 30px rgba(20, 16, 80, 0.28)',
    marginBottom: 24,
  },
  clip: {
    ...StyleSheet.absoluteFill,
    borderRadius: 33,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: MARK,
    height: MARK_HEIGHT,
  },
  name: {
    flexDirection: 'row',
  },
  letter: {
    color: '#FFFFFF',
    fontSize: 40,
    lineHeight: 50,
    fontFamily: FONTS.wordmark,
  },
  taglineBox: {
    marginTop: 8,
    maxWidth: 340,
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: FONTS.medium,
  },
});
