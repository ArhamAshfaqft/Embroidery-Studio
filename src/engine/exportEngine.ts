import { ExportOptions, EmbroiderySettings, MockupTransform } from '../types';
import { EmbroideryRenderer } from './embroideryRenderer';
import { MockupRenderer } from './mockupRenderer';

function getMimeType(format: string): string {
  if (format === 'jpeg' || format === 'jpg') return 'image/jpeg';
  if (format === 'webp') return 'image/webp';
  return 'image/png';
}

export class ExportEngine {
  private embroideryRenderer: EmbroideryRenderer;
  private mockupRenderer: MockupRenderer;

  constructor() {
    this.embroideryRenderer = new EmbroideryRenderer();
    this.mockupRenderer = new MockupRenderer();
  }

  /**
   * Export standalone transparent embroidery graphic at target scale
   */
  public async exportStandaloneEmbroidery(
    sourceImg: HTMLImageElement | HTMLCanvasElement,
    settings: EmbroiderySettings,
    options: ExportOptions
  ): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
    const scale = options.resolutionMultiplier || 1;
    const renderResult = this.embroideryRenderer.renderEmbroidery(sourceImg, settings, scale);

    return new Promise((resolve, reject) => {
      const mimeType = getMimeType(options.format);
      renderResult.canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to generate image blob'));
            return;
          }
          const dataUrl = renderResult.canvas.toDataURL(mimeType, options.quality);
          resolve({
            blob,
            dataUrl,
            width: renderResult.width,
            height: renderResult.height
          });
        },
        mimeType,
        options.quality
      );
    });
  }

  /**
   * Export finished apparel mockup with embroidery composite
   */
  public async exportFinishedMockup(
    mockupImg: HTMLImageElement,
    sourceImg: HTMLImageElement | HTMLCanvasElement,
    settings: EmbroiderySettings,
    transform: MockupTransform,
    options: ExportOptions
  ): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
    const scale = options.resolutionMultiplier || 1;
    const targetWidth = mockupImg.naturalWidth ? mockupImg.naturalWidth * scale : 1200 * scale;
    const targetHeight = mockupImg.naturalHeight ? mockupImg.naturalHeight * scale : 1200 * scale;

    // Render high-res embroidery
    const embResult = this.embroideryRenderer.renderEmbroidery(sourceImg, settings, scale);

    // Compose onto mockup canvas with fabric wrinkle displacement
    const composedCanvas = this.mockupRenderer.composeMockup(
      mockupImg,
      embResult.canvas,
      transform,
      targetWidth,
      targetHeight
    );

    return new Promise((resolve, reject) => {
      const mimeType = getMimeType(options.format);
      composedCanvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to generate mockup image blob'));
            return;
          }
          const dataUrl = composedCanvas.toDataURL(mimeType, options.quality);
          resolve({
            blob,
            dataUrl,
            width: targetWidth,
            height: targetHeight
          });
        },
        mimeType,
        options.quality
      );
    });
  }

  /**
   * Trigger browser file download
   */
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
