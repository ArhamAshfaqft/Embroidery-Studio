import { BorderType, EmbroiderySettings } from '../types';
import type { LocalSegmentationResult } from './localSegmentation';

export type PlannedStitchType = 'running' | 'satin' | 'tatami' | 'border';
export type StitchCommandType = 'stitch' | 'jump' | 'trim' | 'color-change';

export interface StitchPoint {
  x: number;
  y: number;
}

export interface StitchCommand extends StitchPoint {
  type: StitchCommandType;
  regionId: number;
  color: string;
  stitchType: PlannedStitchType;
  underlay: boolean;
}

export interface PlannedRegion {
  id: number;
  color: string;
  areaPx: number;
  centroid: StitchPoint;
  bounds: { x: number; y: number; width: number; height: number };
  contours: StitchPoint[][];
  holes: StitchPoint[][];
  centerlines: StitchPoint[][];
  stitchType: PlannedStitchType;
  directionDegrees: number;
  estimatedWidthMm: number;
}

export interface StitchPlan {
  width: number;
  height: number;
  analysisWidth: number;
  analysisHeight: number;
  millimetersPerAnalysisPixel: number;
  regions: PlannedRegion[];
  commands: StitchCommand[];
  colorCount: number;
  stitchCount: number;
  jumpCount: number;
  trimCount: number;
  sourceKind: 'raster' | 'vector' | 'ai-raster';
}

interface PaletteColor {
  r: number;
  g: number;
  b: number;
  count: number;
}

interface Component {
  paletteIndex: number;
  pixels: number[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  color: string;
}

interface RegionWork {
  region: PlannedRegion;
  mask: Uint8Array;
  maskWidth: number;
  maskHeight: number;
  offsetX: number;
  offsetY: number;
  sequences: Array<{ points: StitchPoint[]; type: PlannedStitchType; underlay: boolean }>;
}

const MAX_ANALYSIS_DIMENSION = 512;
const VECTOR_ANALYSIS_DIMENSION = 768;
const ALPHA_THRESHOLD = 24;
const INF = 1_000_000;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const pointKey = (x: number, y: number, stride: number) => y * stride + x;

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;

const colorDistanceSquared = (r: number, g: number, b: number, color: PaletteColor) => {
  const dr = r - color.r;
  const dg = g - color.g;
  const db = b - color.b;
  return dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
};

const distance = (a: StitchPoint, b: StitchPoint) => Math.hypot(a.x - b.x, a.y - b.y);

const polygonArea = (points: StitchPoint[]) => {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area * 0.5;
};

const polylineLength = (points: StitchPoint[], closed = false) => {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i]);
  if (closed && points.length > 2) total += distance(points[points.length - 1], points[0]);
  return total;
};

const perpendicularDistance = (point: StitchPoint, start: StitchPoint, end: StitchPoint) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(point, start);
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return distance(point, { x: start.x + t * dx, y: start.y + t * dy });
};

const simplifyOpenPolyline = (points: StitchPoint[], tolerance: number): StitchPoint[] => {
  if (points.length <= 2) return points.slice();
  let greatestDistance = 0;
  let splitIndex = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const candidate = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (candidate > greatestDistance) {
      greatestDistance = candidate;
      splitIndex = i;
    }
  }
  if (greatestDistance <= tolerance) return [points[0], points[points.length - 1]];
  const left = simplifyOpenPolyline(points.slice(0, splitIndex + 1), tolerance);
  const right = simplifyOpenPolyline(points.slice(splitIndex), tolerance);
  return left.slice(0, -1).concat(right);
};

const simplifyClosedContour = (points: StitchPoint[], tolerance = 0.65) => {
  if (points.length < 6) return points;
  const anchor = points.reduce((best, point, index) =>
    point.x < points[best].x || (point.x === points[best].x && point.y < points[best].y) ? index : best, 0);
  const rotated = points.slice(anchor).concat(points.slice(0, anchor));
  const open = rotated.concat([rotated[0]]);
  const simplified = simplifyOpenPolyline(open, tolerance);
  if (simplified.length > 1 && distance(simplified[0], simplified[simplified.length - 1]) < 0.001) {
    simplified.pop();
  }
  return simplified.length >= 3 ? simplified : points;
};

const resamplePolyline = (points: StitchPoint[], spacing: number, closed = false) => {
  if (points.length < 2) return points.slice();
  const source = closed ? points.concat([points[0]]) : points;
  const result: StitchPoint[] = [{ ...source[0] }];
  let carried = 0;
  for (let i = 1; i < source.length; i++) {
    let start = { ...source[i - 1] };
    const end = source[i];
    let segmentLength = distance(start, end);
    if (segmentLength < 0.0001) continue;
    while (carried + segmentLength >= spacing) {
      const needed = spacing - carried;
      const ratio = needed / segmentLength;
      start = {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio
      };
      result.push({ ...start });
      segmentLength = distance(start, end);
      carried = 0;
      if (segmentLength < 0.0001) break;
    }
    carried += segmentLength;
  }
  if (!closed && distance(result[result.length - 1], source[source.length - 1]) > spacing * 0.25) {
    result.push({ ...source[source.length - 1] });
  }
  return result;
};

