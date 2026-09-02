import type * as Ort from 'onnxruntime-web';

export interface LocalSegmentationObject {
  id: number;
  score: number;
  areaPx: number;
  bounds: { x: number; y: number; width: number; height: number };
  /** Long-axis direction of the detected object. */
  directionDegrees: number;
  /** 0 for circular/ambiguous geometry, 1 for a strongly directional object. */
  directionConfidence: number;
}

export interface LocalSegmentationResult {
  width: number;
  height: number;
  /** 0 means residual/unassigned artwork; positive values map to objects. */
  labels: Uint16Array;
  objects: LocalSegmentationObject[];
  foregroundCoverage: number;
  reliable: boolean;
  provider: 'MobileSAM ONNX';
}

export type SegmentationProgress = (message: string, progress: number) => void;

interface MaskCandidate {
  score: number;
  area: number;
  data: Uint8Array;
  bounds: { x: number; y: number; width: number; height: number };
  directionDegrees: number;
  directionConfidence: number;
}

const MODEL_DIMENSION = 1024;
const GRID_SIZE = 10;
const MINIMUM_SCORE = 0.72;
const MAXIMUM_OBJECTS = 32;

let runtimePromise: Promise<typeof Ort> | null = null;
let encoderSessionPromise: Promise<Ort.InferenceSession> | null = null;
let decoderSessionPromise: Promise<Ort.InferenceSession> | null = null;
const segmentationCache = new WeakMap<object, Promise<LocalSegmentationResult>>();
const segmentationUrlCache = new Map<string, Promise<LocalSegmentationResult>>();

const getModelUrl = (fileName: string) =>
  new URL(`models/mobilesam/${fileName}`, document.baseURI).toString();

const getRuntime = async () => {
  if (!runtimePromise) {
    runtimePromise = import('onnxruntime-web/wasm').then((runtime) => {
      // A single WASM thread works in both the Vite preview and packaged Electron
      // app without requiring cross-origin isolation headers.
      runtime.env.wasm.numThreads = 1;
      return runtime;
    });
  }
  return runtimePromise;
};

const getSessions = async (onProgress?: SegmentationProgress) => {
  const runtime = await getRuntime();
  if (!encoderSessionPromise) {
    onProgress?.('Loading local MobileSAM encoder…', 0.04);
    encoderSessionPromise = runtime.InferenceSession.create(
      getModelUrl('mobilesam.encoder.onnx'),
      { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }
    );
  }
  if (!decoderSessionPromise) {
    onProgress?.('Loading local MobileSAM mask decoder…', 0.08);
    decoderSessionPromise = runtime.InferenceSession.create(
      getModelUrl('mobilesam.decoder.quant.onnx'),
      { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }
    );
  }
  return {
    runtime,
    encoder: await encoderSessionPromise,
    decoder: await decoderSessionPromise
  };
};

