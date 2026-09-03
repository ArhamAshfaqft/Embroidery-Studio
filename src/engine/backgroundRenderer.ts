import type { EmbroiderySettings, MockupTransform } from '../types';
import type { RenderResult } from './embroideryRenderer';
import type { LocalSegmentationResult, SegmentationProgress } from './localSegmentation';
import type { MockupCompositionOptions } from './mockupRenderer';
import { generateStitchPlan, StitchPlan } from './stitchPlanner';
import { RenderSource, sourceDimensions } from './renderCanvas';
import { assertRenderSize } from './renderSizing';

export interface RenderJob {
  id: number;
  kind: 'render' | 'compose' | 'export-mockup';
  source?: ImageBitmap;
  garment?: ImageBitmap;
  embroidery?: ImageBitmap;
  settings?: EmbroiderySettings;
  sourceWidth: number;
  sourceHeight: number;
  scale: number;
  assetBase: string;
  segmentation?: LocalSegmentationResult;
  vectorPlan?: StitchPlan;
  transform?: MockupTransform;
  outputWidth?: number;
  outputHeight?: number;
  composition?: MockupCompositionOptions;
  format?: string;
  quality?: number;
}
type WorkerResponse = {
  id: number; progress?: string; value?: number; error?: string;
  result?: Omit<RenderResult, 'canvas'>; bitmap?: ImageBitmap; blob?: Blob;
  segmentation?: LocalSegmentationResult;
};
const objectMaps = new WeakMap<object, LocalSegmentationResult>();
export const isRenderCancelled = (error: unknown) => error instanceof Error && error.name === 'AbortError';

/** One latest-wins worker per consumer. Cancellation stops the actual computation,
 * not just its React callback. Completed workers retain their source bitmap. */
export class BackgroundRenderer {
  private worker: Worker | null = null;
  private revision = 0;
  private pending: { reject: (error: Error) => void } | null = null;
  private cachedSource: RenderSource | null = null;
  private cachedSourceScale = 0;
  private cachedGarment: RenderSource | null = null;
  private cachedEmbroidery: RenderSource | null = null;

  cancel() {
    ++this.revision;
    if (this.pending) {
      this.pending.reject(new DOMException('Render superseded', 'AbortError'));
      this.pending = null;
      this.releaseWorker();
    }
  }
  dispose() { this.cancel(); this.releaseWorker(); }
  private releaseWorker() {
    this.worker?.terminate(); this.worker = null;
    this.cachedSource = this.cachedGarment = this.cachedEmbroidery = null;
    this.cachedSourceScale = 0;
  }

