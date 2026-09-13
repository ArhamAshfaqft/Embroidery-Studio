/**
 * Image Processing Utilities for Raven Embroidery Studio
 * Includes intelligent background knockout, alpha channel detection, and edge feathering.
 */

export interface BackgroundKnockoutResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  removedColor: string;
  pixelsRemoved: number;
}

/**
 * Remove a near-white or near-black backdrop directly from a pixel buffer.
 *
 * This is deliberately edge-connected: white details enclosed by the artwork
 * (stars, highlights, lettering) remain intact, while a JPEG/PNG artboard
 * around the design becomes transparent.  It is renderer-safe, so it works in
 * both the main window and the OffscreenCanvas worker.
 */
export function knockoutNeutralEdgeBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance = 42
): number {
  if (width < 2 || height < 2) return 0;

  const cornerPixels = [
    0,
    width - 1,
    (height - 1) * width,
    height * width - 1
  ];
  const samples = cornerPixels.map((pixel) => {
    const i = pixel * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
  });
  if (samples.some(s => s.a < 245)) return 0;

  const bg = samples.reduce((sum, sample) => ({
    r: sum.r + sample.r / samples.length,
    g: sum.g + sample.g / samples.length,
    b: sum.b + sample.b / samples.length
  }), { r: 0, g: 0, b: 0 });
  const channelSpread = Math.max(bg.r, bg.g, bg.b) - Math.min(bg.r, bg.g, bg.b);
  const brightness = (bg.r + bg.g + bg.b) / 3;
  // Avoid unexpectedly cutting a coloured product photo. Flat white/black
  // artboards are the common accidental embroidery background.
  if (channelSpread > 22 || (brightness > 48 && brightness < 207)) return 0;

  const toleranceSq = tolerance * tolerance * 3;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let tail = 0;
  const enqueue = (pixel: number) => {
    if (visited[pixel]) return;
    visited[pixel] = 1;
    queue[tail++] = pixel;
  };
  for (let x = 0; x < width; x++) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  let removed = 0;
  for (let head = 0; head < tail; head++) {
    const pixel = queue[head];
    const index = pixel * 4;
    const dr = data[index] - bg.r;
    const dg = data[index + 1] - bg.g;
    const db = data[index + 2] - bg.b;
    const distanceSq = dr * dr + dg * dg + db * db;
    if (distanceSq > toleranceSq) continue;

    const ratio = Math.sqrt(distanceSq / toleranceSq);
    data[index + 3] = ratio < 0.85 ? 0 : Math.round(255 * (ratio - 0.85) / 0.15);
    removed++;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) enqueue(pixel - 1);
    if (x + 1 < width) enqueue(pixel + 1);
    if (y > 0) enqueue(pixel - width);
    if (y + 1 < height) enqueue(pixel + width);
  }
  return removed;
}

/**
 * Automatically detects and removes solid/plain background from raster images (JPG/PNG)
 * Uses 4-corner multi-seed flood fill with perceptual Euclidean color distance and edge antialiasing.
 */
export function removePlainBackground(
  image: HTMLImageElement | HTMLCanvasElement,
  tolerance: number = 32
): BackgroundKnockoutResult {
  const width = image.width;
  const height = image.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { canvas, dataUrl: '', removedColor: '#ffffff', pixelsRemoved: 0 };
  }

  ctx.drawImage(image, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const totalPixels = width * height;

  // 1. Sample 4 corners to determine background color candidate
  const cornerIndices = [
    0, // Top-Left
    (width - 1) * 4, // Top-Right
    ((height - 1) * width) * 4, // Bottom-Left
    ((height - 1) * width + (width - 1)) * 4 // Bottom-Right
  ];

  let bgR = 0, bgG = 0, bgB = 0;
  for (const idx of cornerIndices) {
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  }
  bgR = Math.round(bgR / 4);
  bgG = Math.round(bgG / 4);
  bgB = Math.round(bgB / 4);

  const hexColor = `#${((1 << 24) + (bgR << 16) + (bgG << 8) + bgB).toString(16).slice(1)}`;

  // 2. Flood fill / Distance-based Alpha Knockout
  const tolSq = tolerance * tolerance * 3;
  const visited = new Uint8Array(totalPixels);
  const queue: number[] = [];

  // Seed with border pixels matching background
  for (let x = 0; x < width; x++) {
    queue.push(x); // top row
    queue.push((height - 1) * width + x); // bottom row
  }
  for (let y = 0; y < height; y++) {
    queue.push(y * width); // left col
    queue.push(y * width + (width - 1)); // right col
  }

  let removedCount = 0;

  // BFS Flood Fill from edges
  let head = 0;
  while (head < queue.length) {
    const p = queue[head++];
    if (visited[p]) continue;
    visited[p] = 1;

    const idx = p * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    const dr = r - bgR;
    const dg = g - bgG;
    const db = b - bgB;
    const distSq = dr * dr + dg * dg + db * db;

    if (distSq <= tolSq) {
      // Soft edge falloff
      const factor = Math.sqrt(distSq / tolSq);
      if (factor < 0.6) {
        data[idx + 3] = 0;
      } else {
        data[idx + 3] = Math.round(255 * (factor - 0.6) / 0.4);
      }
      removedCount++;

      const px = p % width;
      const py = Math.floor(p / width);

      if (px > 0 && !visited[p - 1]) queue.push(p - 1);
      if (px < width - 1 && !visited[p + 1]) queue.push(p + 1);
      if (py > 0 && !visited[p - width]) queue.push(p - width);
      if (py < height - 1 && !visited[p + width]) queue.push(p + width);
    }
  }

  ctx.putImageData(imgData, 0, 0);

  return {
    canvas,
    dataUrl: canvas.toDataURL('image/png'),
    removedColor: hexColor,
    pixelsRemoved: removedCount
  };
}

/**
 * Checks if an image is an opaque JPG with solid borders (candidate for auto-knockout)
 */
export function hasSolidBackgroundBorders(
  image: HTMLImageElement | HTMLCanvasElement
): boolean {
  const width = image.width;
  const height = image.height;

  const canvas = document.createElement('canvas');
  canvas.width = Math.min(width, 200);
  canvas.height = Math.min(height, 200);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  // Check 4 corners
  const w = canvas.width;
  const h = canvas.height;
  const tl = [data[0], data[1], data[2], data[3]];
  const tr = [data[(w - 1) * 4], data[(w - 1) * 4 + 1], data[(w - 1) * 4 + 2], data[(w - 1) * 4 + 3]];
  const bl = [data[((h - 1) * w) * 4], data[((h - 1) * w) * 4 + 1], data[((h - 1) * w) * 4 + 2], data[((h - 1) * w) * 4 + 3]];
  const br = [data[((h - 1) * w + (w - 1)) * 4], data[((h - 1) * w + (w - 1)) * 4 + 1], data[((h - 1) * w + (w - 1)) * 4 + 2], data[((h - 1) * w + (w - 1)) * 4 + 3]];

  // If all corners are opaque (alpha > 250) and have similar color (e.g. pure white or black)
  const isOpaque = tl[3] > 250 && tr[3] > 250 && bl[3] > 250 && br[3] > 250;
  if (!isOpaque) return false;

  const isWhite = tl[0] > 240 && tl[1] > 240 && tl[2] > 240 && tr[0] > 240 && bl[0] > 240 && br[0] > 240;
  const isBlack = tl[0] < 20 && tl[1] < 20 && tl[2] < 20 && tr[0] < 20 && bl[0] < 20 && br[0] < 20;

  return isWhite || isBlack;
}