const downsamplePixels = (
  pixels: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  maximumDimension: number
) => {
  const scale = Math.min(1, maximumDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(2, Math.round(sourceWidth * scale));
  const height = Math.max(2, Math.round(sourceHeight * scale));
  const output = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sourceY = Math.min(sourceHeight - 1, Math.floor(((y + 0.5) * sourceHeight) / height));
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor(((x + 0.5) * sourceWidth) / width));
      const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
      const targetIndex = (y * width + x) * 4;
      output[targetIndex] = pixels[sourceIndex];
      output[targetIndex + 1] = pixels[sourceIndex + 1];
      output[targetIndex + 2] = pixels[sourceIndex + 2];
      output[targetIndex + 3] = pixels[sourceIndex + 3];
    }
  }
  return { pixels: output, width, height };
};

const decodeSvgDataUrl = (sourceUrl: string) => {
  const comma = sourceUrl.indexOf(',');
  if (comma < 0) return '';
  const metadata = sourceUrl.slice(0, comma);
  const payload = sourceUrl.slice(comma + 1);
  try {
    return metadata.includes(';base64') ? atob(payload) : decodeURIComponent(payload);
  } catch {
    return '';
  }
};

const numberAttribute = (element: Element, name: string, fallback = 0) => {
  const value = Number.parseFloat(element.getAttribute(name) || '');
  return Number.isFinite(value) ? value : fallback;
};

const styleValue = (element: Element, property: string) => {
  const direct = element.getAttribute(property);
  if (direct !== null) return direct;
  const style = element.getAttribute('style') || '';
  const match = style.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'i'));
  return match ? match[1].trim() : null;
};

const applyTransformList = (context: CanvasRenderingContext2D, transform: string) => {
  const expression = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(transform))) {
    const operation = match[1].toLowerCase();
    const values = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (operation === 'matrix' && values.length >= 6) context.transform(values[0], values[1], values[2], values[3], values[4], values[5]);
    else if (operation === 'translate') context.translate(values[0] || 0, values[1] || 0);
    else if (operation === 'scale') context.scale(values[0] ?? 1, values[1] ?? values[0] ?? 1);
    else if (operation === 'rotate') {
      const radians = ((values[0] || 0) * Math.PI) / 180;
      if (values.length >= 3) {
        context.translate(values[1], values[2]);
        context.rotate(radians);
        context.translate(-values[1], -values[2]);
      } else context.rotate(radians);
    } else if (operation === 'skewx') context.transform(1, 0, Math.tan(((values[0] || 0) * Math.PI) / 180), 1, 0, 0);
    else if (operation === 'skewy') context.transform(1, Math.tan(((values[0] || 0) * Math.PI) / 180), 0, 1, 0, 0);
  }
};

const applyElementTransforms = (context: CanvasRenderingContext2D, element: Element) => {
  const chain: Element[] = [];
  let current: Element | null = element;
  while (current && current.tagName.toLowerCase() !== 'svg') {
    chain.unshift(current);
    current = current.parentElement;
  }
  for (const node of chain) {
    const transform = node.getAttribute('transform');
    if (transform) applyTransformList(context, transform);
  }
};

const pathForSvgElement = (element: Element) => {
  if (typeof Path2D === 'undefined') return null;
  const tag = element.tagName.toLowerCase();
  const path = new Path2D();
  if (tag === 'path') {
    const data = element.getAttribute('d');
    return data ? new Path2D(data) : null;
  }
  if (tag === 'rect') {
    path.rect(
      numberAttribute(element, 'x'),
      numberAttribute(element, 'y'),
      numberAttribute(element, 'width'),
      numberAttribute(element, 'height')
    );
    return path;
  }
  if (tag === 'circle' || tag === 'ellipse') {
    const cx = numberAttribute(element, 'cx');
    const cy = numberAttribute(element, 'cy');
    const rx = tag === 'circle' ? numberAttribute(element, 'r') : numberAttribute(element, 'rx');
    const ry = tag === 'circle' ? rx : numberAttribute(element, 'ry');
    path.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
    return path;
  }
  if (tag === 'line') {
    path.moveTo(numberAttribute(element, 'x1'), numberAttribute(element, 'y1'));
    path.lineTo(numberAttribute(element, 'x2'), numberAttribute(element, 'y2'));
    return path;
  }
  if (tag === 'polygon' || tag === 'polyline') {
    const values = (element.getAttribute('points') || '')
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (values.length < 4) return null;
    path.moveTo(values[0], values[1]);
    for (let index = 2; index + 1 < values.length; index += 2) path.lineTo(values[index], values[index + 1]);
    if (tag === 'polygon') path.closePath();
    return path;
  }
  return null;
};

/**
 * Preserve SVG element boundaries by rasterizing each original geometry object
 * independently. The planner therefore never merges adjacent same-color SVG
 * objects, and all transforms, holes, fills, and strokes remain attributable to
 * their source vector element.
 */
