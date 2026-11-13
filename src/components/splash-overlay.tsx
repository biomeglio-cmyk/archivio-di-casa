import NativeMaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, type ComponentType, type ReactElement } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useReduceMotion } from '@/a11y/accessibility';
import { Text } from '@/components/text';
import { FONTS } from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

// The opening animation, right after the native splash (same color), on top of Home. 4.5 s:
//   0.00–0.35  the gradient fades in; an aurora of 3 soft color blobs drifts over it the whole time
//   0.75       the hand springs in from the left (overshoot)
//   1.00–1.32  the document falls from above, tilted, and lands in the hand with a bounce;
//              the hand dips on the impact and recovers; small sparkles burst out (~400 ms)
//   1.45–2.15  "Sottomano": letters pop up one by one with a spring; then a shine runs across
//   2.05–2.55  the tagline fades in (and stays still)
//   ~1.9–4.0   hand and document float gently up and down (2–3 pt)
//   4.00–4.50  a slight scale-up and fade onto Home
// Everything runs on the UI thread (Reanimated). A tap anywhere skips to Home. Riduci movimento:
// only fade in, hold, fade out, same length. The app keeps starting underneath (database,
// notifications, Home): nothing waits for this screen.
const TOTAL_MS = 4500;
const EXIT_AT = 4000;
const SKIP_MS = 250;

const HAND_AT = 750;
const DROP_AT = 1000;
const FALL_MS = 320;
const LAND_AT = DROP_AT + FALL_MS;
const LETTER_AT = 1450;
const LETTER_STEP = 50;
const SHINE_AT = 2150;
const TAGLINE_AT = 2050;
const FLOAT_AT = 1900;

const NAME = 'Sottomano'; // i18n-ignore: brand
const LETTERS = NAME.split('');

// The mark drawn in the coordinates of the app icon (1024 × 1024), framed on the hand and document
const VIEW_BOX = { x: 172, y: 196, width: 680, height: 630 };
// Where the document meets the hand (sparkles start there), in the same coordinates
const LANDING = { x: 518, y: 560 };
const SPARKLES = 6;
const SHINE_BAND = 70;

// The package's class types don't match the React 19 types: the same component, typed as a function
const MaskedView = NativeMaskedView as unknown as ComponentType<ViewProps & { maskElement: ReactElement }>;

