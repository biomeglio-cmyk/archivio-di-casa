import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { frameToPhotoCrop, type FrameRect } from '@/capture/guide-frame';

type Photo = { uri: string; width: number; height: number };

// Crops the photo to the guide frame and returns the URI of the new JPEG (in the cache folder).
// If anything goes wrong we keep the full photo: better uncropped than lost.
export async function cropToGuideFrame(
  photo: Photo,
  frame: FrameRect,
  screen: { width: number; height: number },
): Promise<string> {
  try {
    const rect = frameToPhotoCrop(frame, screen, photo);
    if (rect.width <= 0 || rect.height <= 0) return photo.uri;

    const image = await ImageManipulator.manipulate(photo.uri).crop(rect).renderAsync();
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
    return result.uri;
  } catch {
    return photo.uri;
  }
}
