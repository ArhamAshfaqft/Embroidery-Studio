import type { LocalSegmentationResult } from './localSegmentation';

export interface ObjectStitchFlow {
  width: number;
  height: number;
  labels: Uint16Array;
  tangentX: Float32Array;
  tangentY: Float32Array;
  confidence: Float32Array;
  /** Per-label local origin used to keep curved thread phases continuous. */
  centroidX: Float32Array;
  centroidY: Float32Array;
  /** Integrated coordinates keep the procedural weave continuous as it turns. */
  rowCoordinate: Float32Array;
  longCoordinate: Float32Array;
  /** Approximate inward distance from the current object's boundary. */
  boundaryDistance: Float32Array;
}

const MAX_FLOW_DIMENSION = 512;
const INF = 1_000_000;
const SQRT_TWO = Math.SQRT2;
const SMOOTHING_PASSES = 5;
const INTEGRATION_PASSES = 36;
const objectFlowCache = new WeakMap<LocalSegmentationResult, ObjectStitchFlow>();

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const alignDirection = (
  x: number,
  y: number,
  referenceX: number,
  referenceY: number
) => x * referenceX + y * referenceY < 0 ? { x: -x, y: -y } : { x, y };

/**
 * Builds a dense, orientation-only stitch field from MobileSAM object masks.
 *
 * The distance-to-boundary gradient creates cross-column satin flow in narrow
 * shapes and radial/turning flow in petals and compact objects. Directions are
 * averaged in double-angle space, where a vector and its 180-degree reversal
 * are equivalent. This avoids centerline seams while retaining real curvature.
 */