export function SplashOverlay() {
  const theme = useTheme();
  const { t } = useI18n();
  const reduceMotion = useReduceMotion();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [visible, setVisible] = useState(true);
  const [shown, setShown] = useState(false);
  const [skipped, setSkipped] = useState(false);

  // About 40% of the screen width (a little less on an iPad)
  const mark = Math.round(Math.min(Math.max(screenWidth * 0.4, 140), 260));
  const markHeight = (mark * VIEW_BOX.height) / VIEW_BOX.width;

  const background = useSharedValue(0);
  const content = useSharedValue(reduceMotion ? 0 : 1);
  const handIn = useSharedValue(0);
  const drop = useSharedValue(-1.1); // document offset, in mark heights (0 = in the hand)
  const tilt = useSharedValue(-16); // degrees
  const dip = useSharedValue(0); // impact on the hand: 0 → 1 → 0
  const burst = useSharedValue(0);
  const shine = useSharedValue(0);
  const tagline = useSharedValue(0);
  const float = useSharedValue(0);
  const exit = useSharedValue(0);
  const skip = useSharedValue(0);
  const wordWidth = useSharedValue(0);

  // Everything starts once this screen is drawn and the native splash is gone; Home is never
  // hidden longer than 4.5 s from then
  useEffect(() => {
    if (!shown) return;
    const fade = { duration: 350, easing: Easing.out(Easing.quad) };
    background.set(withTiming(1, fade));
    exit.set(withDelay(EXIT_AT, withTiming(1, { duration: TOTAL_MS - EXIT_AT, easing: Easing.inOut(Easing.quad) })));
    if (reduceMotion) {
      // Fades only: everything already in place
      content.set(withTiming(1, fade));
      handIn.set(1);
      drop.set(0);
      tilt.set(0);
      tagline.set(1);
    } else {
      handIn.set(withDelay(HAND_AT, withSpring(1, { damping: 11, stiffness: 120, mass: 1 })));
      drop.set(
        withDelay(
          DROP_AT,
          withSequence(
            withTiming(0, { duration: FALL_MS, easing: Easing.in(Easing.quad) }), // falls
            withTiming(-0.08, { duration: 130, easing: Easing.out(Easing.quad) }), // bounces up
            withSpring(0, { damping: 9, stiffness: 260 }), // settles in the hand
          ),
        ),
      );
      tilt.set(
        withDelay(
          DROP_AT,
          withSequence(
            withTiming(6, { duration: FALL_MS, easing: Easing.in(Easing.quad) }),
            withSpring(0, { damping: 7, stiffness: 160 }),
          ),
        ),
      );
      dip.set(
        withDelay(
          LAND_AT,
          withSequence(
            withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
            withSpring(0, { damping: 7, stiffness: 200 }),
          ),
        ),
      );
      burst.set(withDelay(LAND_AT, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })));
      shine.set(withDelay(SHINE_AT, withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) })));
      float.set(
        withDelay(FLOAT_AT, withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true)),
      );
      tagline.set(withDelay(TAGLINE_AT, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })));
    }
    const timer = setTimeout(() => setVisible(false), TOTAL_MS);
    return () => clearTimeout(timer);
  }, [shown, reduceMotion, background, content, handIn, drop, tilt, dip, burst, shine, tagline, float, exit]);

  // A tap: a quick fade, then Home
  useEffect(() => {
    if (!skipped) return;
    skip.set(withTiming(1, { duration: SKIP_MS }));
    const timer = setTimeout(() => setVisible(false), SKIP_MS);
    return () => clearTimeout(timer);
  }, [skipped, skip]);

  const wholeStyle = useAnimatedStyle(() => ({
    opacity: (1 - exit.get()) * (1 - skip.get()),
    transform: [{ scale: reduceMotion ? 1 : 1 + 0.06 * exit.get() }],
  }));
  const backgroundStyle = useAnimatedStyle(() => ({ opacity: background.get() }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: content.get() }));
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -2.5 * float.get() }] }));
  const handStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, handIn.get() * 4),
    transform: [
      { translateX: -(screenWidth / 2 + mark) * (1 - handIn.get()) },
      { translateY: mark * 0.035 * dip.get() },
      { scaleY: 1 - 0.07 * dip.get() },
      { scaleX: 1 + 0.03 * dip.get() },
    ],
  }));
  const documentStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, (drop.get() + 1.1) * 3),
    transform: [{ translateY: drop.get() * markHeight + mark * 0.035 * dip.get() }, { rotate: `${tilt.get()}deg` }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.get(),
    transform: [{ translateY: 8 * (1 - tagline.get()) }],
  }));
  const shineStyle = useAnimatedStyle(() => ({
    opacity: shine.get() > 0 && shine.get() < 1 ? 1 : 0,
    transform: [{ translateX: -SHINE_BAND + shine.get() * (wordWidth.get() + SHINE_BAND * 2) }],
  }));

  if (!visible) return null;

  const landing = {
    x: ((LANDING.x - VIEW_BOX.x) / VIEW_BOX.width) * mark,
    y: ((LANDING.y - VIEW_BOX.y) / VIEW_BOX.height) * markHeight,
  };

  return (
    // A few seconds on screen: only a picture for VoiceOver, which starts on Home
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.overlay, wholeStyle]}
      pointerEvents={skipped ? 'none' : 'auto'}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {/* The native splash color underneath: no flash of Home while the gradient fades in */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.gradient[0] }]} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.clip, backgroundStyle]}>
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
        {/* The aurora: soft color blobs that drift and breathe, blending together */}
        {AURORA.map((blob, index) => (
          <Blob
            key={index}
            blob={blob}
            color={theme.isDark ? blob.night : blob.light}
            opacity={theme.isDark ? 0.45 : blob.opacity}
            screenWidth={screenWidth}
            screenHeight={screenHeight}
            still={reduceMotion}
          />
        ))}
      </Animated.View>

      <Pressable style={styles.center} onPress={() => setSkipped(true)}>
        <Animated.View style={[styles.center, contentStyle]}>
          <Animated.View style={[{ width: mark, height: markHeight }, styles.mark, floatStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.shadow, styles.handOrigin, handStyle]}>
              <HandShape width={mark} height={markHeight} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, styles.shadow, documentStyle]}>
              <DocumentShape width={mark} height={markHeight} lineColor={theme.gradient[1]} />
            </Animated.View>
            {!reduceMotion &&
              Array.from({ length: SPARKLES }, (_, index) => (
                <Sparkle key={index} index={index} burst={burst} origin={landing} distance={mark * 0.42} />
              ))}
          </Animated.View>

          <View onLayout={(event) => wordWidth.set(event.nativeEvent.layout.width)}>
            <View style={styles.name}>
              {LETTERS.map((letter, index) => (
                <Letter key={index} letter={letter} index={index} start={shown} reduceMotion={reduceMotion} />
              ))}
            </View>
            {/* The shine: a light band that only shows inside the letters */}
            {!reduceMotion && (
              <MaskedView
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
                maskElement={
                  <View style={styles.name}>
                    {LETTERS.map((letter, index) => (
                      <Text key={index} style={styles.letter} allowFontScaling={false}>
                        {letter}
                      </Text>
                    ))}
                  </View>
                }>
                <Animated.View style={[styles.shine, shineStyle]}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0)', '#FFFFFF', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </MaskedView>
            )}
          </View>

          <Animated.View style={[styles.taglineBox, taglineStyle]}>
            <Text style={styles.tagline} maxFontSizeMultiplier={2}>
              {t('splashOverlay.tagline')}
            </Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// One letter of "Sottomano": pops up with a spring bounce, 50 ms after the previous one
