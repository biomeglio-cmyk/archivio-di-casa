import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { LadderStep } from '@/send/compression';
import { effectivePpi, maxPixelWidth } from '@/send/physical-size';

export type ImageSize = { width: number; height: number };

// Original pixel sizes, read once per file
const sizes = new Map<string, ImageSize>();

export async function imageSize(uri: string): Promise<ImageSize> {
  const cached = sizes.get(uri);
  if (cached) return cached;
  const image = await ImageManipulator.manipulate(uri).renderAsync();
  const size = { width: image.width, height: image.height };
  sizes.set(uri, size);
  return size;
}

export type RenderedImage = { uri: string; width: number; height: number; ppi: number };

// One ladder step applied to one photo: at most `maxPpi` on its printed width, times the extra
// scale, saved as JPEG at the step quality. Never enlarges the original.
export async function renderImage(uri: string, printedWidthMm: number, step: LadderStep): Promise<RenderedImage> {
  const original = await imageSize(uri);
  const limited = Math.min(original.width, maxPixelWidth(step.maxPpi, printedWidthMm));
  const width = Math.max(1, Math.round(limited * step.scale));
  const height = Math.max(1, Math.round((width * original.height) / original.width));

  const image = await ImageManipulator.manipulate(uri).resize({ width, height }).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: step.quality / 100 });
  return { uri: saved.uri, width, height, ppi: effectivePpi(width, printedWidthMm) };
}
