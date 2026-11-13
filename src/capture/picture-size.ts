import type { CameraView } from 'expo-camera';
import { useState, type RefObject } from 'react';

// The largest picture size the camera offers: iOS lists presets ("Photo" = the full sensor
// resolution) and sizes like "3840x2160". Without it the camera may shoot at the preview size.
function largest(sizes: string[]): string | undefined {
  if (sizes.includes('Photo')) return 'Photo';
  const area = (size: string) => {
    const match = /^(\d+)x(\d+)$/.exec(size);
    return match ? Number(match[1]) * Number(match[2]) : 0;
  };
  return [...sizes].sort((a, b) => area(b) - area(a))[0];
}

// For our own camera (fallback of the scanner, barcode photo): ask the sizes once the camera is
// ready and use the largest. Call onReady from CameraView's onCameraReady.
export function useLargestPictureSize(cameraRef: RefObject<CameraView | null>) {
  const [pictureSize, setPictureSize] = useState<string | undefined>(undefined);
  async function onReady() {
    try {
      const sizes = (await cameraRef.current?.getAvailablePictureSizesAsync()) ?? [];
      const best = largest(sizes);
      if (best) setPictureSize(best);
    } catch {
      // the default size still works
    }
  }
  return { pictureSize, onReady };
}