const extractSvgComponents = (
  sourceUrl: string,
  sampledPixels: Uint8ClampedArray,
  analysisWidth: number,
  analysisHeight: number,
  minimumArea: number
): Component[] | null => {
  if (typeof DOMParser === 'undefined' || typeof document === 'undefined') return null;
  const svgText = decodeSvgDataUrl(sourceUrl);
  if (!svgText) return null;
  const xml = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = xml.documentElement;
  if (!root || root.tagName.toLowerCase() !== 'svg' || xml.querySelector('parsererror')) return null;
  const viewBoxValues = (root.getAttribute('viewBox') || '')
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  const viewX = viewBoxValues.length === 4 ? viewBoxValues[0] : 0;
  const viewY = viewBoxValues.length === 4 ? viewBoxValues[1] : 0;
  const viewWidth = viewBoxValues.length === 4 ? viewBoxValues[2] : numberAttribute(root, 'width', analysisWidth);
  const viewHeight = viewBoxValues.length === 4 ? viewBoxValues[3] : numberAttribute(root, 'height', analysisHeight);
  if (!viewWidth || !viewHeight) return null;
  const elements = Array.from(root.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line'));
  const components: Component[] = [];

  for (let elementIndex = 0; elementIndex < elements.length; elementIndex++) {
    const element = elements[elementIndex];
    if (styleValue(element, 'display') === 'none' || styleValue(element, 'visibility') === 'hidden') continue;
    const path = pathForSvgElement(element);
    if (!path) continue;
    const canvas = document.createElement('canvas');
    canvas.width = analysisWidth;
    canvas.height = analysisHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) continue;
    context.save();
    context.scale(analysisWidth / viewWidth, analysisHeight / viewHeight);
    context.translate(-viewX, -viewY);
    applyElementTransforms(context, element);
    const fill = styleValue(element, 'fill');
    const stroke = styleValue(element, 'stroke');
    const tag = element.tagName.toLowerCase();
    if (fill !== 'none' && tag !== 'line' && tag !== 'polyline') {
      context.fillStyle = '#ffffff';
      context.fill(path, styleValue(element, 'fill-rule') === 'evenodd' ? 'evenodd' : 'nonzero');
    }
    if (stroke && stroke !== 'none' || tag === 'line' || tag === 'polyline') {
      context.strokeStyle = '#ffffff';
      context.lineWidth = numberAttribute(element, 'stroke-width', 1);
      context.lineCap = (styleValue(element, 'stroke-linecap') as CanvasLineCap) || 'round';
      context.lineJoin = (styleValue(element, 'stroke-linejoin') as CanvasLineJoin) || 'round';
      context.stroke(path);
    }
    context.restore();
    const alpha = context.getImageData(0, 0, analysisWidth, analysisHeight).data;
    const objectPixels: number[] = [];
    let minX = analysisWidth;
    let minY = analysisHeight;
    let maxX = 0;
    let maxY = 0;
    let red = 0;
    let green = 0;
    let blue = 0;
    for (let pixel = 0; pixel < analysisWidth * analysisHeight; pixel++) {
      if (alpha[pixel * 4 + 3] < ALPHA_THRESHOLD) continue;
      const sourceAlpha = sampledPixels[pixel * 4 + 3];
      if (sourceAlpha < ALPHA_THRESHOLD) continue;
      objectPixels.push(pixel);
      const x = pixel % analysisWidth;
      const y = Math.floor(pixel / analysisWidth);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      red += sampledPixels[pixel * 4];
      green += sampledPixels[pixel * 4 + 1];
      blue += sampledPixels[pixel * 4 + 2];
    }
    if (objectPixels.length >= minimumArea) {
      components.push({
        paletteIndex: elementIndex,
        pixels: objectPixels,
        minX,
        minY,
        maxX,
        maxY,
        color: rgbToHex(red / objectPixels.length, green / objectPixels.length, blue / objectPixels.length)
      });
    }
  }
  return components.length > 0 ? components : null;
};

const buildPalette = (pixels: Uint8ClampedArray, maximumColors: number) => {
  const histogram = new Map<number, { r: number; g: number; b: number; count: number }>();
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < ALPHA_THRESHOLD) continue;
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bucket = histogram.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count++;
    } else {
      histogram.set(key, { r, g, b, count: 1 });
    }
  }

  const candidates = Array.from(histogram.values())
    .map((bucket) => ({
      r: bucket.r / bucket.count,
      g: bucket.g / bucket.count,
      b: bucket.b / bucket.count,
      count: bucket.count
    }))
    .sort((a, b) => b.count - a.count);

  const palette: PaletteColor[] = [];
  for (const candidate of candidates) {
    if (palette.length >= maximumColors) break;
    const nearest = palette.reduce((best, color) => Math.min(best, colorDistanceSquared(candidate.r, candidate.g, candidate.b, color)), INF);
    // Thread palettes should consolidate near-identical antialiased shades. A
    // looser threshold prevents one painted edge from becoming many tiny stitch
    // objects while preserving visibly different thread colors.
    if (nearest > 40 * 40 || palette.length < Math.min(4, maximumColors)) palette.push(candidate);
  }
  return palette.length > 0 ? palette : [{ r: 127, g: 127, b: 127, count: 1 }];
};

const assignPaletteLabels = (pixels: Uint8ClampedArray, palette: PaletteColor[]) => {
  const labels = new Int16Array(pixels.length / 4);
  labels.fill(-1);
  for (let pixel = 0; pixel < labels.length; pixel++) {
    const index = pixel * 4;
    if (pixels[index + 3] < ALPHA_THRESHOLD) continue;
    let bestIndex = 0;
    let bestDistance = INF;
    for (let colorIndex = 0; colorIndex < palette.length; colorIndex++) {
      const candidate = colorDistanceSquared(pixels[index], pixels[index + 1], pixels[index + 2], palette[colorIndex]);
      if (candidate < bestDistance) {
        bestDistance = candidate;
        bestIndex = colorIndex;
      }
    }
    labels[pixel] = bestIndex;
  }
  return labels;
};

