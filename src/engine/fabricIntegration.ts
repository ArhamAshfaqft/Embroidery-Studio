import { createRenderCanvas, RenderSource, sourceDimensions } from './renderCanvas';

export const DEFAULT_FABRIC_BLEND = 7;
export const fabricBlendAmount = (value?: number) =>
  Math.max(0, Math.min(10, Number.isFinite(value) ? value! : DEFAULT_FABRIC_BLEND)) / 10;

export interface PhotoLighting {
  tint: [number, number, number];
  exposure: number;
  confidence: number;
}

/** Conservative white-reference estimate. Saturated cloth is NOT a white
 * reference. Without enough bright, near-neutral pixels, leave colour alone.
 * This estimates a photographic cast, not a semantic fabric/depth model. */
export function analyzePhotoLighting(source: RenderSource): PhotoLighting {
  const fallback: PhotoLighting = { tint: [1, 1, 1], exposure: 1, confidence: 0 };
  const size = sourceDimensions(source);
  if (!size.width || !size.height) return fallback;
  const ratio = Math.min(1, 192 / Math.max(size.width, size.height));
  const canvas = createRenderCanvas();
  canvas.width = Math.max(1, Math.round(size.width * ratio));
  canvas.height = Math.max(1, Math.round(size.height * ratio));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return fallback;
  try {
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const candidates: { r: number; g: number; b: number; lum: number }[] = [];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 250) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const lum = r * .299 + g * .587 + b * .114;
      if (lum > 135 && max < 253 && (max - min) / max < .18) candidates.push({ r, g, b, lum });
    }
    if (candidates.length < Math.max(32, canvas.width * canvas.height * .025)) return fallback;
    candidates.sort((a, b) => a.lum - b.lum);
    // A trimmed bright percentile reduces influence of both grey cloth and
    // clipped white backgrounds, where colour/exposure cannot be recovered.
    const start = Math.floor(candidates.length * .65), end = Math.ceil(candidates.length * .95);
    let r = 0, g = 0, b = 0;
    for (let i = start; i < end; i++) { r += candidates[i].r; g += candidates[i].g; b += candidates[i].b; }
    const n = end - start;
    r /= n; g /= n; b /= n;
    const average = (r + g + b) / 3;
    const confidence = Math.min(1, candidates.length / (canvas.width * canvas.height * .15));
    return {
      tint: [r, g, b].map(v => 1 + Math.max(-.055, Math.min(.055, v / average - 1)) * confidence) as [number, number, number],
      // Do not interpret a black shirt as underexposure. Only a bright reference
      // can lower the upper tonal range, and the correction is tightly bounded.
      exposure: 1 - Math.min(.07, Math.max(0, (235 - average) / 450)) * confidence,
      confidence
    };
  } catch { return fallback; }
}

/** A small photographic point-spread function. Premultiplied channels prevent
 * black fringes around transparent designs; opaque stitch interiors stay opaque.
 * A sparse binomial kernel uses one byte buffer, avoiding multiple full-size
 * float channel buffers for large exports. */
export function softenThreadLayer(data: ImageData, radius: number, amount: number): void {
  if (amount <= 0) return;
  const { width, height } = data, pixels = data.data;
  const source = new Uint8ClampedArray(pixels);
  const step = Math.max(1, Math.round(radius));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const centerWeight = source[index + 3] * (1 - amount);
      let alpha = centerWeight;
      let r = source[index] * centerWeight, g = source[index + 1] * centerWeight, b = source[index + 2] * centerWeight;
      for (let dy = -1; dy <= 1; dy++) {
        const sy = y + dy * step;
        if (sy < 0 || sy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const sx = x + dx * step;
          if (sx < 0 || sx >= width) continue;
          const i = (sy * width + sx) * 4;
          const weight = amount * (dx === 0 ? .5 : .25) * (dy === 0 ? .5 : .25) * source[i + 3];
          alpha += weight; r += source[i] * weight; g += source[i + 1] * weight; b += source[i + 2] * weight;
        }
      }
      pixels[index] = alpha > 0 ? r / alpha : 0;
      pixels[index + 1] = alpha > 0 ? g / alpha : 0;
      pixels[index + 2] = alpha > 0 ? b / alpha : 0;
      pixels[index + 3] = alpha;
    }
  }
}