export const computeObjectStitchFlow = (
  segmentation: LocalSegmentationResult
): ObjectStitchFlow => {
  const cached = objectFlowCache.get(segmentation);
  if (cached) return cached;

  const scale = Math.min(
    1,
    MAX_FLOW_DIMENSION / Math.max(segmentation.width, segmentation.height)
  );
  const width = Math.max(2, Math.round(segmentation.width * scale));
  const height = Math.max(2, Math.round(segmentation.height * scale));
  const total = width * height;
  const labels = new Uint16Array(total);

  for (let y = 0; y < height; y++) {
    const sourceY = Math.min(
      segmentation.height - 1,
      Math.floor(((y + 0.5) * segmentation.height) / height)
    );
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(
        segmentation.width - 1,
        Math.floor(((x + 0.5) * segmentation.width) / width)
      );
      labels[y * width + x] = segmentation.labels[sourceY * segmentation.width + sourceX];
    }
  }

  let maximumLabel = 0;
  for (let index = 0; index < labels.length; index++) maximumLabel = Math.max(maximumLabel, labels[index]);
  for (const object of segmentation.objects) maximumLabel = Math.max(maximumLabel, object.id);

  const baseX = new Float32Array(maximumLabel + 1);
  const baseY = new Float32Array(maximumLabel + 1);
  const baseConfidence = new Float32Array(maximumLabel + 1);
  for (const object of segmentation.objects) {
    // A satin/fill column crosses an elongated object's long axis.
    const radians = ((object.directionDegrees + 90) * Math.PI) / 180;
    baseX[object.id] = Math.cos(radians);
    baseY[object.id] = Math.sin(radians);
    baseConfidence[object.id] = clamp01(object.directionConfidence);
  }

  // Downsampled object centroids provide a stable radial fallback for compact
  // petals, berries, dots, and other masks with an ambiguous principal axis.
  const centroidX = new Float32Array(maximumLabel + 1);
  const centroidY = new Float32Array(maximumLabel + 1);
  const area = new Uint32Array(maximumLabel + 1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const label = labels[y * width + x];
      if (label === 0) continue;
      centroidX[label] += x;
      centroidY[label] += y;
      area[label]++;
    }
  }
  for (let label = 1; label <= maximumLabel; label++) {
    if (area[label] === 0) continue;
    centroidX[label] /= area[label];
    centroidY[label] /= area[label];
  }

  const boundaryDistance = new Float32Array(total);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const label = labels[index];
      if (label === 0) {
        boundaryDistance[index] = 0;
        continue;
      }
      const boundary =
        x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
        labels[index - 1] !== label || labels[index + 1] !== label ||
        labels[index - width] !== label || labels[index + width] !== label;
      boundaryDistance[index] = boundary ? 0 : INF;
    }
  }

  const relax = (index: number, neighbor: number, cost: number, label: number) => {
    if (labels[neighbor] !== label) return;
    boundaryDistance[index] = Math.min(boundaryDistance[index], boundaryDistance[neighbor] + cost);
  };

  // Multi-label chamfer transform: distance only propagates inside the same AI
  // object, so touching masks never contaminate one another's stitch flow.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      const label = labels[index];
      if (label === 0 || boundaryDistance[index] === 0) continue;
      relax(index, index - 1, 1, label);
      relax(index, index - width, 1, label);
      relax(index, index - width - 1, SQRT_TWO, label);
      relax(index, index - width + 1, SQRT_TWO, label);
    }
  }
  for (let y = height - 2; y > 0; y--) {
    for (let x = width - 2; x > 0; x--) {
      const index = y * width + x;
      const label = labels[index];
      if (label === 0 || boundaryDistance[index] === 0) continue;
      relax(index, index + 1, 1, label);
      relax(index, index + width, 1, label);
      relax(index, index + width + 1, SQRT_TWO, label);
      relax(index, index + width - 1, SQRT_TWO, label);
    }
  }

  let doubleX = new Float32Array(total);
  let doubleY = new Float32Array(total);
  const rawConfidence = new Float32Array(total);

  const distanceAt = (x: number, y: number, label: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return 0;
    const index = y * width + x;
    return labels[index] === label ? boundaryDistance[index] : 0;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const label = labels[index];
      if (label === 0) continue;

      let referenceX = baseX[label];
      let referenceY = baseY[label];
      if (Math.hypot(referenceX, referenceY) < 0.5) {
        referenceX = 1;
        referenceY = 0;
      }

      const dx =
        distanceAt(x + 1, y - 1, label) +
        2 * distanceAt(x + 1, y, label) +
        distanceAt(x + 1, y + 1, label) -
        distanceAt(x - 1, y - 1, label) -
        2 * distanceAt(x - 1, y, label) -
        distanceAt(x - 1, y + 1, label);
      const dy =
        distanceAt(x - 1, y + 1, label) +
        2 * distanceAt(x, y + 1, label) +
        distanceAt(x + 1, y + 1, label) -
        distanceAt(x - 1, y - 1, label) -
        2 * distanceAt(x, y - 1, label) -
        distanceAt(x + 1, y - 1, label);
      const gradientLength = Math.hypot(dx, dy);

      let shapeX: number;
      let shapeY: number;
      let shapeConfidence: number;
      const areaShare = area[label] / Math.max(1, total);
      const largeAmbiguousObject = baseConfidence[label] < 0.28 && areaShare > 0.05;
      if (gradientLength > 0.08) {
        shapeX = dx / gradientLength;
        shapeY = dy / gradientLength;
        shapeConfidence = largeAmbiguousObject
          ? clamp01(0.18 + gradientLength * 0.025)
          : clamp01(0.45 + gradientLength * 0.08);
      } else {
        const radialX = x - centroidX[label];
        const radialY = y - centroidY[label];
        const radialLength = Math.hypot(radialX, radialY);
        if (baseConfidence[label] < 0.34 && areaShare <= 0.05 && radialLength > 0.5) {
          shapeX = radialX / radialLength;
          shapeY = radialY / radialLength;
          shapeConfidence = 0.48;
        } else {
          shapeX = referenceX;
          shapeY = referenceY;
          shapeConfidence = 0.38;
        }
      }

      const aligned = alignDirection(shapeX, shapeY, referenceX, referenceY);
      const shapeAngle = Math.atan2(aligned.y, aligned.x);
      const baseAngle = Math.atan2(referenceY, referenceX);
      const shapeWeight = largeAmbiguousObject
        ? 0.24
        : 0.72 + (1 - baseConfidence[label]) * 0.16;
      const principalWeight = largeAmbiguousObject
        ? 0.42
        : 0.12 + baseConfidence[label] * 0.22;
      doubleX[index] =
        Math.cos(shapeAngle * 2) * shapeWeight +
        Math.cos(baseAngle * 2) * principalWeight;
      doubleY[index] =
        Math.sin(shapeAngle * 2) * shapeWeight +
        Math.sin(baseAngle * 2) * principalWeight;
      rawConfidence[index] = shapeConfidence;
    }
  }

  // Mask-aware smoothing creates curved but continuous thread columns. Double
  // angles prevent opposite directions on either side of a centerline from
  // cancelling even though they describe the same physical stitch orientation.
  for (let pass = 0; pass < SMOOTHING_PASSES; pass++) {
    const nextX = new Float32Array(total);
    const nextY = new Float32Array(total);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const label = labels[index];
        if (label === 0) continue;
        let sumX = doubleX[index] * 3;
        let sumY = doubleY[index] * 3;
        let weight = 3;
        for (let offsetY = -1; offsetY <= 1; offsetY++) {
          for (let offsetX = -1; offsetX <= 1; offsetX++) {
            if (offsetX === 0 && offsetY === 0) continue;
            const sampleX = x + offsetX;
            const sampleY = y + offsetY;
            if (sampleX < 0 || sampleY < 0 || sampleX >= width || sampleY >= height) continue;
            const sample = sampleY * width + sampleX;
            if (labels[sample] !== label) continue;
            const neighborWeight = offsetX === 0 || offsetY === 0 ? 1 : 0.707;
            sumX += doubleX[sample] * neighborWeight;
            sumY += doubleY[sample] * neighborWeight;
            weight += neighborWeight;
          }
        }
        nextX[index] = sumX / weight;
        nextY[index] = sumY / weight;
      }
    }
    doubleX = nextX;
    doubleY = nextY;
  }

  const tangentX = new Float32Array(total);
  const tangentY = new Float32Array(total);
  const confidence = new Float32Array(total);
  for (let index = 0; index < total; index++) {
    const label = labels[index];
    if (label === 0) continue;
    const strength = Math.hypot(doubleX[index], doubleY[index]);
    const angle = 0.5 * Math.atan2(doubleY[index], doubleX[index]);
    let x = Math.cos(angle);
    let y = Math.sin(angle);
    const aligned = alignDirection(x, y, baseX[label] || 1, baseY[label]);
    x = aligned.x;
    y = aligned.y;
    tangentX[index] = x;
    tangentY[index] = y;
    confidence[index] = clamp01(0.16 + rawConfidence[index] * 0.42 + strength * 0.3);
  }

  // Integrate the desired tangent/perpendicular gradients into continuous
  // scalar coordinates. Using x·direction independently at every pixel creates
  // phase jumps whenever the field turns; the Poisson relaxation below finds
  // the closest smooth coordinates to the full curved vector field.
  let rowCoordinate = new Float32Array(total);
  let longCoordinate = new Float32Array(total);
  const anchorIndex = new Int32Array(maximumLabel + 1);
  const anchorDistance = new Float32Array(maximumLabel + 1);
  anchorIndex.fill(-1);
  anchorDistance.fill(INF);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const label = labels[index];
      if (label === 0) continue;
      const offsetX = x - centroidX[label];
      const offsetY = y - centroidY[label];
      rowCoordinate[index] = offsetX * -baseY[label] + offsetY * baseX[label];
      longCoordinate[index] = offsetX * baseX[label] + offsetY * baseY[label];
      const centroidDistance = offsetX * offsetX + offsetY * offsetY;
      if (centroidDistance < anchorDistance[label]) {
        anchorDistance[label] = centroidDistance;
        anchorIndex[label] = index;
      }
    }
  }

  for (let pass = 0; pass < INTEGRATION_PASSES; pass++) {
    const nextRow = new Float32Array(rowCoordinate);
    const nextLong = new Float32Array(longCoordinate);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const label = labels[index];
        if (label === 0 || anchorIndex[label] === index) continue;

        const left = x > 0 && labels[index - 1] === label ? index - 1 : index;
        const right = x + 1 < width && labels[index + 1] === label ? index + 1 : index;
        const up = y > 0 && labels[index - width] === label ? index - width : index;
        const down = y + 1 < height && labels[index + width] === label ? index + width : index;
        let neighborCount = 0;
        let rowSum = 0;
        let longSum = 0;
        if (left !== index) {
          neighborCount++;
          rowSum += rowCoordinate[left];
          longSum += longCoordinate[left];
        }
        if (right !== index) {
          neighborCount++;
          rowSum += rowCoordinate[right];
          longSum += longCoordinate[right];
        }
        if (up !== index) {
          neighborCount++;
          rowSum += rowCoordinate[up];
          longSum += longCoordinate[up];
        }
        if (down !== index) {
          neighborCount++;
          rowSum += rowCoordinate[down];
          longSum += longCoordinate[down];
        }
        if (neighborCount < 2) continue;

        const rowDivergence =
          ((-tangentY[right]) - (-tangentY[left])) * 0.5 +
          (tangentX[down] - tangentX[up]) * 0.5;
        const longDivergence =
          (tangentX[right] - tangentX[left]) * 0.5 +
          (tangentY[down] - tangentY[up]) * 0.5;
        const solvedRow = (rowSum - rowDivergence) / neighborCount;
        const solvedLong = (longSum - longDivergence) / neighborCount;
        nextRow[index] = rowCoordinate[index] * 0.28 + solvedRow * 0.72;
        nextLong[index] = longCoordinate[index] * 0.28 + solvedLong * 0.72;
      }
    }
    rowCoordinate = nextRow;
    longCoordinate = nextLong;
  }

  const result: ObjectStitchFlow = {
    width,
    height,
    labels,
    tangentX,
    tangentY,
    confidence,
    centroidX,
    centroidY,
    rowCoordinate,
    longCoordinate,
    boundaryDistance
  };
  objectFlowCache.set(segmentation, result);
  return result;
};