  private async execute(job: Omit<RenderJob, 'id' | 'assetBase'>, assets: {
    source?: RenderSource; garment?: RenderSource; embroidery?: RenderSource;
  }, onProgress?: SegmentationProgress): Promise<WorkerResponse> {
    this.cancel();
    const id = this.revision;
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      throw new Error('Background rendering requires a current browser or the desktop app.');
    }
    this.worker ??= new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module' });
    const worker = this.worker;
    return new Promise<WorkerResponse>((resolve, reject) => {
      this.pending = { reject };
      const finishError = (error: Error) => { if (id !== this.revision) return; this.pending = null; this.releaseWorker(); reject(error); };
      worker.onerror = event => finishError(new Error(event.message || 'Background rendering failed'));
      worker.onmessageerror = () => finishError(new Error('Could not transfer the render result'));
      worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
        if (id !== this.revision || data.id !== id) { data.bitmap?.close(); return; }
        if (data.segmentation && assets.source) { objectMaps.set(assets.source, data.segmentation); return; }
        if (data.progress) { onProgress?.(data.progress, data.value ?? 0); return; }
        if (data.error) { finishError(new Error(data.error)); return; }
        this.pending = null;
        resolve(data);
      };
      const prepare = async () => {
        const transfers: ImageBitmap[] = [];
        try {
          const message: RenderJob = { ...job, id, assetBase: document.baseURI };
          if (assets.source) {
            // Preview inputs need no more pixels than the requested output.
            // Full-resolution/export work always receives the original pixels.
            const inputScale = Math.min(1, job.scale);
            if (assets.source !== this.cachedSource || inputScale !== this.cachedSourceScale) {
              const size = sourceDimensions(assets.source);
              const bitmap = await createImageBitmap(assets.source, inputScale < 1 ? {
                resizeWidth: Math.max(1, Math.round(size.width * inputScale)),
                resizeHeight: Math.max(1, Math.round(size.height * inputScale)), resizeQuality: 'high'
              } : undefined);
              transfers.push(bitmap); message.source = bitmap;
              message.segmentation = objectMaps.get(assets.source);
              if (id === this.revision) { this.cachedSource = assets.source; this.cachedSourceScale = inputScale; }
            }
          }
          for (const key of ['garment', 'embroidery'] as const) {
            const asset = assets[key];
            const cached = key === 'garment' ? this.cachedGarment : this.cachedEmbroidery;
            if (asset && asset !== cached) {
              const bitmap = await createImageBitmap(asset); transfers.push(bitmap); message[key] = bitmap;
              if (id === this.revision) {
                if (key === 'garment') this.cachedGarment = asset; else this.cachedEmbroidery = asset;
              }
            }
          }
          if (id !== this.revision) { transfers.forEach(bitmap => bitmap.close()); return; }
          worker.postMessage(message, transfers);
        } catch (error) {
          transfers.forEach(bitmap => bitmap.close());
          finishError(error instanceof Error ? error : new Error(String(error)));
        }
      };
      void prepare();
    });
  }

  private vectorPlan(source: RenderSource, settings: EmbroiderySettings, scale: number) {
    if (settings.stitchPlanningMode !== 'object-aware' || !('src' in source) || !source.src.startsWith('data:image/svg+xml')) return undefined;
    // SVG DOM parsing is restricted to this bounded geometry pass; pixel rendering
    // and path shading still run in the worker. Raster AI runs entirely there.
    const size = sourceDimensions(source);
    const ratio = Math.min(1, 768 / Math.max(size.width, size.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(size.width * ratio)); canvas.height = Math.max(1, Math.round(size.height * ratio));
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const plan = generateStitchPlan(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, settings, source.src);
    return { ...plan, width: Math.round(size.width * scale), height: Math.round(size.height * scale) };
  }

  async renderEmbroideryAsync(source: RenderSource, settings: EmbroiderySettings, scale = 1, onProgress?: SegmentationProgress): Promise<RenderResult> {
    const size = sourceDimensions(source);
    assertRenderSize(Math.round(size.width * scale), Math.round(size.height * scale));
    const data = await this.execute({ kind: 'render', sourceWidth: size.width, sourceHeight: size.height, scale, settings,
      vectorPlan: this.vectorPlan(source, settings, scale) }, { source }, onProgress);
    return this.toCanvas(data);
  }

  async compose(garment: RenderSource, embroidery: RenderSource, transform: MockupTransform,
    width: number, height: number, composition: MockupCompositionOptions): Promise<RenderResult> {
    assertRenderSize(width, height);
    return this.toCanvas(await this.execute({ kind: 'compose', sourceWidth: 0, sourceHeight: 0, scale: 1,
      transform, outputWidth: width, outputHeight: height, composition }, { garment, embroidery }));
  }

  async export(source: RenderSource, settings: EmbroiderySettings, scale: number, format: string, quality: number,
    mockup?: { garment: RenderSource; transform: MockupTransform; width: number; height: number; composition: MockupCompositionOptions },
    onProgress?: SegmentationProgress) {
    const size = sourceDimensions(source);
    assertRenderSize(Math.round(size.width * scale), Math.round(size.height * scale));
    if (mockup) assertRenderSize(mockup.width, mockup.height);
    const data = await this.execute({ kind: mockup ? 'export-mockup' : 'render', sourceWidth: size.width, sourceHeight: size.height,
      scale, settings, vectorPlan: this.vectorPlan(source, settings, scale), format, quality,
      transform: mockup?.transform, outputWidth: mockup?.width, outputHeight: mockup?.height, composition: mockup?.composition
    }, { source, garment: mockup?.garment }, onProgress);
    if (!data.blob || !data.result) throw new Error('No export image returned');
    return { blob: data.blob, width: data.result.width, height: data.result.height };
  }

  private toCanvas(data: WorkerResponse): RenderResult {
    if (!data.bitmap || !data.result) throw new Error('No rendered image returned');
    const canvas = document.createElement('canvas');
    canvas.width = data.result.width; canvas.height = data.result.height;
    // Transfer ownership without a CPU pixel copy or base64 encoding.
    const context = canvas.getContext('bitmaprenderer');
    if (context) context.transferFromImageBitmap(data.bitmap);
    else { canvas.getContext('2d')!.drawImage(data.bitmap, 0, 0); data.bitmap.close(); }
    return { ...data.result, canvas };
  }
}
