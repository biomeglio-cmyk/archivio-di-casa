// Guide frame shown over the camera: the shape of an ID card (ISO/IEC 7810 ID-1, 85.6 × 54 mm)
export const CARD_ASPECT_RATIO = 85.6 / 54;

const SIDE_MARGIN = 24;

export type FrameRect = { x: number; y: number; width: number; height: number };

// Where the frame sits on a screen of the given size: full width minus margins, slightly above center
export function guideFrameRect(screenWidth: number, screenHeight: number): FrameRect {
  const width = screenWidth - SIDE_MARGIN * 2;
  const height = width / CARD_ASPECT_RATIO;
  return {
    x: SIDE_MARGIN,
    y: (screenHeight - height) / 2 - 40,
    width,
    height,
  };
}

// Extra room kept around the frame when cropping, so the card edges are never cut off
const CROP_MARGIN = 0.04;

// The camera preview fills the screen ("aspect fill"): the photo is scaled until it covers
// the whole screen and the overflowing part is hidden. To crop the photo exactly where the
// frame was, we undo that scaling and offset.
export function frameToPhotoCrop(
  frame: FrameRect,
  screen: { width: number; height: number },
  photo: { width: number; height: number },
): { originX: number; originY: number; width: number; height: number } {
  const scale = Math.max(screen.width / photo.width, screen.height / photo.height);
  const offsetX = (photo.width * scale - screen.width) / 2;
  const offsetY = (photo.height * scale - screen.height) / 2;

  const marginX = frame.width * CROP_MARGIN;
  const marginY = frame.height * CROP_MARGIN;

  const left = Math.max(0, (frame.x - marginX + offsetX) / scale);
  const top = Math.max(0, (frame.y - marginY + offsetY) / scale);
  const right = Math.min(photo.width, (frame.x + frame.width + marginX + offsetX) / scale);
  const bottom = Math.min(photo.height, (frame.y + frame.height + marginY + offsetY) / scale);

  return {
    originX: Math.round(left),
    originY: Math.round(top),
    width: Math.round(right - left),
    height: Math.round(bottom - top),
  };
}
