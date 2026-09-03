import { ExportOptions, EmbroiderySettings, MockupTransform } from '../types';
import { BackgroundRenderer } from './backgroundRenderer';
import type { SegmentationProgress } from './localSegmentation';

function getMimeType(format: string): string {
  if (format === 'jpeg' || format === 'jpg') return 'image/jpeg';
  if (format === 'webp') return 'image/webp';
  return 'image/png';
}

export class ExportEngine {
  private renderer = new BackgroundRenderer();
  constructor(private onProgress?: SegmentationProgress) {}
  cancel() { this.renderer.dispose(); }

  public async exportStandaloneEmbroidery(
    sourceImg: HTMLImageElement | HTMLCanvasElement,
    settings: EmbroiderySettings,
    options: ExportOptions
  ) {
    // Export always uses the original artwork, never a preview raster.
    return this.renderer.export(sourceImg, settings, options.resolutionMultiplier || 1,
      getMimeType(options.format), options.quality, undefined, this.onProgress);
  }

  public async exportFinishedMockup(
    mockupImg: HTMLImageElement,
    sourceImg: HTMLImageElement | HTMLCanvasElement,
    settings: EmbroiderySettings,
    transform: MockupTransform,
    options: ExportOptions
  ) {
    const scale = options.resolutionMultiplier || 1;
    const outputWidth = (mockupImg.naturalWidth || 1200) * scale;
    const outputHeight = (mockupImg.naturalHeight || 1200) * scale;
    return this.renderer.export(sourceImg, settings, scale, getMimeType(options.format), options.quality, {
      garment: mockupImg, transform, width: outputWidth, height: outputHeight,
      composition: { embroideryRenderScale: scale, layoutWidth: 1200, layoutHeight: 1200 }
    }, this.onProgress);
  }

  public downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
}