const combineObjectAndPaletteLabels = (
  paletteLabels: Int16Array,
  sampledWidth: number,
  sampledHeight: number,
  paletteSize: number,
  segmentation: LocalSegmentationResult
) => {
  const labels = new Int16Array(paletteLabels.length);
  labels.fill(-1);
  for (let y = 0; y < sampledHeight; y++) {
    const segmentationY = Math.min(
      segmentation.height - 1,
      Math.floor(((y + 0.5) * segmentation.height) / sampledHeight)
    );
    for (let x = 0; x < sampledWidth; x++) {
      const index = y * sampledWidth + x;
      const paletteLabel = paletteLabels[index];
      if (paletteLabel < 0) continue;
      const segmentationX = Math.min(
        segmentation.width - 1,
        Math.floor(((x + 0.5) * segmentation.width) / sampledWidth)
      );
      const objectLabel = segmentation.labels[segmentationY * segmentation.width + segmentationX];
      // Keep residual pixels grouped by their color while making every AI
      // object/color pair a distinct connected-component namespace.
      labels[index] = objectLabel * paletteSize + paletteLabel;
    }
  }
  return labels;
};

const cleanPaletteLabels = (source: Int16Array, width: number, height: number) => {
  let current = new Int16Array(source);
  for (let pass = 0; pass < 2; pass++) {
    const next = new Int16Array(current);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x;
        if (current[index] < 0) continue;
        const counts = new Map<number, number>();
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const label = current[(y + oy) * width + x + ox];
            if (label >= 0) counts.set(label, (counts.get(label) || 0) + 1);
          }
        }
        let bestLabel = current[index];
        let bestCount = counts.get(bestLabel) || 0;
        for (const [label, count] of counts) {
          if (count > bestCount) {
            bestLabel = label;
            bestCount = count;
          }
        }
        if (bestLabel !== current[index] && bestCount >= 6) next[index] = bestLabel;
      }
    }
    current = next;
  }
  return current;
};

const mergeSmallLabelFragments = (source: Int16Array, width: number, height: number, threshold: number) => {
  const labels = new Int16Array(source);
  const visited = new Uint8Array(labels.length);
  const queue = new Int32Array(labels.length);
  for (let start = 0; start < labels.length; start++) {
    if (visited[start] || labels[start] < 0) continue;
    const sourceLabel = labels[start];
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    const pixels: number[] = [];
    const neighboringLabels = new Map<number, number>();
    while (head < tail) {
      const pixel = queue[head++];
      pixels.push(pixel);
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          const nextLabel = labels[next];
          if (nextLabel === sourceLabel && !visited[next]) {
            visited[next] = 1;
            queue[tail++] = next;
          } else if (nextLabel >= 0 && nextLabel !== sourceLabel) {
            neighboringLabels.set(nextLabel, (neighboringLabels.get(nextLabel) || 0) + 1);
          }
        }
      }
    }
    if (pixels.length >= threshold || neighboringLabels.size === 0) continue;
    let replacement = sourceLabel;
    let strongestBoundary = 0;
    for (const [label, count] of neighboringLabels) {
      if (count > strongestBoundary) {
        replacement = label;
        strongestBoundary = count;
      }
    }
    for (const pixel of pixels) labels[pixel] = replacement;
  }
  return labels;
};

const findComponents = (
  labels: Int16Array,
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  minimumArea: number
) => {
  const visited = new Uint8Array(labels.length);
  const queue = new Int32Array(labels.length);
  const components: Component[] = [];
  for (let start = 0; start < labels.length; start++) {
    if (visited[start] || labels[start] < 0) continue;
    const paletteIndex = labels[start];
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    const componentPixels: number[] = [];
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let red = 0;
    let green = 0;
    let blue = 0;

    while (head < tail) {
      const pixel = queue[head++];
      componentPixels.push(pixel);
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      const sourceIndex = pixel * 4;
      red += pixels[sourceIndex];
      green += pixels[sourceIndex + 1];
      blue += pixels[sourceIndex + 2];

      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (visited[next] || labels[next] !== paletteIndex) continue;
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }

    if (componentPixels.length >= minimumArea) {
      components.push({
        paletteIndex,
        pixels: componentPixels,
        minX,
        minY,
        maxX,
        maxY,
        color: rgbToHex(red / componentPixels.length, green / componentPixels.length, blue / componentPixels.length)
      });
    }
  }
  return components.sort((a, b) => b.pixels.length - a.pixels.length);
};

const buildLocalMask = (component: Component, sourceWidth: number) => {
  const padding = 2;
  const offsetX = component.minX - padding;
  const offsetY = component.minY - padding;
  const width = component.maxX - component.minX + 1 + padding * 2;
  const height = component.maxY - component.minY + 1 + padding * 2;
  const mask = new Uint8Array(width * height);
  for (const pixel of component.pixels) {
    const globalX = pixel % sourceWidth;
    const globalY = Math.floor(pixel / sourceWidth);
    const localX = globalX - offsetX;
    const localY = globalY - offsetY;
    mask[localY * width + localX] = 1;
  }
  return { mask, width, height, offsetX, offsetY };
};

