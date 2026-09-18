import { ExportOptions, EmbroiderySettings, MockupTransform, SourceAsset } from '../types';
import { BackgroundRenderer } from './backgroundRenderer';
import { sourceDimensions } from './renderCanvas';
import type { SegmentationProgress } from './localSegmentation';
import { getMockupEmbroiderySettings } from './mockupSettings';

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
    const effectiveSettings: EmbroiderySettings = options.transparentBackground
      ? { ...settings, fabricSubstrate: 'none' }
      : settings;
    return this.renderer.export(sourceImg, effectiveSettings, options.resolutionMultiplier || 1,
      getMimeType(options.format), options.quality, undefined, this.onProgress);
  }

  public async exportFinishedMockup(
    mockupImg: HTMLImageElement,
    sourceImg: HTMLImageElement | HTMLCanvasElement,
    settings: EmbroiderySettings,
    transform: MockupTransform,
    options: ExportOptions,
    sourceAsset?: SourceAsset
  ) {
    const scale = options.resolutionMultiplier || 1;
    const naturalW = mockupImg.naturalWidth || 1200;
    const naturalH = mockupImg.naturalHeight || 1200;
    const outputWidth = naturalW * scale;
    const outputHeight = naturalH * scale;

    const layoutWidth = naturalW;
    const layoutHeight = naturalH;

    const srcDim = sourceDimensions(sourceImg);
    const embroideryRenderScale = sourceAsset && sourceAsset.width > 0
      ? scale * (srcDim.width / sourceAsset.width)
      : scale;

    return this.renderer.export(sourceImg, getMockupEmbroiderySettings(settings), scale, getMimeType(options.format), options.quality, {
      garment: mockupImg, transform, width: outputWidth, height: outputHeight,
      composition: { embroideryRenderScale, layoutWidth, layoutHeight }
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