const prepareImage = (source: HTMLImageElement | HTMLCanvasElement) => {
  const sourceWidth = source instanceof HTMLImageElement
    ? source.naturalWidth || source.width
    : source.width;
  const sourceHeight = source instanceof HTMLImageElement
    ? source.naturalHeight || source.height
    : source.height;
  const scale = MODEL_DIMENSION / Math.max(sourceWidth, sourceHeight);
  const width = Math.max(32, Math.round(sourceWidth * scale));
  const height = Math.max(32, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.clearRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  const rgba = context.getImageData(0, 0, width, height).data;
  const rgb = new Float32Array(width * height * 3);
  const foreground = new Uint8Array(width * height);
  let foregroundArea = 0;
  for (let pixel = 0; pixel < width * height; pixel++) {
    const rgbaIndex = pixel * 4;
    const rgbIndex = pixel * 3;
    const alpha = rgba[rgbaIndex + 3];
    if (alpha >= 24) {
      foreground[pixel] = 1;
      foregroundArea++;
    }
    // Transparent pixels are intentionally black. It creates a clean visual
    // boundary for the model and never alters the user's original artwork.
    const alphaScale = alpha / 255;
    rgb[rgbIndex] = rgba[rgbaIndex] * alphaScale;
    rgb[rgbIndex + 1] = rgba[rgbaIndex + 1] * alphaScale;
    rgb[rgbIndex + 2] = rgba[rgbaIndex + 2] * alphaScale;
  }
  return { width, height, rgb, foreground, foregroundArea };
};

const calculateGeometry = (mask: Uint8Array, width: number, height: number) => {
  let area = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumYY = 0;
  let sumXY = 0;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let index = 0; index < mask.length; index++) {
    if (!mask[index]) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    area++;
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumYY += y * y;
    sumXY += x * y;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (area === 0) {
    return {
      area: 0,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      directionDegrees: 0,
      directionConfidence: 0
    };
  }
  const meanX = sumX / area;
  const meanY = sumY / area;
  const covarianceXX = sumXX / area - meanX * meanX;
  const covarianceYY = sumYY / area - meanY * meanY;
  const covarianceXY = sumXY / area - meanX * meanY;
  const trace = covarianceXX + covarianceYY;
  const difference = covarianceXX - covarianceYY;
  const discriminant = Math.sqrt(Math.max(0, difference * difference + 4 * covarianceXY * covarianceXY));
  const directionRadians = 0.5 * Math.atan2(2 * covarianceXY, difference);
  return {
    area,
    bounds: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
    directionDegrees: ((directionRadians * 180) / Math.PI + 180) % 180,
    directionConfidence: trace > 0 ? Math.min(1, discriminant / trace) : 0
  };
};

const masksOverlap = (left: MaskCandidate, right: MaskCandidate) => {
  const leftRight = left.bounds.x + left.bounds.width;
  const rightRight = right.bounds.x + right.bounds.width;
  const leftBottom = left.bounds.y + left.bounds.height;
  const rightBottom = right.bounds.y + right.bounds.height;
  if (
    leftRight <= right.bounds.x ||
    rightRight <= left.bounds.x ||
    leftBottom <= right.bounds.y ||
    rightBottom <= left.bounds.y
  ) return false;

  let intersection = 0;
  for (let index = 0; index < left.data.length; index++) {
    if (left.data[index] && right.data[index]) intersection++;
  }
  const union = left.area + right.area - intersection;
  const iou = intersection / Math.max(1, union);
  const containment = intersection / Math.max(1, Math.min(left.area, right.area));
  const areaRatio = Math.max(left.area, right.area) / Math.max(1, Math.min(left.area, right.area));
  return iou > 0.72 || (containment > 0.92 && areaRatio < 2.5);
};

const buildLabelMap = (
  candidates: MaskCandidate[],
  foreground: Uint8Array,
  width: number,
  height: number,
  foregroundArea: number
) => {
  const labels = new Uint16Array(width * height);
  const objects: LocalSegmentationObject[] = [];
  let covered = 0;

  // Small confident masks claim their pixels first. Larger masks then fill the
  // surrounding object body without swallowing eyes, petals, letters, etc.
  const ordered = candidates.slice().sort((left, right) => left.area - right.area || right.score - left.score);
  for (const candidate of ordered) {
    const available: number[] = [];
    for (let index = 0; index < candidate.data.length; index++) {
      if (candidate.data[index] && foreground[index] && labels[index] === 0) available.push(index);
    }
    if (available.length < Math.max(48, foregroundArea * 0.0005)) continue;
    const id = objects.length + 1;
    for (const index of available) labels[index] = id;
    covered += available.length;
    objects.push({
      id,
      score: candidate.score,
      areaPx: available.length,
      bounds: candidate.bounds,
      directionDegrees: candidate.directionDegrees,
      directionConfidence: candidate.directionConfidence
    });
  }

  const foregroundCoverage = covered / Math.max(1, foregroundArea);
  return {
    width,
    height,
    labels,
    objects,
    foregroundCoverage,
    reliable: objects.length >= 4 && foregroundCoverage >= 0.18,
    provider: 'MobileSAM ONNX' as const
  };
};

const runSegmentation = async (
  source: HTMLImageElement | HTMLCanvasElement,
  onProgress?: SegmentationProgress
): Promise<LocalSegmentationResult> => {
  onProgress?.('Preparing artwork for local AI segmentation…', 0.01);
  const prepared = prepareImage(source);
  if (prepared.foregroundArea === 0) {
    return {
      width: prepared.width,
      height: prepared.height,
      labels: new Uint16Array(prepared.width * prepared.height),
      objects: [],
      foregroundCoverage: 0,
      reliable: false,
      provider: 'MobileSAM ONNX'
    };
  }

  const { runtime, encoder, decoder } = await getSessions(onProgress);
  onProgress?.('Encoding artwork locally…', 0.12);
  const input = new runtime.Tensor('float32', prepared.rgb, [prepared.height, prepared.width, 3]);
  const encoderOutput = await encoder.run({ input_image: input });
  const embedding = encoderOutput.image_embeddings;
  if (!embedding) throw new Error('MobileSAM encoder returned no image embedding.');

  const prompts: Array<{ x: number; y: number }> = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    const y = Math.min(prepared.height - 1, Math.round(((row + 0.5) * prepared.height) / GRID_SIZE));
    for (let column = 0; column < GRID_SIZE; column++) {
      const x = Math.min(prepared.width - 1, Math.round(((column + 0.5) * prepared.width) / GRID_SIZE));
      if (prepared.foreground[y * prepared.width + x]) prompts.push({ x, y });
    }
  }

  const maskInput = new runtime.Tensor('float32', new Float32Array(256 * 256), [1, 1, 256, 256]);
  const hasMaskInput = new runtime.Tensor('float32', new Float32Array([0]), [1]);
  const originalImageSize = new runtime.Tensor(
    'float32',
    new Float32Array([prepared.height, prepared.width]),
    [2]
  );
  const candidates: MaskCandidate[] = [];
  const minimumArea = Math.max(64, prepared.foregroundArea * 0.0008);
  const maximumArea = prepared.foregroundArea * 0.32;

  for (let promptIndex = 0; promptIndex < prompts.length; promptIndex++) {
    const point = prompts[promptIndex];
    const pointCoordinates = new runtime.Tensor(
      'float32',
      new Float32Array([point.x, point.y, 0, 0]),
      [1, 2, 2]
    );
    const pointLabels = new runtime.Tensor('float32', new Float32Array([1, -1]), [1, 2]);
    const output = await decoder.run({
      image_embeddings: embedding,
      point_coords: pointCoordinates,
      point_labels: pointLabels,
      mask_input: maskInput,
      has_mask_input: hasMaskInput,
      orig_im_size: originalImageSize
    });
    const maskTensor = output.masks;
    const scoreTensor = output.iou_predictions;
    if (!maskTensor || !scoreTensor) continue;
    const scores = scoreTensor.data as Float32Array;
    const score = scores[0] || 0;
    if (score < MINIMUM_SCORE) continue;
    const logits = maskTensor.data as Float32Array;
    const mask = new Uint8Array(prepared.width * prepared.height);
    for (let pixel = 0; pixel < mask.length; pixel++) {
      if (prepared.foreground[pixel] && logits[pixel] > 0) mask[pixel] = 1;
    }
    const geometry = calculateGeometry(mask, prepared.width, prepared.height);
    if (geometry.area < minimumArea || geometry.area > maximumArea) continue;
    candidates.push({
      score,
      area: geometry.area,
      data: mask,
      bounds: geometry.bounds,
      directionDegrees: geometry.directionDegrees,
      directionConfidence: geometry.directionConfidence
    });
    if (promptIndex % 4 === 0 || promptIndex === prompts.length - 1) {
      onProgress?.(
        `Detecting artwork objects locally (${promptIndex + 1}/${prompts.length})…`,
        0.2 + ((promptIndex + 1) / Math.max(1, prompts.length)) * 0.68
      );
      // Let React paint progress between groups of decoder calls.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  const accepted: MaskCandidate[] = [];
  for (const candidate of candidates.sort((left, right) => right.score - left.score)) {
    if (accepted.some((existing) => masksOverlap(candidate, existing))) continue;
    accepted.push(candidate);
    if (accepted.length >= MAXIMUM_OBJECTS) break;
  }
  onProgress?.('Building clean object map…', 0.94);
  const result = buildLabelMap(
    accepted,
    prepared.foreground,
    prepared.width,
    prepared.height,
    prepared.foregroundArea
  );
  onProgress?.(
    result.reliable
      ? `Local AI separated ${result.objects.length} artwork objects.`
      : 'Local AI confidence was low; Raven will use its safe surface fallback.',
    1
  );
  return result;
};

/**
 * Run MobileSAM fully on-device. The result is cached per loaded source image,
 * so changing stitch controls never repeats the expensive encoder pass.
 */
export const segmentArtworkLocally = (
  source: HTMLImageElement | HTMLCanvasElement,
  onProgress?: SegmentationProgress
) => {
  const cacheKey = source as object;
  const sourceUrl = source instanceof HTMLImageElement ? source.src : '';
  const cachedByUrl = sourceUrl ? segmentationUrlCache.get(sourceUrl) : undefined;
  if (cachedByUrl) {
    onProgress?.('Using cached local object map…', 1);
    return cachedByUrl;
  }
  const cached = segmentationCache.get(cacheKey);
  if (cached) {
    onProgress?.('Using cached local object map…', 1);
    return cached;
  }
  const task = runSegmentation(source, onProgress).catch((error) => {
    segmentationCache.delete(cacheKey);
    if (sourceUrl) segmentationUrlCache.delete(sourceUrl);
    throw error;
  });
  segmentationCache.set(cacheKey, task);
  if (sourceUrl) segmentationUrlCache.set(sourceUrl, task);
  return task;
};
