import { MockupTemplate, MockupTransform } from '../types';
import {
  REAL_TSHIRT_DATA_URL,
  REAL_HOODIE_DATA_URL,
  REAL_CAP_DATA_URL
} from './realMockupAssets';

export const MOCKUP_TEMPLATES: MockupTemplate[] = [
  {
    id: 'mockup_tshirt_black',
    name: 'Crewneck T-Shirt (Black)',
    category: 'shirt',
    imageUrl: REAL_TSHIRT_DATA_URL,
    width: 1200,
    height: 1200,
    defaultTransform: {
      x: 50,
      y: 48,
      scale: 0.38,
      rotation: 0,
      opacity: 1,
      blendMode: 'normal',
      displacementStrength: 4,
      shadowIntensity: 6
    },
    placementZone: { x: 380, y: 340, width: 440, height: 380 }
  },
  {
    id: 'mockup_hoodie_heather',
    name: 'Heavyweight Hoodie (Heather Grey)',
    category: 'sweatshirt',
    imageUrl: REAL_HOODIE_DATA_URL,
    width: 1200,
    height: 1200,
    defaultTransform: {
      x: 50,
      y: 44,
      scale: 0.36,
      rotation: 0,
      opacity: 1,
      blendMode: 'normal',
      displacementStrength: 5,
      shadowIntensity: 6
    },
    placementZone: { x: 380, y: 320, width: 440, height: 320 }
  },
  {
    id: 'mockup_hat_navy',
    name: 'Structured Cap (Navy)',
    category: 'hat',
    imageUrl: REAL_CAP_DATA_URL,
    width: 1200,
    height: 1200,
    defaultTransform: {
      x: 50,
      y: 40,
      scale: 0.30,
      rotation: 0,
      opacity: 1,
      blendMode: 'normal',
      displacementStrength: 3,
      shadowIntensity: 7
    },
    placementZone: { x: 420, y: 340, width: 360, height: 240 }
  }
];

export class MockupRenderer {
  /**
   * Compose the embroidery graphic onto the apparel mockup canvas
   * Features real fabric wrinkle displacement mapping and garment lighting interaction.
   */
  public composeMockup(
    mockupImg: HTMLImageElement,
    embroideryCanvas: HTMLCanvasElement,
    transform: MockupTransform,
    targetWidth: number = 1200,
    targetHeight: number = 1200
  ): HTMLCanvasElement {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = targetWidth;
    outputCanvas.height = targetHeight;
    const ctx = outputCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return outputCanvas;

    // 1. Draw base apparel photo
    ctx.drawImage(mockupImg, 0, 0, targetWidth, targetHeight);

    // 2. Calculate transform coordinates
    const posX = (transform.x / 100) * targetWidth;
    const posY = (transform.y / 100) * targetHeight;
    const scale = transform.scale;
    const rotRad = (transform.rotation * Math.PI) / 180;

    const embW = Math.round(embroideryCanvas.width * scale);
    const embH = Math.round(embroideryCanvas.height * scale);

    if (embW <= 0 || embH <= 0) return outputCanvas;

    // 3. Process Fabric Wrinkle Displacement & Lighting Interaction
    let finalEmbroiderySource: HTMLCanvasElement | HTMLImageElement = embroideryCanvas;

    if (transform.displacementStrength > 0 && embW > 10 && embH > 10) {
      finalEmbroiderySource = this.applyFabricDisplacement(
        ctx,
        embroideryCanvas,
        posX,
        posY,
        embW,
        embH,
        rotRad,
        transform.displacementStrength
      );
    }

    ctx.save();
    ctx.translate(posX, posY);
    ctx.rotate(rotRad);

    // 4. Realistic Fabric Contact Drop Shadow
    if (transform.shadowIntensity > 0) {
      ctx.save();
      ctx.shadowColor = `rgba(0, 0, 0, ${0.15 + (transform.shadowIntensity / 10) * 0.45})`;
      ctx.shadowBlur = 8 * scale + transform.shadowIntensity * 1.6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4 * scale + transform.shadowIntensity * 1.2;
      ctx.globalAlpha = transform.opacity;

      // Draw shadow silhouette
      ctx.drawImage(finalEmbroiderySource, -embW / 2, -embH / 2, embW, embH);
      ctx.restore();
    }

    // 5. Draw Embroidery Graphic with selected Blend Mode & Opacity
    ctx.globalAlpha = transform.opacity;
    ctx.globalCompositeOperation = transform.blendMode === 'normal' ? 'source-over' : (transform.blendMode as GlobalCompositeOperation);
    ctx.drawImage(finalEmbroiderySource, -embW / 2, -embH / 2, embW, embH);

    ctx.restore();

    return outputCanvas;
  }

