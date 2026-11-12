import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  start: ReactNode; // the label
  end: ReactNode; // the value (with its chevrons), never truncated
  gap?: number;
  style?: StyleProp<ViewStyle>;
};

// A label and a value on one line when both fit at their natural width; otherwise the value goes
// on its own line under the label, left-aligned and complete (it may wrap). The widths are
// measured (onLayout of an invisible copy at natural size), never estimated, so it follows the
// screen size and Dynamic Type.
export function FitLine({ start, end, gap = 12, style }: Props) {
  const [available, setAvailable] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [endWidth, setEndWidth] = useState(0);
  const measured = available > 0 && startWidth > 0 && endWidth > 0;
  const fits = !measured || startWidth + gap + endWidth <= available;

  return (
    <View style={[styles.box, style]} onLayout={(e) => setAvailable(e.nativeEvent.layout.width)}>
      {/* Invisible copies at their natural width, only to measure */}
      <View style={styles.measure} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.natural} onLayout={(e) => setStartWidth(Math.ceil(e.nativeEvent.layout.width))}>
          {start}
        </View>
        <View style={styles.natural} onLayout={(e) => setEndWidth(Math.ceil(e.nativeEvent.layout.width))}>
          {end}
        </View>
      </View>
      {fits ? (
        <View style={[styles.line, { gap }]}>
          <View style={styles.start}>{start}</View>
          <View style={styles.end}>{end}</View>
        </View>
      ) : (
        <View style={styles.stack}>
          {start}
          <View style={styles.below}>{end}</View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
  },
  measure: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4000,
    opacity: 0,
    alignItems: 'flex-start',
  },
  natural: {
    alignSelf: 'flex-start',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  start: {
    flexShrink: 1,
  },
  end: {
    marginLeft: 'auto',
  },
  stack: {
    gap: 6,
  },
  below: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
});
