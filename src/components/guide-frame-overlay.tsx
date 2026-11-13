import { StyleSheet, View } from 'react-native';

import type { FrameRect } from '@/capture/guide-frame';
import { type Palette } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

const MASK = 'rgba(0, 0, 0, 0.55)';

type Props = {
  frame: FrameRect;
};

// Darkens everything outside the guide frame and draws its white border.
// Four plain rectangles around the frame: simple, and no native module needed.
export function GuideFrameOverlay({ frame }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden // decoration over the camera
      importantForAccessibility="no-hide-descendants">
      <View style={[styles.mask, { top: 0, left: 0, right: 0, height: frame.y }]} />
      <View style={[styles.mask, { top: frame.y + frame.height, left: 0, right: 0, bottom: 0 }]} />
      <View style={[styles.mask, { top: frame.y, left: 0, width: frame.x, height: frame.height }]} />
      <View
        style={[styles.mask, { top: frame.y, left: frame.x + frame.width, right: 0, height: frame.height }]}
      />
      <View
        style={[
          styles.border,
          { top: frame.y, left: frame.x, width: frame.width, height: frame.height },
        ]}
      />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  mask: {
    position: 'absolute',
    backgroundColor: MASK,
  },
  border: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 14,
    borderCurve: 'continuous',
  },
});