const traceContours = (mask: Uint8Array, width: number, height: number, offsetX: number, offsetY: number) => {
  const vertexStride = width + 1;
  const edges: Array<{ start: number; end: number; used: boolean }> = [];
  const outgoing = new Map<number, number[]>();
  const addEdge = (startX: number, startY: number, endX: number, endY: number) => {
    const edgeIndex = edges.length;
    const start = pointKey(startX, startY, vertexStride);
    const end = pointKey(endX, endY, vertexStride);
    edges.push({ start, end, used: false });
    const list = outgoing.get(start) || [];
    list.push(edgeIndex);
    outgoing.set(start, list);
  };
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!filled(x, y)) continue;
      if (!filled(x, y - 1)) addEdge(x, y, x + 1, y);
      if (!filled(x + 1, y)) addEdge(x + 1, y, x + 1, y + 1);
      if (!filled(x, y + 1)) addEdge(x + 1, y + 1, x, y + 1);
      if (!filled(x - 1, y)) addEdge(x, y + 1, x, y);
    }
  }

  const loops: StitchPoint[][] = [];
  for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
    if (edges[edgeIndex].used) continue;
    const loop: StitchPoint[] = [];
    const firstVertex = edges[edgeIndex].start;
    let currentEdgeIndex = edgeIndex;
    let safety = 0;
    while (safety++ < edges.length + 4) {
      const edge = edges[currentEdgeIndex];
      if (edge.used) break;
      edge.used = true;
      const x = edge.start % vertexStride;
      const y = Math.floor(edge.start / vertexStride);
      loop.push({ x: x + offsetX, y: y + offsetY });
      if (edge.end === firstVertex) break;
      const candidates = outgoing.get(edge.end) || [];
      const next = candidates.find((candidate) => !edges[candidate].used);
      if (next === undefined) break;
      currentEdgeIndex = next;
    }
    if (loop.length >= 3) loops.push(simplifyClosedContour(loop));
  }
  return loops.sort((a, b) => Math.abs(polygonArea(b)) - Math.abs(polygonArea(a)));
};

const distanceTransform = (mask: Uint8Array, width: number, height: number) => {
  const distances = new Float32Array(mask.length);
  for (let index = 0; index < mask.length; index++) distances[index] = mask[index] ? INF : 0;
  const diagonal = Math.SQRT2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (!mask[index]) continue;
      let value = distances[index];
      if (x > 0) value = Math.min(value, distances[index - 1] + 1);
      if (y > 0) value = Math.min(value, distances[index - width] + 1);
      if (x > 0 && y > 0) value = Math.min(value, distances[index - width - 1] + diagonal);
      if (x + 1 < width && y > 0) value = Math.min(value, distances[index - width + 1] + diagonal);
      distances[index] = value;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const index = y * width + x;
      if (!mask[index]) continue;
      let value = distances[index];
      if (x + 1 < width) value = Math.min(value, distances[index + 1] + 1);
      if (y + 1 < height) value = Math.min(value, distances[index + width] + 1);
      if (x + 1 < width && y + 1 < height) value = Math.min(value, distances[index + width + 1] + diagonal);
      if (x > 0 && y + 1 < height) value = Math.min(value, distances[index + width - 1] + diagonal);
      distances[index] = value;
    }
  }
  return distances;
};

const skeletonize = (sourceMask: Uint8Array, width: number, height: number) => {
  const mask = new Uint8Array(sourceMask);
  const transitions = (neighbors: number[]) => {
    let count = 0;
    for (let i = 0; i < neighbors.length; i++) if (neighbors[i] === 0 && neighbors[(i + 1) % neighbors.length] === 1) count++;
    return count;
  };
  let changed = true;
  let iteration = 0;
  while (changed && iteration++ < 64) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      const remove: number[] = [];
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const index = y * width + x;
          if (!mask[index]) continue;
          const p2 = mask[index - width];
          const p3 = mask[index - width + 1];
          const p4 = mask[index + 1];
          const p5 = mask[index + width + 1];
          const p6 = mask[index + width];
          const p7 = mask[index + width - 1];
          const p8 = mask[index - 1];
          const p9 = mask[index - width - 1];
          const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9];
          const count = neighbors.reduce((sum, value) => sum + value, 0);
          if (count < 2 || count > 6 || transitions(neighbors) !== 1) continue;
          const firstCondition = pass === 0 ? p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0 : p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0;
          if (firstCondition) remove.push(index);
        }
      }
      if (remove.length > 0) changed = true;
      for (const index of remove) mask[index] = 0;
    }
  }
  return mask;
};

const skeletonChains = (skeleton: Uint8Array, width: number, height: number, offsetX: number, offsetY: number) => {
  const active = new Set<number>();
  for (let index = 0; index < skeleton.length; index++) if (skeleton[index]) active.add(index);
  const neighborsOf = (index: number) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const neighbors: number[] = [];
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue;
        const nx = x + ox;
        const ny = y + oy;
        const candidate = ny * width + nx;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && active.has(candidate)) neighbors.push(candidate);
      }
    }
    return neighbors;
  };
  const unvisited = new Set(active);
  const chains: StitchPoint[][] = [];
  const endpoints = Array.from(active).filter((index) => neighborsOf(index).length <= 1);
  const starts = endpoints.concat(Array.from(active));
  for (const start of starts) {
    if (!unvisited.has(start)) continue;
    const chain: StitchPoint[] = [];
    let current = start;
    let previous = -1;
    while (unvisited.has(current)) {
      unvisited.delete(current);
      chain.push({ x: (current % width) + offsetX + 0.5, y: Math.floor(current / width) + offsetY + 0.5 });
      const candidates = neighborsOf(current).filter((candidate) => candidate !== previous && unvisited.has(candidate));
      if (candidates.length === 0) break;
      const next = candidates[0];
      previous = current;
      current = next;
    }
    if (chain.length >= 2) chains.push(simplifyOpenPolyline(chain, 0.45));
  }
  return chains.sort((a, b) => polylineLength(b) - polylineLength(a));
};

