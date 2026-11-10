import { Image } from 'expo-image';
import { useImperativeHandle, useRef, type Ref } from 'react';
import { StyleSheet, View, type HostInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { CARD_ASPECT_RATIO } from '@/capture/guide-frame';

export type FrontBackComposerHandle = {
  // Returns the URI of a temporary JPEG with the front above the back
  compose: () => Promise<string>;
};

type Props = {
  frontUri: string;
  backUri: string;
  ref: Ref<FrontBackComposerHandle>;
};

const LOAD_TIMEOUT_MS = 3000;

// The iOS share sheet available in Expo Go takes ONE file. To send front and back together,
// this invisible view (placed off screen) draws both faces one above the other,
// and react-native-view-shot "photographs" it into a single JPEG.
export function FrontBackComposer({ frontUri, backUri, ref }: Props) {
  const canvasRef = useRef<HostInstance>(null); // the native view behind <View>
  const loadedCount = useRef(0);
  const waiting = useRef<(() => void)[]>([]);

  function handleLoaded() {
    loadedCount.current += 1;
    if (loadedCount.current >= 2) {
      waiting.current.forEach((resolve) => resolve());
      waiting.current = [];
    }
  }

  // Lets the parent call composerRef.current.compose(), like a public method of a component
  useImperativeHandle(ref, () => ({
    compose: async () => {
      if (loadedCount.current < 2) {
        // Wait for both images (local files: usually instant), but never forever
        await new Promise<void>((resolve) => {
          waiting.current.push(resolve);
          setTimeout(resolve, LOAD_TIMEOUT_MS);
        });
      }
      return captureRef(canvasRef, { format: 'jpg', quality: 0.9, result: 'tmpfile' });
    },
  }));

  return (
    <View ref={canvasRef} collapsable={false} style={styles.canvas} pointerEvents="none">
      <Image source={{ uri: frontUri }} style={styles.face} contentFit="contain" onLoad={handleLoaded} onError={handleLoaded} />
      <Image source={{ uri: backUri }} style={styles.face} contentFit="contain" onLoad={handleLoaded} onError={handleLoaded} />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: -10000, // off screen, but still laid out and drawable
    top: 0,
    width: 420, // × screen scale (3 on most iPhones) ≈ 1260 px wide
    padding: 16,
    gap: 16,
    backgroundColor: '#FFFFFF',
  },
  face: {
    width: '100%',
    aspectRatio: CARD_ASPECT_RATIO,
  },
});
