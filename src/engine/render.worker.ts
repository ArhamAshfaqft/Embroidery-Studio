import { EmbroideryRenderer } from './embroideryRenderer';
import { MockupRenderer } from './mockupRenderer';
import { segmentArtworkLocally, setSegmentationAssetBase, LocalSegmentationResult } from './localSegmentation';
import type { RenderJob } from './backgroundRenderer';
import { assertRenderSize } from './renderSizing';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<RenderJob>) => void) | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};
const engine = new EmbroideryRenderer();
const compositor = new MockupRenderer();
let source: ImageBitmap | null = null;
let segmentation: LocalSegmentationResult | undefined;
let garment: ImageBitmap | null = null;
let embroidery: ImageBitmap | null = null;

scope.onmessage = async ({ data: job }) => {
  const progress = (message: string, value = 0) => scope.postMessage({ id: job.id, progress: message, value });
  try {
    if (job.source) { source?.close(); source = job.source; segmentation = job.segmentation; }
    if (job.garment) { garment?.close(); garment = job.garment; }
    if (job.embroidery) { embroidery?.close(); embroidery = job.embroidery; }
    let result;
    if (job.kind !== 'compose') {
      if (!source || !job.settings) throw new Error('No source artwork loaded');
      assertRenderSize(Math.round(job.sourceWidth * job.scale), Math.round(job.sourceHeight * job.scale));
      setSegmentationAssetBase(job.assetBase);
      let aiFailed = false;
      if (job.settings.stitchPlanningMode === 'object-aware' && !job.vectorPlan && !segmentation) {
        try {
          segmentation = await segmentArtworkLocally(source, progress);
          scope.postMessage({ id: job.id, segmentation });
        } catch (error) {
          aiFailed = true;
          progress('Local AI unavailable; using Surface fallback');
        }
      }
      progress('Rendering stitches in background…');
      const activeSegmentation = job.settings.stitchPlanningMode === 'object-aware' && segmentation?.reliable
        ? segmentation : undefined;
      result = engine.renderEmbroidery(source, job.settings, job.scale, activeSegmentation,
        { width: job.sourceWidth, height: job.sourceHeight, vectorPlan: job.vectorPlan });
      if (aiFailed) result.statusMessage = 'AI unavailable: Surface fallback';
    }
    if (job.kind === 'compose' || job.kind === 'export-mockup') {
      const artwork = result?.canvas ?? embroidery;
      if (!garment || !artwork || !job.transform) throw new Error('Mockup assets are not ready');
      assertRenderSize(job.outputWidth!, job.outputHeight!);
      progress('Compositing garment in background…');
      const canvas = compositor.composeMockup(garment, artwork, job.transform, job.outputWidth, job.outputHeight, job.composition);
      result = { canvas, width: canvas.width, height: canvas.height, renderTimeMs: 0, statusMessage: 'Ready' };
    }
    if (!result) throw new Error('Empty render');
    const { canvas, ...metadata } = result;
    if (job.format) {
      progress('Encoding full-resolution image…');
      const blob = await (canvas as unknown as OffscreenCanvas).convertToBlob({ type: job.format, quality: job.quality });
      scope.postMessage({ id: job.id, result: metadata, blob });
    } else {
      const bitmap = (canvas as unknown as OffscreenCanvas).transferToImageBitmap();
      scope.postMessage({ id: job.id, result: metadata, bitmap }, [bitmap]);
    }
  } catch (error) {
    scope.postMessage({ id: job.id, error: error instanceof Error ? error.message : String(error) });
  } finally {
    engine.releaseWorkingMemory();
  }
};
