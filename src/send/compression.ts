// Compression engine ported from PDFLeggero, with the same values.
// It does not know how to draw images or PDFs: the caller passes a `render` function that
// produces the file for one ladder step and reports its size. The engine only decides which
// step to use, so the same logic serves PDFs, single JPEGs and front+back images.

export type LadderStep = {
  maxPpi: number; // maximum effective pixels per inch, on the printed size of the document
  quality: number; // JPEG quality, 0–100
  scale: number; // extra downscale on top of the ppi limit
};

// From the gentlest to the most aggressive
export const LADDER: readonly LadderStep[] = [
  { maxPpi: 300, quality: 85, scale: 1.0 },
  { maxPpi: 220, quality: 80, scale: 1.0 },
  { maxPpi: 180, quality: 75, scale: 1.0 },
  { maxPpi: 150, quality: 72, scale: 1.0 },
  { maxPpi: 150, quality: 62, scale: 1.0 },
  { maxPpi: 130, quality: 60, scale: 1.0 },
  { maxPpi: 110, quality: 58, scale: 1.0 },
  { maxPpi: 100, quality: 55, scale: 1.0 },
  { maxPpi: 100, quality: 52, scale: 0.9 },
  { maxPpi: 90, quality: 50, scale: 0.85 },
  { maxPpi: 80, quality: 50, scale: 0.8 },
  { maxPpi: 72, quality: 48, scale: 0.75 },
  { maxPpi: 60, quality: 45, scale: 0.7 },
  { maxPpi: 50, quality: 40, scale: 0.6 },
  { maxPpi: 40, quality: 35, scale: 0.5 },
  { maxPpi: 32, quality: 30, scale: 0.4 },
];

export const MB = 1_000_000; // 1 MB = 1,000,000 bytes (as email providers count)

const REFINE_THRESHOLD = 0.97; // below 97% of the limit there is room for a better quality
const REFINE_BOOST = 20;
const REFINE_MAX_QUALITY = 90;
const REFINE_STEP = 4;
const LOW_PPI = 100;

export type QualityLabel = 'Alta' | 'Buona' | 'Bassa' | 'Minima';

// Level 0–4 Alta, 5–9 Buona, 10–12 Bassa, 13–15 Minima
export function qualityLabel(level: number): QualityLabel {
  if (level <= 4) return 'Alta';
  if (level <= 9) return 'Buona';
  if (level <= 12) return 'Bassa';
  return 'Minima';
}

// What a render must report back; T carries whatever the caller needs (file URIs, pages…)
export type Rendered<T> = T & {
  bytes: number;
  ppi: number; // lowest effective ppi among the images
};

export type CompressionResult<T> = {
  output: Rendered<T>;
  level: number; // ladder index used
  quality: number; // JPEG quality actually used (may be higher than the ladder's after refinement)
  fits: boolean; // false = even the last level is over the limit
  qualityLabel: QualityLabel;
  warnings: string[];
};

export const WARNING_TOO_BIG = 'Anche alla compressione massima supera il limite: valuta di dividerlo in più file.';
export const WARNING_LOW_PPI = 'Il testo piccolo potrebbe non essere leggibile.';

export async function compressToLimit<T>(
  render: (step: LadderStep) => Promise<Rendered<T>>,
  limitBytes: number,
): Promise<CompressionResult<T>> {
  // Each ladder level is rendered at most once
  const cache = new Map<number, Rendered<T>>();
  const renderLevel = async (level: number) => {
    let result = cache.get(level);
    if (!result) {
      result = await render(LADDER[level]);
      cache.set(level, result);
    }
    return result;
  };

  // Binary search for the gentlest level under the limit (sizes shrink as the level grows)
  let low = 0;
  let high = LADDER.length - 1;
  let best: { level: number; output: Rendered<T> } | null = null;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const output = await renderLevel(mid);
    if (output.bytes <= limitBytes) {
      best = { level: mid, output };
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  // Not even the last level fits: deliver the smallest and say so
  if (!best) {
    const level = LADDER.length - 1;
    const output = await renderLevel(level);
    return finish(output, level, LADDER[level].quality, false);
  }

  // Refinement: with room left, try a higher JPEG quality at the same size settings,
  // from min(q + 20, 90) down by 4, and keep the first one that still fits
  let quality = LADDER[best.level].quality;
  let output = best.output;
  if (output.bytes < limitBytes * REFINE_THRESHOLD) {
    const step = LADDER[best.level];
    for (let q = Math.min(step.quality + REFINE_BOOST, REFINE_MAX_QUALITY); q > step.quality; q -= REFINE_STEP) {
      const candidate = await render({ ...step, quality: q });
      if (candidate.bytes <= limitBytes) {
        output = candidate;
        quality = q;
        break;
      }
    }
  }
  return finish(output, best.level, quality, true);
}

function finish<T>(output: Rendered<T>, level: number, quality: number, fits: boolean): CompressionResult<T> {
  const warnings: string[] = [];
  if (!fits) warnings.push(WARNING_TOO_BIG);
  if (output.ppi < LOW_PPI) warnings.push(WARNING_LOW_PPI);
  return { output, level, quality, fits, qualityLabel: qualityLabel(level), warnings };
}