const principalDirection = (component: Component, sourceWidth: number) => {
  let centerX = 0;
  let centerY = 0;
  for (const pixel of component.pixels) {
    centerX += pixel % sourceWidth;
    centerY += Math.floor(pixel / sourceWidth);
  }
  centerX /= component.pixels.length;
  centerY /= component.pixels.length;
  let mu20 = 0;
  let mu02 = 0;
  let mu11 = 0;
  for (const pixel of component.pixels) {
    const dx = (pixel % sourceWidth) - centerX;
    const dy = Math.floor(pixel / sourceWidth) - centerY;
    mu20 += dx * dx;
    mu02 += dy * dy;
    mu11 += dx * dy;
  }
  const angle = 0.5 * Math.atan2(2 * mu11, mu20 - mu02);
  return { centerX, centerY, angle };
};

const classifyRegion = (maximumDistance: number, area: number, bounds: Component, millimetersPerPixel: number) => {
  const widthMm = maximumDistance * 2 * millimetersPerPixel;
  const boxWidth = bounds.maxX - bounds.minX + 1;
  const boxHeight = bounds.maxY - bounds.minY + 1;
  const aspect = Math.max(boxWidth, boxHeight) / Math.max(1, Math.min(boxWidth, boxHeight));
  const areaMm = area * millimetersPerPixel * millimetersPerPixel;
  let stitchType: PlannedStitchType;
  if (widthMm < 1.15 || areaMm < 1.2) stitchType = 'running';
  else if (widthMm <= 6.5 || (widthMm <= 9 && aspect > 2.25)) stitchType = 'satin';
  else stitchType = 'tatami';
  return { stitchType, widthMm };
};

const maskContains = (work: RegionWork, point: StitchPoint) => {
  const x = Math.floor(point.x - work.offsetX);
  const y = Math.floor(point.y - work.offsetY);
  return x >= 0 && y >= 0 && x < work.maskWidth && y < work.maskHeight && work.mask[y * work.maskWidth + x] === 1;
};

const castToBoundary = (work: RegionWork, origin: StitchPoint, dx: number, dy: number, direction: number) => {
  let last = { ...origin };
  const maximum = Math.max(work.maskWidth, work.maskHeight);
  for (let step = 0.4; step <= maximum; step += 0.4) {
    const candidate = { x: origin.x + dx * step * direction, y: origin.y + dy * step * direction };
    if (!maskContains(work, candidate)) break;
    last = candidate;
  }
  return last;
};

const createRunningSequences = (work: RegionWork, stitchLengthPixels: number) => {
  const outer = work.region.contours[0];
  if (!outer) return;
  work.sequences.push({
    points: resamplePolyline(outer, Math.max(0.75, stitchLengthPixels), true),
    type: 'running',
    underlay: false
  });
};

const createSatinSequences = (work: RegionWork, rowSpacingPixels: number, stitchLengthPixels: number) => {
  const centerlines = work.region.centerlines
    .filter((line) => line.length >= 2 && polylineLength(line) >= Math.max(2, rowSpacingPixels * 1.4))
    .slice(0, 16);
  if (centerlines.length === 0) {
    createRunningSequences(work, stitchLengthPixels);
    return;
  }
  for (const centerline of centerlines) {
    const underlayCenterline = resamplePolyline(centerline, Math.max(1.2, stitchLengthPixels));
    const sampledCenterline = resamplePolyline(centerline, Math.max(0.65, rowSpacingPixels * 0.72));
    work.sequences.push({ points: underlayCenterline, type: 'running', underlay: true });
    const satinPoints: StitchPoint[] = [];
    for (let i = 0; i < sampledCenterline.length; i++) {
      const previous = sampledCenterline[Math.max(0, i - 1)];
      const next = sampledCenterline[Math.min(sampledCenterline.length - 1, i + 1)];
      const tangentLength = Math.hypot(next.x - previous.x, next.y - previous.y) || 1;
      const normalX = -(next.y - previous.y) / tangentLength;
      const normalY = (next.x - previous.x) / tangentLength;
      const left = castToBoundary(work, sampledCenterline[i], normalX, normalY, 1);
      const right = castToBoundary(work, sampledCenterline[i], normalX, normalY, -1);
      if (distance(left, right) >= 0.75) satinPoints.push(left, right);
    }
    if (satinPoints.length >= 4) work.sequences.push({ points: satinPoints, type: 'satin', underlay: false });
  }
};