  /**
   * Samples garment luminance map and warps embroidery around fabric creases and folds
   */
  private applyFabricDisplacement(
    garmentCtx: CanvasRenderingContext2D,
    embroideryCanvas: HTMLCanvasElement,
    posX: number,
    posY: number,
    embW: number,
    embH: number,
    rotRad: number,
    strength: number
  ): HTMLCanvasElement {
    const displacedCanvas = document.createElement('canvas');
    displacedCanvas.width = embW;
    displacedCanvas.height = embH;
    const dispCtx = displacedCanvas.getContext('2d', { willReadFrequently: true });
    if (!dispCtx) return embroideryCanvas;

    // Resample embroidery to work dimensions
    dispCtx.drawImage(embroideryCanvas, 0, 0, embW, embH);
    const embData = dispCtx.getImageData(0, 0, embW, embH);
    const embPixels = embData.data;

    // Sample garment backdrop under patch
    const sampleX = Math.max(0, Math.min(garmentCtx.canvas.width - embW, Math.round(posX - embW / 2)));
    const sampleY = Math.max(0, Math.min(garmentCtx.canvas.height - embH, Math.round(posY - embH / 2)));

    let garmentData: ImageData;
    try {
      garmentData = garmentCtx.getImageData(sampleX, sampleY, embW, embH);
    } catch {
      return embroideryCanvas;
    }

    const gPixels = garmentData.data;
    const outData = dispCtx.createImageData(embW, embH);
    const outPixels = outData.data;

    const dispFactor = (strength / 10) * 4.5;

    // Displacement mapping loop
    for (let y = 1; y < embH - 1; y++) {
      for (let x = 1; x < embW - 1; x++) {
        const idx = (y * embW + x) * 4;
        const alpha = embPixels[idx + 3];
        if (alpha === 0) continue;

        // Sample garment local luminance
        const gIdx = (y * embW + x) * 4;
        const lumL = 0.299 * gPixels[gIdx - 4] + 0.587 * gPixels[gIdx - 3] + 0.114 * gPixels[gIdx - 2];
        const lumR = 0.299 * gPixels[gIdx + 4] + 0.587 * gPixels[gIdx + 5] + 0.114 * gPixels[gIdx + 6];
        const lumU = 0.299 * gPixels[gIdx - embW * 4] + 0.587 * gPixels[gIdx - embW * 4 + 1] + 0.114 * gPixels[gIdx - embW * 4 + 2];
        const lumD = 0.299 * gPixels[gIdx + embW * 4] + 0.587 * gPixels[gIdx + embW * 4 + 1] + 0.114 * gPixels[gIdx + embW * 4 + 2];

        // Gradient vector of garment folds
        const gradX = (lumR - lumL) / 255;
        const gradY = (lumD - lumU) / 255;

        // Displace sampling position
        const srcX = Math.max(0, Math.min(embW - 1, Math.round(x + gradX * dispFactor)));
        const srcY = Math.max(0, Math.min(embH - 1, Math.round(y + gradY * dispFactor)));
        const srcIdx = (srcY * embW + srcX) * 4;

        // Fabric fold shadow modulation
        const centerLum = 0.299 * gPixels[gIdx] + 0.587 * gPixels[gIdx + 1] + 0.114 * gPixels[gIdx + 2];
        const foldShadow = 0.88 + (centerLum / 255) * 0.24;

        outPixels[idx] = Math.min(255, Math.max(0, Math.round(embPixels[srcIdx] * foldShadow)));
        outPixels[idx + 1] = Math.min(255, Math.max(0, Math.round(embPixels[srcIdx + 1] * foldShadow)));
        outPixels[idx + 2] = Math.min(255, Math.max(0, Math.round(embPixels[srcIdx + 2] * foldShadow)));
        outPixels[idx + 3] = embPixels[srcIdx + 3];
      }
    }

    dispCtx.putImageData(outData, 0, 0);
    return displacedCanvas;
  }
}
