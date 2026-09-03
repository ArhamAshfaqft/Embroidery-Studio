// Fail explicitly instead of letting a 2x/4x choice allocate several gigabytes.
// Native 9712 x 10360 (101 MP) remains supported, without silently resizing it.
export const MAX_RENDER_PIXELS = 128_000_000;
export function assertRenderSize(width: number, height: number) {
  if (!Number.isFinite(width * height) || width < 1 || height < 1 ||
      width > 32767 || height > 32767 || width * height > MAX_RENDER_PIXELS) {
    throw new Error('This output exceeds the safe 128-megapixel canvas limit. Choose a lower export multiplier; the original artwork is unchanged.');
  }
}

/** Quantized pixel-density tiers: zooming/panning does not enqueue a render per frame. */
export function getPreviewScale(width: number, height: number, zoom: number, dpr = 1) {
  const minimum = Math.min(1, 1536 / Math.max(width, height));
  const demand = Math.min(1, Math.max(minimum, zoom * dpr * 1.25));
  return [0.0625, 0.125, 0.25, 0.5, 1].find(tier => tier >= demand) ?? 1;
}

/** Enough pixels for the placed artwork, not a blind 2x of a 100 MP source. */
export function getMockupRenderScale(width: number, height: number, placementScale: number, outputScale: number) {
  const required = Math.max(0.01, placementScale * outputScale * 1.25);
  return Math.min(2, Math.max(Math.min(1, 1536 / Math.max(width, height)), required));
}