const createTatamiSequences = (
  work: RegionWork,
  directionRadians: number,
  rowSpacingPixels: number,
  stitchLengthPixels: number
) => {
  const tangent = { x: Math.cos(directionRadians), y: Math.sin(directionRadians) };
  const normal = { x: -tangent.y, y: tangent.x };
  const bounds = work.region.bounds;
  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x, y: bounds.y + bounds.height },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
  ];
  const tangentValues = corners.map((point) => point.x * tangent.x + point.y * tangent.y);
  const normalValues = corners.map((point) => point.x * normal.x + point.y * normal.y);
  const tangentMin = Math.min(...tangentValues) - 2;
  const tangentMax = Math.max(...tangentValues) + 2;
  const normalMin = Math.min(...normalValues);
  const normalMax = Math.max(...normalValues);
  let reverse = false;

  const outer = work.region.contours[0];
  if (outer) {
    work.sequences.push({
      points: resamplePolyline(outer, Math.max(1.2, stitchLengthPixels * 1.3), true),
      type: 'running',
      underlay: true
    });
  }

  for (let row = normalMin; row <= normalMax; row += Math.max(0.7, rowSpacingPixels)) {
    let runStart: StitchPoint | null = null;
    let previousInside: StitchPoint | null = null;
    for (let coordinate = tangentMin; coordinate <= tangentMax; coordinate += 0.5) {
      const point = {
        x: tangent.x * coordinate + normal.x * row,
        y: tangent.y * coordinate + normal.y * row
      };
      const inside = maskContains(work, point);
      if (inside && !runStart) runStart = point;
      if (inside) previousInside = point;
      if ((!inside || coordinate + 0.5 > tangentMax) && runStart && previousInside) {
        const segment = resamplePolyline([runStart, previousInside], Math.max(0.8, stitchLengthPixels));
        if (segment.length >= 2) {
          if (reverse) segment.reverse();
          work.sequences.push({ points: segment, type: 'tatami', underlay: false });
          reverse = !reverse;
        }
        runStart = null;
        previousInside = null;
      }
    }
  }
};

const addBorderSequence = (work: RegionWork, borderType: BorderType, stitchLengthPixels: number) => {
  if (borderType === 'none' || !work.region.contours[0]) return;
  const spacing = borderType === 'running' ? stitchLengthPixels : Math.max(0.7, stitchLengthPixels * 0.45);
  work.sequences.push({
    points: resamplePolyline(work.region.contours[0], spacing, true),
    type: 'border',
    underlay: false
  });
};

const appendTie = (
  commands: StitchCommand[],
  point: StitchPoint,
  nextPoint: StitchPoint,
  base: Omit<StitchCommand, 'x' | 'y' | 'type'>
) => {
  const dx = nextPoint.x - point.x;
  const dy = nextPoint.y - point.y;
  const length = Math.hypot(dx, dy) || 1;
  const stepX = (dx / length) * 0.35;
  const stepY = (dy / length) * 0.35;
  commands.push({ ...point, ...base, type: 'stitch' });
  commands.push({ x: point.x + stepX, y: point.y + stepY, ...base, type: 'stitch' });
  commands.push({ ...point, ...base, type: 'stitch' });
};

const buildCommandSequence = (works: RegionWork[]) => {
  const commands: StitchCommand[] = [];
  const colorGroups = new Map<string, RegionWork[]>();
  for (const work of works) {
    const group = colorGroups.get(work.region.color) || [];
    group.push(work);
    colorGroups.set(work.region.color, group);
  }
  const orderedGroups = Array.from(colorGroups.entries()).sort(
    (a, b) => b[1].reduce((sum, work) => sum + work.region.areaPx, 0) - a[1].reduce((sum, work) => sum + work.region.areaPx, 0)
  );
  let currentPosition: StitchPoint = { x: 0, y: 0 };

  for (let colorIndex = 0; colorIndex < orderedGroups.length; colorIndex++) {
    const [color, group] = orderedGroups[colorIndex];
    if (colorIndex > 0) {
      commands.push({ x: currentPosition.x, y: currentPosition.y, type: 'color-change', regionId: -1, color, stitchType: 'running', underlay: false });
    }
    const remaining = group.slice();
    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = INF;
      for (let index = 0; index < remaining.length; index++) {
        const candidateDistance = distance(currentPosition, remaining[index].region.centroid);
        if (candidateDistance < nearestDistance) {
          nearestDistance = candidateDistance;
          nearestIndex = index;
        }
      }
      const work = remaining.splice(nearestIndex, 1)[0];
      const validSequences = work.sequences.filter((sequence) => sequence.points.length >= 2);
      if (validSequences.length === 0) continue;
      for (const sequence of validSequences) {
        const first = sequence.points[0];
        const base = {
          regionId: work.region.id,
          color,
          stitchType: sequence.type,
          underlay: sequence.underlay
        };
        if (distance(currentPosition, first) > 0.4) {
          commands.push({ ...first, ...base, type: 'jump' });
        }
        appendTie(commands, first, sequence.points[1], base);
        for (let index = 1; index < sequence.points.length; index++) {
          commands.push({ ...sequence.points[index], ...base, type: 'stitch' });
        }
        const last = sequence.points[sequence.points.length - 1];
        appendTie(commands, last, sequence.points[sequence.points.length - 2], base);
        currentPosition = last;
      }
      commands.push({ x: currentPosition.x, y: currentPosition.y, type: 'trim', regionId: work.region.id, color, stitchType: work.region.stitchType, underlay: false });
    }
  }
  return commands;
};

/**
 * Deterministic artwork-to-stitch planner. It uses alpha/color segmentation,
 * connected regions, vector contours, medial axes, physical-width rules, and
 * real needle coordinates. No network service or AI model is involved.
 */
