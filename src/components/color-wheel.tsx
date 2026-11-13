import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { wheelHex } from '@/utils/password-tools';

const SIZE = 200;
const R = SIZE / 2;
const SLICES = 72; // 5° each: smooth enough for a finger

type Props = {
  hue: number; // 0–360
  radius: number; // 0 (white, center) – 1 (full color, edge)
  onChange: (hue: number, radius: number) => void; // live, while the finger moves
  onDraggingChange?: (dragging: boolean) => void; // the page around must not scroll meanwhile
};

// One 5° wedge of the circle, as an SVG path
function wedge(index: number): string {
  const start = ((index * 360) / SLICES - 90) * (Math.PI / 180);
  const end = (((index + 1) * 360) / SLICES - 90 + 0.6) * (Math.PI / 180); // a hair of overlap: no seams
  return `M${R},${R} L${R + R * Math.cos(start)},${R + R * Math.sin(start)} A${R},${R} 0 0 1 ${R + R * Math.cos(end)},${R + R * Math.sin(end)} Z`;
}

// "Il tuo colore" (docs/design/NuovaPassword.dc.html): the hues around, white in the middle. A pan
// gesture (gesture handler, starting at the touch, so a tap picks too): the marker follows the finger
// continuously and stays on the edge when the finger goes outside the circle. While the finger is
// down the page around is told to stop scrolling (onDraggingChange); a light tap of haptics on release.
export function ColorWheel({ hue, radius, onChange, onDraggingChange }: Props) {
  function pick(x: number, y: number) {
    const dx = x - R;
    const dy = y - R;
    const distance = Math.min(1, Math.sqrt(dx * dx + dy * dy) / R); // clamped to the edge
    let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    onChange(Math.round(angle), distance);
  }

  const pan = usePanGesture({
    minDistance: 0, // active at the touch: a tap chooses too
    runOnJS: true, // plain React state, no worklets
    shouldCancelWhenOutside: false, // keeps following the finger outside the circle
    onBegin: (event) => {
      onDraggingChange?.(true);
      pick(event.x, event.y);
    },
    onUpdate: (event) => pick(event.x, event.y),
    onFinalize: () => {
      onDraggingChange?.(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const rad = (hue * Math.PI) / 180;
  const markerX = R + Math.sin(rad) * radius * R;
  const markerY = R - Math.cos(rad) * radius * R;

  return (
    // Its own root: the wheel also lives in modal screens
    <GestureHandlerRootView style={styles.root}>
      <GestureDetector gesture={pan}>
        <View
          style={styles.wheel}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Ruota dei colori: tocca o trascina per scegliere"
          accessibilityActions={[
            { name: 'increment', label: 'Tinta successiva' },
            { name: 'decrement', label: 'Tinta precedente' },
          ]}
          onAccessibilityAction={(e) =>
            onChange((hue + (e.nativeEvent.actionName === 'increment' ? 30 : 330)) % 360, radius || 0.85)
          }>
          <Svg width={SIZE} height={SIZE} pointerEvents="none">
            <Defs>
              <RadialGradient id="white" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            {Array.from({ length: SLICES }, (_, i) => (
              <Path key={i} d={wedge(i)} fill={`hsl(${(i * 360) / SLICES}, 100%, 55%)`} />
            ))}
            <Circle cx={R} cy={R} r={R} fill="url(#white)" />
          </Svg>
          <View
            pointerEvents="none"
            style={[styles.marker, { left: markerX - 13, top: markerY - 13, backgroundColor: wheelHex(hue, radius) }]}
          />
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    width: SIZE,
    height: SIZE,
  },
  wheel: {
    width: SIZE,
    height: SIZE,
    borderRadius: R,
    overflow: 'visible',
    boxShadow: 'inset 0 0 0 1px rgba(28, 30, 70, 0.08)',
  },
  marker: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
});
