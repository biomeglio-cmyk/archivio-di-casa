import { Image } from 'expo-image';
import { useImperativeHandle, useRef, type Ref } from 'react';
import { PixelRatio, StyleSheet, View, type HostInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { CARD_ASPECT_RATIO } from '@/capture/guide-frame';

export type ComposeOptions = {
  width?: number; // output width in pixels (default: the view's own pixel width)
  quality?: number; // JPEG quality 0–1 (default 0.9)
};

export type FrontBackComposerHandle = {
  // A temporary JPEG with the front above the back
  compose: (options?: ComposeOptions) => Promise<{ uri: string; width: number }>;
};

type Props = {
  frontUri: string;
  backUri: string;
  frontAspect?: number; // width / height of each photo, so nothing gets squashed
  backAspect?: number;
  ref: Ref<FrontBackComposerHandle>;
};

const CANVAS_WIDTH = 600; // points; × screen scale (3 on most iPhones) ≈ 1800 px
const PADDING = 16;
const GAP = 16;
const LOAD_TIMEOUT_MS = 3000;

// The iOS share sheet available in Expo Go takes ONE file. To send front and back as one image,
// this invisible view (placed off screen) draws both faces one above the other,
// and react-native-view-shot "photographs" it into a single JPEG.
export function FrontBackComposer({ frontUri, backUri, frontAspect = CARD_ASPECT_RATIO, backAspect = CARD_ASPECT_RATIO, ref }: Props) {
  const canvasRef = useRef<HostInstance>(null); // the native view behind <View>
  const loadedCount = useRef(0);
  const waiting = useRef<(() => void)[]>([]);

  const innerWidth = CANVAS_WIDTH - PADDING * 2;
  const canvasHeight = PADDING * 2 + GAP + innerWidth / frontAspect + innerWidth / backAspect;

  function handleLoaded() {
    loadedCount.current += 1;
    if (loadedCount.current >= 2) {
      waiting.current.forEach((resolve) => resolve());
      waiting.current = [];
    }
  }

  // Lets the parent call composerRef.current.compose(), like a public method of a component
  useImperativeHandle(ref, () => ({
    compose: async (options = {}) => {
      if (loadedCount.current < 2) {
        // Wait for both images (local files: usually instant), but never forever
        await new Promise<void>((resolve) => {
          waiting.current.push(resolve);
          setTimeout(resolve, LOAD_TIMEOUT_MS);
        });
      }
      const nativeWidth = Math.round(CANVAS_WIDTH * PixelRatio.get());
      const width = Math.max(1, Math.round(Math.min(options.width ?? nativeWidth, nativeWidth)));
      const height = Math.round((width * canvasHeight) / CANVAS_WIDTH);
      const uri = await captureRef(canvasRef, {
        format: 'jpg',
        quality: options.quality ?? 0.9,
        result: 'tmpfile',
        width,
        height,
      });
      return { uri, width };
    },
  }));

  return (
    <View ref={canvasRef} collapsable={false} style={[styles.canvas, { height: canvasHeight }]} pointerEvents="none">
      <Image source={{ uri: frontUri }} style={[styles.face, { aspectRatio: frontAspect }]} contentFit="contain" onLoad={handleLoaded} onError={handleLoaded} />
      <Image source={{ uri: backUri }} style={[styles.face, { aspectRatio: backAspect }]} contentFit="contain" onLoad={handleLoaded} onError={handleLoaded} />
    </View>
  );
}

// The largest pixel width a composed image can have (asking for more only enlarges)
export function composerMaxWidth(): number {
  return Math.round(CANVAS_WIDTH * PixelRatio.get());
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: -10000, // off screen, but still laid out and drawable
    top: 0,
    width: CANVAS_WIDTH,
    padding: PADDING,
    gap: GAP,
    backgroundColor: '#FFFFFF',
  },
  face: {
    width: '100%',
  },
});
