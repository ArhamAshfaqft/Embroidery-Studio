import { ThreadStudioConfig, ThreadStudioPresetId, EmbroiderySettings } from '../types';
import type { RenderResult } from './embroideryRenderer';
import { RenderSource, createRenderCanvas, sourceDimensions } from './renderCanvas';
import { DEFAULT_THREAD_STUDIO_CONFIG, THREAD_STUDIO_PRESETS } from './presets';
import { knockoutNeutralEdgeBackground } from './imageUtils';

export interface AnalysisInfo {
  coverage: number;
  edgeRatio: number;
  colorCount: number;
  avgLum: number;
  aspect: number;
  recommended: ThreadStudioPresetId;
  profile: string;
}

export interface RegionData {
  size: number;
  angle: number;
  elongation: number;
}

interface SurfaceBuffer {
  w: number;
  h: number;
  z: Float32Array;
  albedo: Uint8Array;
  tangent: Float32Array;
  coverage: Uint8Array;
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}

function rgba(r: number, g: number, b: number, a = 1): string {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Thread Studio v2 Renderer:
 * Physically-based volumetric heightfield ray-marching simulation of commercial embroidery.
 * Models cylindrical thread micro-geometry, helical twist grooves, z-buffer occlusion,
 * ray-marched directional self-shadowing, ambient occlusion, and anisotropic thread sheen.
 */
export class ThreadStudioRenderer {
  private workingCanvas: HTMLCanvasElement | null = null;

  public releaseWorkingMemory() {
    if (this.workingCanvas) {
      this.workingCanvas.width = 1;
      this.workingCanvas.height = 1;
      this.workingCanvas = null;
    }
  }

  public render(
    sourceImage: RenderSource,
    settings: EmbroiderySettings,
    targetScale = 1,
    sourceInfo?: { width: number; height: number }
  ): RenderResult {
    const startTime = performance.now();
    const config: ThreadStudioConfig = {
      ...DEFAULT_THREAD_STUDIO_CONFIG,
      ...(settings.threadStudio?.preset ? THREAD_STUDIO_PRESETS[settings.threadStudio.preset] : {}),
      ...(settings.threadStudio || {})
    };

    const dims = sourceDimensions(sourceImage);
    const srcWidth = sourceInfo?.width ?? dims.width;
    const srcHeight = sourceInfo?.height ?? dims.height;

    // Normalize base dimension to ~1000px to match calibrated physical thread geometry
    const maxDim = 1000;
    const s = Math.min(1, maxDim / Math.max(srcWidth, srcHeight));
    const baseW = Math.max(1, Math.round(srcWidth * s));
    const baseH = Math.max(1, Math.round(srcHeight * s));

    const srcCanvas = createRenderCanvas();
    srcCanvas.width = baseW;
    srcCanvas.height = baseH;
    const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
    if (!srcCtx) {
      throw new Error('Failed to acquire 2D context for source canvas');
    }

    srcCtx.clearRect(0, 0, baseW, baseH);
    srcCtx.drawImage(sourceImage as CanvasImageSource, 0, 0, baseW, baseH);
    const srcData = srcCtx.getImageData(0, 0, baseW, baseH);
    // A white JPEG artboard otherwise becomes a large white stitched patch and
    // produces the exact sticker-like halo seen on garment mockups.
    knockoutNeutralEdgeBackground(srcData.data, baseW, baseH);
    srcCtx.putImageData(srcData, 0, 0);
    const { width: w, height: h, data: d } = srcData;
    const n = w * h;

    // Fast emptiness check
    let hasContent = false;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] > 20) {
        hasContent = true;
        break;
      }
    }
    if (!hasContent) {
      const emptyCanvas = createRenderCanvas();
      const emptyW = Math.max(1, Math.round(srcWidth * targetScale));
      const emptyH = Math.max(1, Math.round(srcHeight * targetScale));
      emptyCanvas.width = emptyW;
      emptyCanvas.height = emptyH;
      return {
        canvas: emptyCanvas,
        width: emptyW,
        height: emptyH,
        renderTimeMs: performance.now() - startTime,
        constructionMode: 'thread-studio',
        statusMessage: 'Empty artwork'
      };
    }

    // 1. Quantized connected regions with 2nd central moment covariance
    const regionIds = new Int32Array(n);
    regionIds.fill(-1);
    const regions: RegionData[] = [];
    const keys = new Int32Array(n);
    keys.fill(-1);

    for (let i = 0; i < n; i++) {
      if (d[i * 4 + 3] > 28) {
        keys[i] = ((d[i * 4] >> 5) << 6) | ((d[i * 4 + 1] >> 5) << 3) | (d[i * 4 + 2] >> 5);
      }
    }

    const queue = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      if (keys[i] < 0 || regionIds[i] >= 0) continue;
      const id = regions.length;
      const key = keys[i];
      let head = 0;
      let tail = 1;
      let sx = 0;
      let sy = 0;
      let xx = 0;
      let yy = 0;
      let xy = 0;
      queue[0] = i;
      regionIds[i] = id;

      while (head < tail) {
        const p = queue[head++];
        const px = p % w;
        const py = (p / w) | 0;
        sx += px;
        sy += py;
        xx += px * px;
        yy += py * py;
        xy += px * py;

        const left = px > 0 ? p - 1 : -1;
        const right = px < w - 1 ? p + 1 : -1;
        const up = py > 0 ? p - w : -1;
        const down = py < h - 1 ? p + w : -1;

        for (const q of [left, right, up, down]) {
          if (q >= 0 && regionIds[q] < 0 && keys[q] === key) {
            regionIds[q] = id;
            queue[tail++] = q;
          }
        }
      }

      const meanX = sx / tail;
      const meanY = sy / tail;
      const vx = xx / tail - meanX * meanX;
      const vy = yy / tail - meanY * meanY;
      const cov = xy / tail - meanX * meanY;
      regions.push({
        size: tail,
        angle: 0.5 * Math.atan2(2 * cov, vx - vy),
        elongation: Math.hypot(vx - vy, 2 * cov) / (vx + vy + 1)
      });
    }

    function regionAt(rx: number, ry: number): number {
      if (rx < 0 || ry < 0 || rx >= w || ry >= h) return -1;
      return regionIds[Math.floor(ry) * w + Math.floor(rx)];
    }

    function alphaAt(ax: number, ay: number): number {
      ax = ax | 0;
      ay = ay | 0;
      if (ax < 0 || ay < 0 || ax >= w || ay >= h) return 0;
      return d[(ay * w + ax) * 4 + 3];
    }

    function isInside(ix: number, iy: number, th = 18): boolean {
      return alphaAt(ix, iy) > th;
    }

    function isEdge(ex: number, ey: number): boolean {
      if (!isInside(ex, ey, 28)) return false;
      const dist = 2;
      return (
        alphaAt(ex + dist, ey) < 22 ||
        alphaAt(ex - dist, ey) < 22 ||
        alphaAt(ex, ey + dist) < 22 ||
        alphaAt(ex, ey - dist) < 22
      );
    }

    function normalAt(nx: number, ny: number) {
      const gx = alphaAt(nx + 1, ny) - alphaAt(nx - 1, ny);
      const gy = alphaAt(nx, ny + 1) - alphaAt(nx, ny - 1);
      const len = Math.hypot(gx, gy);
      if (len < 1e-4) return { x: 0, y: -1 };
      return { x: gx / len, y: gy / len };
    }

    function colorAt(cx: number, cy: number): [number, number, number, number] {
      const px = clamp(cx | 0, 0, w - 1);
      const py = clamp(cy | 0, 0, h - 1);
      const idx = (py * w + px) * 4;
      return [d[idx], d[idx + 1], d[idx + 2], d[idx + 3]];
    }

    function luminance(r: number, g: number, b: number): number {
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    // High supersampling for micro-filament fidelity (3x matching realistic-v2.html exactly)
    const RS = 3;
    const renderW = Math.round(w * RS);
    const renderH = Math.round(h * RS);
    const totalPixels = renderW * renderH;

    // 2. Allocate 3D volumetric surface buffers
    const surface: SurfaceBuffer = {
      w: renderW,
      h: renderH,
      z: new Float32Array(totalPixels),
      albedo: new Uint8Array(totalPixels * 3),
      tangent: new Float32Array(totalPixels),
      coverage: new Uint8Array(totalPixels)
    };

    const renderSeed = 1001;
    const rnd = mulberry32(renderSeed + 2000);

    const roughVal = config.roughness / 100;
    const depthVal = config.depth ?? 4.0;

    /**
     * Rasterize a curved, rounded thread into the 3D surface depth buffer.
     * Incorporates tubular arch, helical filament grooves, and z-buffer occlusion.
     */
    function rasterizeThread(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      color: [number, number, number, number],
      width: number
    ) {
      x1 *= RS;
      y1 *= RS;
      x2 *= RS;
      y2 *= RS;
      width *= RS;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 1) return;

      const tx = dx / len;
      const ty = dy / len;
      const nx = -ty;
      const ny = tx;

      const bend = (rnd() - 0.5) * width * (0.4 + roughVal);
      const phase = rnd() * 6.28;
      const radius = width * 0.5 * (0.94 + rnd() * 0.12);
      const tone = 0.94 + rnd() * 0.12;

      const minX = Math.max(0, Math.floor(Math.min(x1, x2) - radius - Math.abs(bend) - 1));
      const maxX = Math.min(renderW - 1, Math.ceil(Math.max(x1, x2) + radius + Math.abs(bend) + 1));
      const minY = Math.max(0, Math.floor(Math.min(y1, y2) - radius - Math.abs(bend) - 1));
      const maxY = Math.min(renderH - 1, Math.ceil(Math.max(y1, y2) + radius + Math.abs(bend) + 1));

      const { z, albedo, tangent, coverage } = surface;

      for (let py = minY; py <= maxY; py++) {
        const rowOffset = py * renderW;
        for (let px = minX; px <= maxX; px++) {
          const vx = px + 0.5 - x1;
          const vy = py + 0.5 - y1;
          const along = vx * tx + vy * ty;
          if (along < -0.5 || along > len + 0.5) continue;

          const t = clamp(along / len, 0, 1);
          const arch = Math.sin(t * Math.PI);
          const across = vx * nx + vy * ny - bend * arch;
          const taper = 0.6 + 0.4 * Math.min(1, (Math.min(t, 1 - t) * len) / (radius * 1.4));
          const r = radius * taper;
          const q = across / r;
          if (Math.abs(q) > 1.2) continue;

          const aa = clamp(r - Math.abs(across) + 0.5, 0, 1);
          if (!aa) continue;

          const round = Math.sqrt(Math.max(0, 1 - Math.min(1, q * q)));
          const twist = Math.asin(clamp(q, -1, 1)) * 5 - along * 1.7 + phase;
          const filament = Math.cos(twist);
          const micro = Math.cos(twist * 2.9 + along * 0.6);
          const relief = radius * (round * (0.84 + 0.105 * filament + 0.025 * micro) + arch * (0.18 + depthVal * 0.035));

          const i = rowOffset + px;
          if (relief <= z[i]) continue;

          z[i] = relief;
          tangent[i] = Math.atan2(ty, tx);
          coverage[i] = Math.round(aa * 255);

          const shade = tone * (0.95 + 0.05 * filament);
          const albIdx = i * 3;
          albedo[albIdx] = clamp(color[0] * shade, 0, 255);
          albedo[albIdx + 1] = clamp(color[1] * shade, 0, 255);
          albedo[albIdx + 2] = clamp(color[2] * shade, 0, 255);
        }
      }
    }

    // 3. Direction families approximate each connected shape's principal axis
    const base = degToRad(config.fillAngle);
    const direction = regions.map((r) =>
      r.elongation > 0.35
        ? Math.round(((r.angle + Math.PI / 2 - base + Math.PI * 2) % Math.PI) / (Math.PI / 4)) % 4
        : 0
    );

    const spacing = Math.max(0.85, config.spacing * 0.51);
    const threadWidth = Math.max(0.95, config.threadWidth * 0.62);
    const stitchLen = config.stitchLen * 1.7;
    const diag = Math.hypot(w, h);

    for (let family = 0; family < 4; family++) {
      const angle = base + (family * Math.PI) / 4;
      const co = Math.cos(angle);
      const si = Math.sin(angle);
      let row = 0;

      for (let v = -diag / 2; v <= diag / 2; v += spacing, row++) {
        let start = 0;
        let last = -1;

        const flush = (end: number) => {
          if (last < 0 || direction[last] !== family || end - start < 0.45) return;
          const length = end - start;
          const satin = config.drawEdge && length < Math.max(8, config.edgeWidth * 5 + 10);
          let u = start + 0.22;
          const period = Math.max(2, Math.round((config.bandSize ?? 18) / 5));
          const offset = ((row % period) / period) * stitchLen;

          while (u < end - 0.22) {
            let next = satin ? end - 0.22 : Math.min(end - 0.22, start + stitchLen - offset);
            if (next <= u + 0.3) next = Math.min(end - 0.22, u + stitchLen);
            const x1 = w / 2 + u * co - v * si;
            const y1 = h / 2 + u * si + v * co;
            const x2 = w / 2 + next * co - v * si;
            const y2 = h / 2 + next * si + v * co;
            const col = colorAt((x1 + x2) / 2, (y1 + y2) / 2);
            const wEffective = threadWidth * (satin ? 0.85 + config.edgeDensity / 200 : 1);
            rasterizeThread(x1, y1, x2, y2, col, wEffective);
            u = next + 0.16;
            if (satin) break;
          }
        };

        for (let u = -diag / 2; u <= diag / 2 + 0.5; u += 0.5) {
          const id = regionAt(w / 2 + u * co - v * si, h / 2 + u * si + v * co);
          if (id !== last) {
            flush(u - 0.25);
            start = u;
            last = id;
          }
        }
        flush(diag / 2);
      }
    }

    // 4. Vector boundary marching for shape-adaptive satin border (v2 contour march)
    if (config.drawEdge) {
      const edges = new Map<number, [number, number][]>();
      const add = (ex1: number, ey1: number, ex2: number, ey2: number) => {
        const k = ey1 * (w + 1) + ex1;
        if (!edges.has(k)) edges.set(k, []);
        edges.get(k)!.push([ex2, ey2]);
      };

      for (let cy = 0; cy < h; cy++) {
        for (let cx = 0; cx < w; cx++) {
          if (isInside(cx, cy, 100)) {
            if (!isInside(cx, cy - 1, 100)) add(cx, cy, cx + 1, cy);
            if (!isInside(cx + 1, cy, 100)) add(cx + 1, cy, cx + 1, cy + 1);
            if (!isInside(cx, cy + 1, 100)) add(cx + 1, cy + 1, cx, cy + 1);
            if (!isInside(cx - 1, cy, 100)) add(cx, cy + 1, cx, cy);
          }
        }
      }

      while (edges.size) {
        const first = edges.keys().next().value;
        if (first === undefined) break;
        let key = first;
        const points: [number, number][] = [];

        for (let limit = 0; limit < w * h * 4; limit++) {
          const options = edges.get(key);
          if (!options) break;
          points.push([key % (w + 1), Math.floor(key / (w + 1))]);
          const next = options.pop()!;
          if (!options.length) edges.delete(key);
          key = next[1] * (w + 1) + next[0];
          if (key === first) break;
        }

        if (points.length >= 12) {
          const stride = Math.max(1, Math.round(config.spacing * 0.55));
          for (let i = 0; i < points.length; i += stride) {
            const p = points[i];
            const before = points[(i - 3 + points.length) % points.length];
            const after = points[(i + 3) % points.length];
            const bdx = after[0] - before[0];
            const bdy = after[1] - before[1];
            const blen = Math.hypot(bdx, bdy);
            if (!blen) continue;

            const inNx = -bdy / blen;
            const inNy = bdx / blen;
            const shapeId = regionAt(p[0] + inNx * 1.2, p[1] + inNy * 1.2);
            if (shapeId < 0) continue;

            let reach = 1.2;
            const maxReach = 3 + config.edgeWidth * 2.4;
            while (reach < maxReach && regionAt(p[0] + inNx * (reach + 0.5), p[1] + inNy * (reach + 0.5)) === shapeId) {
              reach += 0.5;
            }
            if (reach < 1.8) continue;

            rasterizeThread(
              p[0] + inNx * 0.35,
              p[1] + inNy * 0.35,
              p[0] + inNx * reach,
              p[1] + inNy * reach,
              colorAt(p[0] + inNx * 1.2, p[1] + inNy * 1.2),
              Math.max(0.9, config.threadWidth * 0.6)
            );
          }
        }
      }
    }

    // 5. Physically-based ray-marched shading pass (v2 shader)
    const layer = createRenderCanvas();
    layer.width = renderW;
    layer.height = renderH;
    const layerCtx = layer.getContext('2d') as CanvasRenderingContext2D;
    const output = layerCtx.createImageData(renderW, renderH);
    const outData = output.data;

    const az = degToRad(config.lightAngle ?? 225);
    const el = degToRad(config.lightHeight ?? 48);
    const lx = Math.cos(az) * Math.cos(el);
    const ly = Math.sin(az) * Math.cos(el);
    const lz = Math.sin(el);

    const hn = Math.hypot(lx, ly, lz + 1);
    const hx = lx / hn;
    const hy = ly / hn;
    const hz = (lz + 1) / hn;

    const shine = config.shine / 100;
    const { z, albedo, tangent, coverage } = surface;

    for (let py = 0; py < renderH; py++) {
      const rowOffset = py * renderW;
      const yPrev = Math.max(0, py - 1) * renderW;
      const yNext = Math.min(renderH - 1, py + 1) * renderW;

      for (let px = 0; px < renderW; px++) {
        const i = rowOffset + px;
        if (!coverage[i]) continue;

        let nx = (z[rowOffset + Math.max(0, px - 1)] - z[rowOffset + Math.min(renderW - 1, px + 1)]) * 0.65;
        let ny = (z[yPrev + px] - z[yNext + px]) * 0.65;
        const norm = Math.hypot(nx, ny, 1);
        nx /= norm;
        ny /= norm;
        const nz = 1 / norm;

        const diffuse = Math.max(0, nx * lx + ny * ly + nz * lz);
        let occlusion = 0;
        let shadow = 0;

        // 3-step ray marching for directional self-shadows and crevice AO
        for (const step of [2, 4, 7]) {
          const sx = Math.round(px + lx * step);
          const sy = Math.round(py + ly * step);
          if (sx >= 0 && sy >= 0 && sx < renderW && sy < renderH) {
            const dz = z[sy * renderW + sx] - z[i];
            if (dz > lz * step + 0.3) shadow += 0.2;
            occlusion += Math.max(0, dz) / (step * 12);
          }
        }

        const ndh = Math.max(0, nx * hx + ny * hy + nz * hz);
        // Anisotropic specular reflection across fiber tangent
        const axial = Math.abs(Math.cos(tangent[i]) * hx + Math.sin(tangent[i]) * hy);
        const spec = Math.pow(ndh, 12 + shine * 26) * (1 - axial * 0.65) * shine * 0.8 * (1 - shadow);
        const lighting = (0.43 + diffuse * 0.76) * (1 - shadow) * (1 - Math.min(0.25, occlusion));

        const albIdx = i * 3;
        const dIdx = i * 4;
        outData[dIdx] = clamp(albedo[albIdx] * lighting + spec * (155 + albedo[albIdx] * 0.25), 0, 255);
        outData[dIdx + 1] = clamp(albedo[albIdx + 1] * lighting + spec * (155 + albedo[albIdx + 1] * 0.25), 0, 255);
        outData[dIdx + 2] = clamp(albedo[albIdx + 2] * lighting + spec * (155 + albedo[albIdx + 2] * 0.25), 0, 255);
        outData[dIdx + 3] = coverage[i];
      }
    }

    layerCtx.putImageData(output, 0, 0);

    // 6. Silhouette clipping to artwork boundaries
    layerCtx.globalCompositeOperation = 'destination-in';
    layerCtx.drawImage(srcCanvas, 0, 0, renderW, renderH);
    layerCtx.globalCompositeOperation = 'source-over';

    // 7. Composite final embroidery canvas with underlay
    const previewCanvas = createRenderCanvas();
    previewCanvas.width = renderW;
    previewCanvas.height = renderH;
    const pCtx = previewCanvas.getContext('2d') as CanvasRenderingContext2D;

    // 7a. Solid 88% colored underlay (keeps dense stitched regions from looking like a wire grid)
    pCtx.save();
    pCtx.globalAlpha = 0.88;
    pCtx.drawImage(srcCanvas, 0, 0, renderW, renderH);
    pCtx.restore();

    // 7b. Thread stitch layer
    pCtx.drawImage(layer, 0, 0);

    // 7d. Optional Running Outline
    if (config.drawOutline) {
      const outlineRnd = mulberry32(renderSeed + 4444);
      const step = 4 * RS;
      const len = 3.8 * RS;

      pCtx.save();
      pCtx.lineCap = 'round';
      for (let py = 1; py < renderH - 1; py += step) {
        for (let px = 1; px < renderW - 1; px += step) {
          const sx = px / RS;
          const sy = py / RS;
          if (!isEdge(sx, sy)) continue;
          if (outlineRnd() > 0.7) continue;

          const col = colorAt(sx, sy);
          const lum = luminance(col[0], col[1], col[2]);
          const line = lum < 65 ? [10, 10, 10] : [Math.max(0, col[0] - 65), Math.max(0, col[1] - 65), Math.max(0, col[2] - 65)];

          const nrm = normalAt(sx, sy);
          const t = Math.atan2(nrm.y, nrm.x) + Math.PI / 2 + (outlineRnd() - 0.5) * 0.16;
          const odx = Math.cos(t) * len * 0.5;
          const ody = Math.sin(t) * len * 0.5;

          pCtx.lineWidth = 0.55 * RS;
          pCtx.strokeStyle = rgba(line[0], line[1], line[2], Math.min(0.82, col[3] / 255));
          pCtx.beginPath();
          pCtx.moveTo(px - odx, py - ody);
          pCtx.lineTo(px + odx, py + ody);
          pCtx.stroke();
        }
      }
      pCtx.restore();
    }

    // 7e. Optional Micro Edge Fibers (Fuzz)
    if (config.drawFuzz) {
      const roughnessVal = config.roughness / 100;
      const tw = config.threadWidth * RS;
      const fuzzRnd = mulberry32(renderSeed + 6666);
      const tries = Math.round(((renderW * renderH) / (180 * RS)) * (0.2 + roughnessVal));

      pCtx.save();
      pCtx.lineCap = 'round';
      for (let i = 0; i < tries; i++) {
        const fpx = (fuzzRnd() * renderW) | 0;
        const fpy = (fuzzRnd() * renderH) | 0;
        const sx = fpx / RS;
        const sy = fpy / RS;
        if (!isEdge(sx, sy)) continue;

        const col = colorAt(sx, sy);
        const nrm = normalAt(sx, sy);
        const fAngle = Math.atan2(nrm.y, nrm.x) + Math.PI + (fuzzRnd() - 0.5) * 1.2;
        const fLen = (0.4 + fuzzRnd() * tw * 0.5) * (0.45 + roughnessVal);
        pCtx.lineWidth = 0.2 * RS + fuzzRnd() * 0.1 * RS;
        pCtx.strokeStyle = rgba(
          clamp(col[0] + 25, 0, 255),
          clamp(col[1] + 25, 0, 255),
          clamp(col[2] + 25, 0, 255),
          0.05 + fuzzRnd() * 0.06
        );
        pCtx.beginPath();
        pCtx.moveTo(fpx, fpy);
        pCtx.lineTo(fpx + Math.cos(fAngle) * fLen, fpy + Math.sin(fAngle) * fLen);
        pCtx.stroke();
      }
      pCtx.restore();
    }

    return {
      canvas: previewCanvas,
      width: renderW,
      height: renderH,
      renderTimeMs: performance.now() - startTime,
      constructionMode: 'thread-studio',
      statusMessage: `Thread Studio v2: ${regions.length} directional shapes (Ray-marched)`
    };
  }

  public analyzeArtwork(srcPixels: Uint8ClampedArray, width: number, height: number): AnalysisInfo {
    const step = 2;
    let filled = 0;
    let edge = 0;
    let lumSum = 0;
    const colorSet = new Set<string>();
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    const alphaAt = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return 0;
      return srcPixels[(y * width + x) * 4 + 3];
    };

    const isEdge = (x: number, y: number) => {
      if (alphaAt(x, y) <= 28) return false;
      const d = 2;
      return (
        alphaAt(x + d, y) < 22 ||
        alphaAt(x - d, y) < 22 ||
        alphaAt(x, y + d) < 22 ||
        alphaAt(x, y - d) < 22
      );
    };

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const a = alphaAt(x, y);
        if (a <= 20) continue;
        filled++;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);

        if (isEdge(x, y)) edge++;

        const idx = (y * width + x) * 4;
        const r = srcPixels[idx];
        const g = srcPixels[idx + 1];
        const b = srcPixels[idx + 2];
        lumSum += 0.2126 * r + 0.7152 * g + 0.0722 * b;

        const qr = Math.floor(r / 32);
        const qg = Math.floor(g / 32);
        const qb = Math.floor(b / 32);
        colorSet.add(`${qr}-${qg}-${qb}`);
      }
    }

    const totalSamples = Math.ceil(width / step) * Math.ceil(height / step);
    const coverage = filled / Math.max(1, totalSamples);
    const edgeRatio = edge / Math.max(1, filled);
    const colorCount = colorSet.size;
    const avgLum = lumSum / Math.max(1, filled);
    const bboxW = Math.max(1, maxX - minX);
    const bboxH = Math.max(1, maxY - minY);
    const aspect = bboxW / bboxH;

    let profile = 'clean badge / logo';
    let recommended: ThreadStudioPresetId = 'cleanLogo';

    if (edgeRatio > 0.42 || colorCount > 24) {
      profile = 'detailed artwork';
      recommended = 'realistic';
    } else if (edgeRatio > 0.3 || colorCount > 12) {
      profile = 'moderately detailed badge';
      recommended = 'cleanLogo';
    } else if (coverage < 0.18 && edgeRatio < 0.25) {
      profile = 'simple icon / emblem';
      recommended = 'satin';
    } else if (coverage > 0.45 && edgeRatio < 0.22) {
      profile = 'large solid shape';
      recommended = 'puff';
    }

    return { coverage, edgeRatio, colorCount, avgLum, aspect, recommended, profile };
  }
}