function Letter({
  letter,
  index,
  start,
  reduceMotion,
}: {
  letter: string;
  index: number;
  start: boolean;
  reduceMotion: boolean;
}) {
  const pop = useSharedValue(reduceMotion ? 1 : 0);
  const fade = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (!start || reduceMotion) return;
    const delay = LETTER_AT + index * LETTER_STEP;
    fade.set(withDelay(delay, withTiming(1, { duration: 120 })));
    pop.set(withDelay(delay, withSpring(1, { damping: 7, stiffness: 260, mass: 0.6 })));
  }, [start, reduceMotion, index, pop, fade]);

  const style = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateY: 16 * (1 - pop.get()) }, { scale: 0.3 + 0.7 * pop.get() }],
  }));

  return (
    <Animated.View style={style}>
      <Text style={styles.letter} allowFontScaling={false}>
        {letter}
      </Text>
    </Animated.View>
  );
}

// A small white four-point star flying out from where the document lands, then gone
function Sparkle({
  index,
  burst,
  origin,
  distance,
}: {
  index: number;
  burst: SharedValue<number>;
  origin: { x: number; y: number };
  distance: number;
}) {
  const angle = ((index * 360) / SPARKLES - 90 + (index % 2 ? 12 : -12)) * (Math.PI / 180);
  const reach = distance * (index % 2 ? 0.8 : 1);
  const size = index % 2 ? 9 : 12;
  const style = useAnimatedStyle(() => {
    const p = burst.get();
    return {
      opacity: p <= 0 || p >= 1 ? 0 : Math.min(1, p * 6) * (1 - p),
      transform: [
        { translateX: Math.cos(angle) * reach * p },
        { translateY: Math.sin(angle) * reach * p },
        { scale: 0.4 + 0.8 * Math.sin(p * Math.PI) },
        { rotate: `${p * 90}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.sparkle,
        { left: origin.x - size / 2, top: origin.y - size / 2, width: size, height: size },
        style,
      ]}>
      <Svg width={size} height={size} viewBox="0 0 10 10">
        <Path fill="#FFFFFF" d="M5 0 Q5.6 4.4 10 5 Q5.6 5.6 5 10 Q4.4 5.6 0 5 Q4.4 4.4 5 0 Z" />
      </Svg>
    </Animated.View>
  );
}

// The aurora blobs: where they sit (share of the screen), their size (share of the width), how far
// they drift (pt), their loop (ms per leg, ease-in-out, back and forth) and where in the loop they
// start, so the background is already moving on the first frame
type AuroraBlob = {
  light: string;
  night: string;
  opacity: number;
  x: number;
  y: number;
  size: number;
  drift: { x: number; y: number };
  legMs: number;
  phase: number;
};

const AURORA: AuroraBlob[] = [
  {
    light: '#F79BBA',
    night: '#D03C74',
    opacity: 0.7,
    x: 0.12,
    y: 0.2,
    size: 1.15,
    drift: { x: 55, y: 40 },
    legMs: 5600,
    phase: 0.3,
  },
  {
    light: '#6FA8FF',
    night: '#3470E5',
    opacity: 0.65,
    x: 0.9,
    y: 0.48,
    size: 1.2,
    drift: { x: -45, y: 55 },
    legMs: 6400,
    phase: 0.65,
  },
  {
    light: '#B39BFF',
    night: '#725FEE',
    opacity: 0.75,
    x: 0.3,
    y: 0.86,
    size: 1.25,
    drift: { x: 60, y: -40 },
    legMs: 7000,
    phase: 0.1,
  },
];

// One blob: a circle filled with a radial gradient that fades to transparent (react-native-svg,
// drawn once); only its position and scale change, on the UI thread. A sine of a steady clock
// gives the ease-in-out back and forth, with no jump when the loop restarts.
function Blob({
  blob,
  color,
  opacity,
  screenWidth,
  screenHeight,
  still,
}: {
  blob: AuroraBlob;
  color: string;
  opacity: number;
  screenWidth: number;
  screenHeight: number;
  still: boolean;
}) {
  const clock = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    clock.set(withRepeat(withTiming(1, { duration: blob.legMs * 2, easing: Easing.linear }), -1, false));
  }, [still, blob.legMs, clock]);

  const size = screenWidth * blob.size;
  const style = useAnimatedStyle(() => {
    const turn = 2 * Math.PI * (clock.get() + blob.phase);
    const move = Math.sin(turn); // -1 … 1
    const breathe = Math.sin(turn * 0.8 + 1.3); // its own rhythm for the size
    return {
      transform: [
        { translateX: blob.drift.x * move },
        { translateY: blob.drift.y * move },
        { scale: 1.05 + 0.15 * breathe }, // 0.9 … 1.2
      ],
    };
  });
  const id = `blob-${blob.light.slice(1)}`;

  return (
    <Animated.View
      style={[
        styles.blob,
        {
          left: screenWidth * blob.x - size / 2,
          top: screenHeight * blob.y - size / 2,
          width: size,
          height: size,
          opacity,
        },
        style,
      ]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="0.45" stopColor={color} stopOpacity={0.6} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

const viewBox = `${VIEW_BOX.x} ${VIEW_BOX.y} ${VIEW_BOX.width} ${VIEW_BOX.height}`;

// The open hand of the logo (white)
function HandShape({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox={viewBox}>
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
function DocumentShape({ width, height, lineColor }: { width: number; height: number; lineColor: string }) {
  return (
    <Svg width={width} height={height} viewBox={viewBox}>
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
  clip: {
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
  },
  center: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  mark: {
    marginBottom: 28,
  },
  // A soft shadow that follows the white shapes (iOS draws it from the drawing itself)
  shadow: {
    shadowColor: '#1A1050',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  // The hand squashes from its bottom edge
  handOrigin: {
    transformOrigin: 'bottom',
  },
  sparkle: {
    position: 'absolute',
  },
  name: {
    flexDirection: 'row',
  },
  letter: {
    // A touch below pure white, so the shine shows as a brighter streak
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 40,
    lineHeight: 50,
    fontFamily: FONTS.wordmark,
  },
  shine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SHINE_BAND,
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
