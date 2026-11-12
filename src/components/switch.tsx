import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { BRAND_GRADIENT, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { Colors } from '@/constants/theme';

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string; // the label of its row, read by VoiceOver
  gradient?: readonly [string, string]; // when on: a section gradient, the main one by default
};

const WIDTH = 52;
const HEIGHT = 32;
const KNOB = 26;
const TRAVEL = WIDTH - KNOB - (HEIGHT - KNOB); // knob from the left inset to the right inset

// Switch of the guide (52 × 32, knob 26): main gradient when on, #D6D8E4 when off
export function Switch({ value, onValueChange, disabled = false, accessibilityLabel, gradient = BRAND_GRADIENT }: Props) {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.set(withTiming(value ? 1 : 0, { duration: 180 }));
  }, [value, progress]);

  const onLayer = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: progress.get() * TRAVEL }] }));

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      style={[styles.track, disabled && styles.disabled]}>
      <Animated.View style={[StyleSheet.absoluteFill, onLayer]}>
        <LinearGradient
          colors={gradient}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.knob, knob]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: WIDTH,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    overflow: 'hidden',
    backgroundColor: Colors.light.switchOff,
    justifyContent: 'center',
    paddingHorizontal: (HEIGHT - KNOB) / 2,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 4px rgba(28, 30, 70, 0.2)',
  },
  disabled: {
    opacity: 0.5,
  },
});
