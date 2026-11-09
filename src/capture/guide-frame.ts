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
