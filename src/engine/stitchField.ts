export interface AdaptiveStitchField {
  width: number;
  height: number;
  normalX: Float32Array;
  normalY: Float32Array;
  coherence: Float32Array;
  boundaryProximity: Float32Array;
  boundaryStrength: Float32Array;
}

const MAX_FIELD_DIMENSION = 512;
const GAUSSIAN_KERNEL = [1, 6, 15, 20, 15, 6, 1] as const;
const GAUSSIAN_DIVISOR = 64;
const INF = 99999;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const gaussianBlur = (source: Float32Array, width: number, height: number) => {
  const horizontal = new Float32Array(source.length);
  const output = new Float32Array(source.length);
  const radius = 3;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let offset = -radius; offset <= radius; offset++) {
        const sampleX = Math.min(width - 1, Math.max(0, x + offset));
        sum += source[row + sampleX] * GAUSSIAN_KERNEL[offset + radius];
      }
      horizontal[row + x] = sum / GAUSSIAN_DIVISOR;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let offset = -radius; offset <= radius; offset++) {
        const sampleY = Math.min(height - 1, Math.max(0, y + offset));
        sum += horizontal[sampleY * width + x] * GAUSSIAN_KERNEL[offset + radius];
      }
      output[y * width + x] = sum / GAUSSIAN_DIVISOR;
    }
  }

  return output;
};

/**
 * Builds a compact structure-tensor field from internal artwork color regions.
 * The field is capped at 512px so preview and 4K export share the same flow
 * analysis without introducing a large-frame performance penalty.
 */
export const computeAdaptiveStitchField = (
  pixels: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number
): AdaptiveStitchField => {
  const scale = Math.min(1, MAX_FIELD_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(2, Math.round(sourceWidth * scale));
  const height = Math.max(2, Math.round(sourceHeight * scale));
  const total = width * height;

  const red = new Float32Array(total);
  const green = new Float32Array(total);
  const blue = new Float32Array(total);
  const alpha = new Float32Array(total);

  for (let y = 0; y < height; y++) {
    const sourceY = Math.min(sourceHeight - 1, Math.floor(((y + 0.5) * sourceHeight) / height));
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor(((x + 0.5) * sourceWidth) / width));
      const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
      const index = y * width + x;
      red[index] = pixels[sourceIndex] / 255;
      green[index] = pixels[sourceIndex + 1] / 255;
      blue[index] = pixels[sourceIndex + 2] / 255;
      alpha[index] = pixels[sourceIndex + 3] / 255;
    }
  }

  const tensorXX = new Float32Array(total);
  const tensorYY = new Float32Array(total);
  const tensorXY = new Float32Array(total);
  const boundarySeeds = new Uint8Array(total);
  const rawBoundaryStrength = new Float32Array(total);

  const colorDifference = (first: number, second: number) => {
    const dr = red[first] - red[second];
    const dg = green[first] - green[second];
    const db = blue[first] - blue[second];
    return Math.sqrt((dr * dr + dg * dg + db * db) / 3);
  };

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      if (alpha[index] < 0.08) continue;

      const left = index - 1;
      const right = index + 1;
      const up = index - width;
      const down = index + width;

      const drX = (red[right] - red[left]) * 0.5;
      const dgX = (green[right] - green[left]) * 0.5;
      const dbX = (blue[right] - blue[left]) * 0.5;
      const drY = (red[down] - red[up]) * 0.5;
      const dgY = (green[down] - green[up]) * 0.5;
      const dbY = (blue[down] - blue[up]) * 0.5;

      tensorXX[index] = drX * drX + dgX * dgX + dbX * dbX;
      tensorYY[index] = drY * drY + dgY * dgY + dbY * dbY;
      tensorXY[index] = drX * drY + dgX * dgY + dbX * dbY;

      // Only opaque-to-opaque transitions count as internal object boundaries.
      // The established outer-edge renderer remains untouched.
      let strongestDifference = 0;
      for (const neighbor of [left, right, up, down]) {
        if (alpha[neighbor] > 0.08) {
          strongestDifference = Math.max(strongestDifference, colorDifference(index, neighbor));
        }
      }
      rawBoundaryStrength[index] = clamp01((strongestDifference - 0.045) / 0.22);
      if (strongestDifference > 0.075) boundarySeeds[index] = 1;
    }
  }

  const smoothXX = gaussianBlur(tensorXX, width, height);
  const smoothYY = gaussianBlur(tensorYY, width, height);
  const smoothXY = gaussianBlur(tensorXY, width, height);
  const boundaryStrength = gaussianBlur(rawBoundaryStrength, width, height);

  const normalX = new Float32Array(total);
  const normalY = new Float32Array(total);
  const coherence = new Float32Array(total);
  const distance = new Float32Array(total);

  for (let index = 0; index < total; index++) {
    const xx = smoothXX[index];
    const yy = smoothYY[index];
    const xy = smoothXY[index];
    const trace = xx + yy;
    const eigenGap = Math.sqrt((xx - yy) * (xx - yy) + 4 * xy * xy);
    const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
    normalX[index] = Math.cos(angle);
    normalY[index] = Math.sin(angle);
    coherence[index] = trace > 0.00002
      ? clamp01((eigenGap / (trace + 0.00001)) * Math.min(1, trace * 24))
      : 0;
    distance[index] = boundarySeeds[index] ? 0 : INF;
  }

  // Chamfer distance to the nearest internal color boundary.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      distance[index] = Math.min(
        distance[index],
        distance[index - 1] + 1,
        distance[index - width] + 1,
        distance[index - width - 1] + 1.414,
        distance[index - width + 1] + 1.414
      );
    }
  }
  for (let y = height - 2; y > 0; y--) {
    for (let x = width - 2; x > 0; x--) {
      const index = y * width + x;
      distance[index] = Math.min(
        distance[index],
        distance[index + 1] + 1,
        distance[index + width] + 1,
        distance[index + width + 1] + 1.414,
        distance[index + width - 1] + 1.414
      );
    }
  }

  const boundaryProximity = new Float32Array(total);
  for (let index = 0; index < total; index++) {
    if (alpha[index] > 0.08 && distance[index] < INF) {
      boundaryProximity[index] = clamp01(1 - distance[index] / 10);
    }
  }

  return {
    width,
    height,
    normalX,
    normalY,
    coherence,
    boundaryProximity,
    boundaryStrength
  };
};