export const generateStitchPlan = (
  sourcePixels: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  settings: EmbroiderySettings,
  sourceUrl = '',
  segmentation?: LocalSegmentationResult
): StitchPlan => {
  const sourceKind: StitchPlan['sourceKind'] = sourceUrl.startsWith('data:image/svg+xml')
    ? 'vector'
    : segmentation?.reliable
      ? 'ai-raster'
      : 'raster';
  const maximumDimension = sourceKind === 'vector' ? VECTOR_ANALYSIS_DIMENSION : MAX_ANALYSIS_DIMENSION;
  const sampled = downsamplePixels(sourcePixels, sourceWidth, sourceHeight, maximumDimension);
  const maximumColors = sourceKind === 'vector'
    ? clamp(settings.maxColors || 16, 6, 24)
    : sourceKind === 'ai-raster'
      ? clamp(settings.maxColors || 12, 6, 16)
      : clamp(settings.maxColors || 8, 6, 8);
  const palette = buildPalette(sampled.pixels, maximumColors);
  const rawLabels = assignPaletteLabels(sampled.pixels, palette);
  const cleanupThreshold = Math.max(10, Math.round(sampled.width * sampled.height * 0.00004));
  const colorLabels = sourceKind !== 'vector'
    ? mergeSmallLabelFragments(
        cleanPaletteLabels(rawLabels, sampled.width, sampled.height),
        sampled.width,
        sampled.height,
        cleanupThreshold
      )
    : rawLabels;
  const labels = sourceKind === 'ai-raster' && segmentation
    ? combineObjectAndPaletteLabels(
        colorLabels,
        sampled.width,
        sampled.height,
        palette.length,
        segmentation
      )
    : colorLabels;
  const minimumArea = sourceKind !== 'vector' ? 3 : cleanupThreshold;
  const vectorComponents = sourceKind === 'vector'
    ? extractSvgComponents(sourceUrl, sampled.pixels, sampled.width, sampled.height, minimumArea)
    : null;
  const components = vectorComponents || findComponents(labels, sampled.pixels, sampled.width, sampled.height, minimumArea);
  const millimetersPerPixel = clamp(settings.designWidthMm || 100, 20, 500) / sampled.width;
  const works: RegionWork[] = [];

  components.forEach((component, id) => {
    const local = buildLocalMask(component, sampled.width);
    const contours = traceContours(local.mask, local.width, local.height, local.offsetX, local.offsetY);
    if (contours.length === 0) return;
    const distances = distanceTransform(local.mask, local.width, local.height);
    let maximumDistance = 0;
    for (let index = 0; index < distances.length; index++) if (local.mask[index]) maximumDistance = Math.max(maximumDistance, distances[index]);
    const skeleton = skeletonize(local.mask, local.width, local.height);
    const centerlines = skeletonChains(skeleton, local.width, local.height, local.offsetX, local.offsetY);
    const principal = principalDirection(component, sampled.width);
    const classification = classifyRegion(maximumDistance, component.pixels.length, component, millimetersPerPixel);
    const region: PlannedRegion = {
      id,
      color: component.color,
      areaPx: component.pixels.length,
      centroid: { x: principal.centerX, y: principal.centerY },
      bounds: {
        x: component.minX,
        y: component.minY,
        width: component.maxX - component.minX + 1,
        height: component.maxY - component.minY + 1
      },
      contours: [contours[0]],
      holes: contours.slice(1),
      centerlines,
      stitchType: classification.stitchType,
      directionDegrees: ((principal.angle * 180) / Math.PI + 360) % 180,
      estimatedWidthMm: classification.widthMm
    };
    works.push({
      region,
      mask: local.mask,
      maskWidth: local.width,
      maskHeight: local.height,
      offsetX: local.offsetX,
      offsetY: local.offsetY,
      sequences: []
    });
  });

  const rowSpacingMm = clamp(0.86 - settings.stitchDensity * 0.065, 0.3, 0.72);
  const stitchLengthMm = clamp(settings.stitchLength * 0.42, 1.2, 5.0);
  const rowSpacingPixels = rowSpacingMm / millimetersPerPixel;
  const stitchLengthPixels = stitchLengthMm / millimetersPerPixel;

  for (const work of works) {
    if (work.region.stitchType === 'running') createRunningSequences(work, stitchLengthPixels);
    else if (work.region.stitchType === 'satin') createSatinSequences(work, rowSpacingPixels, stitchLengthPixels);
    else {
      const shapeDirection = (work.region.directionDegrees * Math.PI) / 180;
      const fallbackDirection = (settings.stitchAngle * Math.PI) / 180;
      const aspect = Math.max(work.region.bounds.width, work.region.bounds.height) / Math.max(1, Math.min(work.region.bounds.width, work.region.bounds.height));
      createTatamiSequences(work, aspect > 1.2 ? shapeDirection : fallbackDirection, rowSpacingPixels, stitchLengthPixels);
    }
    // A global border around every color fragment creates a tangled wireframe
    // on detailed raster art. Preserve per-object borders for clean/vector art,
    // but suppress them for highly segmented raster artwork.
    if (sourceKind === 'vector' || works.length <= 24) {
      addBorderSequence(work, settings.borderType, stitchLengthPixels);
    }
  }

  const commands = buildCommandSequence(works);
  return {
    width: sourceWidth,
    height: sourceHeight,
    analysisWidth: sampled.width,
    analysisHeight: sampled.height,
    millimetersPerAnalysisPixel: millimetersPerPixel,
    regions: works.map((work) => work.region),
    commands,
    colorCount: new Set(works.map((work) => work.region.color)).size,
    stitchCount: commands.filter((command) => command.type === 'stitch').length,
    jumpCount: commands.filter((command) => command.type === 'jump').length,
    trimCount: commands.filter((command) => command.type === 'trim').length,
    sourceKind
  };
};
