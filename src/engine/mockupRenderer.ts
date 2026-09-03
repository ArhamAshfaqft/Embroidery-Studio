import { MockupTemplate, MockupTransform } from '../types';
import { createRenderCanvas, RenderSource } from './renderCanvas';
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

export interface MockupCompositionOptions {
  /** Scale used when the embroidery engine produced embroideryCanvas. */
  embroideryRenderScale?: number;
  /** Logical mockup dimensions before preview/export supersampling. */
  layoutWidth?: number;
  layoutHeight?: number;
  /** Skip heavy displacement mapping during the interactive placement pass. */
  skipDisplacement?: boolean;
}

export class MockupRenderer {
  /**
   * Compose the embroidery graphic onto the apparel mockup canvas
   * Features real fabric wrinkle displacement mapping and garment lighting interaction.
   */
  public composeMockup(
    mockupImg: RenderSource,
    embroideryCanvas: RenderSource,
    transform: MockupTransform,
    targetWidth: number = 1200,
    targetHeight: number = 1200,
    options: MockupCompositionOptions = {}
  ): HTMLCanvasElement {
    const outputCanvas = createRenderCanvas();
    outputCanvas.width = targetWidth;
    outputCanvas.height = targetHeight;
    const ctx = outputCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return outputCanvas;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw base apparel photo
    ctx.drawImage(mockupImg, 0, 0, targetWidth, targetHeight);

    // 2. Calculate transform coordinates
    const posX = (transform.x / 100) * targetWidth;
    const posY = (transform.y / 100) * targetHeight;
    const scale = transform.scale;
    const rotRad = (transform.rotation * Math.PI) / 180;

    const layoutWidth = Math.max(1, options.layoutWidth ?? targetWidth);
    const layoutHeight = Math.max(1, options.layoutHeight ?? targetHeight);
    const outputScale = Math.min(targetWidth / layoutWidth, targetHeight / layoutHeight);
    const embroideryRenderScale = Math.max(0.01, options.embroideryRenderScale ?? 1);

    // Normalize the source render scale before applying the mockup output scale.
    // This preserves the same physical placement at 1x, 2x previews, and exports.
    const embW = Math.round((embroideryCanvas.width / embroideryRenderScale) * scale * outputScale);
    const embH = Math.round((embroideryCanvas.height / embroideryRenderScale) * scale * outputScale);

    if (embW <= 0 || embH <= 0) return outputCanvas;

    // 3. Process Fabric Wrinkle Displacement & Lighting Interaction
    let finalEmbroiderySource: RenderSource = embroideryCanvas;
    let drawX = -embW / 2, drawY = -embH / 2, drawW = embW, drawH = embH;

    if (!options.skipDisplacement && transform.displacementStrength > 0 && embW > 10 && embH > 10) {
      // Crop the displacement working buffers to the visible rotated footprint,
      // including a generous shadow/filter halo. Off-canvas pixels cannot improve
      // the output, but an oversized artwork used to allocate gigabytes for them.
      const c = Math.cos(rotRad), s = Math.sin(rotRad);
      const corners = [[0, 0], [targetWidth, 0], [0, targetHeight], [targetWidth, targetHeight]]
        .map(([x, y]) => ({ x: (x - posX) * c + (y - posY) * s + embW / 2,
          y: -(x - posX) * s + (y - posY) * c + embH / 2 }));
      const halo = Math.ceil(((8 * scale + transform.shadowIntensity * 1.6) * 3 +
        (4 * scale + transform.shadowIntensity * 1.2) + transform.displacementStrength * 0.45) * outputScale + 8);
      const left = Math.max(0, Math.floor(Math.min(...corners.map(p => p.x))) - halo);
      const top = Math.max(0, Math.floor(Math.min(...corners.map(p => p.y))) - halo);
      const right = Math.min(embW, Math.ceil(Math.max(...corners.map(p => p.x))) + halo);
      const bottom = Math.min(embH, Math.ceil(Math.max(...corners.map(p => p.y))) + halo);
      if (right <= left || bottom <= top) return outputCanvas;
      finalEmbroiderySource = this.applyFabricDisplacement(
        ctx,
        embroideryCanvas,
        posX,
        posY,
        embW,
        embH,
        transform.displacementStrength,
        outputScale,
        { x: left, y: top, width: right - left, height: bottom - top }
      );
      drawX += left; drawY += top; drawW = right - left; drawH = bottom - top;
    }

    ctx.save();
    ctx.translate(posX, posY);
    ctx.rotate(rotRad);

    // 4. Realistic Fabric Contact Drop Shadow
    if (transform.shadowIntensity > 0) {
      ctx.save();
      ctx.shadowColor = `rgba(0, 0, 0, ${0.15 + (transform.shadowIntensity / 10) * 0.45})`;
      ctx.shadowBlur = (8 * scale + transform.shadowIntensity * 1.6) * outputScale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = (4 * scale + transform.shadowIntensity * 1.2) * outputScale;
      ctx.globalAlpha = transform.opacity;

      // Draw shadow silhouette
      ctx.drawImage(finalEmbroiderySource, drawX, drawY, drawW, drawH);
      ctx.restore();
    }

    // 5. Draw Embroidery Graphic with selected Blend Mode & Opacity
    ctx.globalAlpha = transform.opacity;
    ctx.globalCompositeOperation = transform.blendMode === 'normal' ? 'source-over' : (transform.blendMode as GlobalCompositeOperation);
    ctx.drawImage(finalEmbroiderySource, drawX, drawY, drawW, drawH);

    ctx.restore();

    return outputCanvas;
  }

  /**
   * Samples garment luminance map and warps embroidery around fabric creases and folds
   */
  private applyFabricDisplacement(
    garmentCtx: CanvasRenderingContext2D,
    embroideryCanvas: RenderSource,
    posX: number,
    posY: number,
    embW: number,
    embH: number,
    strength: number,
    outputScale: number,
    crop: { x: number; y: number; width: number; height: number }
  ): RenderSource {
    const originalWidth = embW, originalHeight = embH;
    embW = crop.width; embH = crop.height;
    const displacedCanvas = createRenderCanvas();
    displacedCanvas.width = embW;
    displacedCanvas.height = embH;
    const dispCtx = displacedCanvas.getContext('2d', { willReadFrequently: true });
    if (!dispCtx) throw new Error('Could not create displacement canvas');

    // Resample embroidery to the final placed pixel density. High-quality
    // interpolation keeps individual thread ridges intact in supersampled views.
    dispCtx.imageSmoothingEnabled = true;
    dispCtx.imageSmoothingQuality = 'high';
    dispCtx.drawImage(embroideryCanvas, -crop.x, -crop.y, originalWidth, originalHeight);
    const embData = dispCtx.getImageData(0, 0, embW, embH);
    const embPixels = embData.data;

    // Sample garment backdrop under patch
    const sampleX = Math.max(0, Math.min(garmentCtx.canvas.width - originalWidth, Math.round(posX - originalWidth / 2))) + crop.x;
    const sampleY = Math.max(0, Math.min(garmentCtx.canvas.height - originalHeight, Math.round(posY - originalHeight / 2))) + crop.y;

    let garmentData: ImageData;
    try {
      garmentData = garmentCtx.getImageData(sampleX, sampleY, embW, embH);
    } catch {
      return displacedCanvas;
    }

    const gPixels = garmentData.data;
    const outData = dispCtx.createImageData(embW, embH);
    const outPixels = outData.data;

    const dispFactor = (strength / 10) * 4.5 * outputScale;

    // Displacement mapping loop. Bilinear, premultiplied-alpha sampling avoids
    // the blockiness and dark edge halos caused by rounded nearest-pixel reads.
    for (let y = 0; y < embH; y++) {
      const yUp = Math.max(0, y - 1);
      const yDown = Math.min(embH - 1, y + 1);

      for (let x = 0; x < embW; x++) {
        const idx = (y * embW + x) * 4;
        const alpha = embPixels[idx + 3];
        if (alpha === 0) continue;

        // Sample garment local luminance
        const gIdx = (y * embW + x) * 4;
        const xLeft = Math.max(0, x - 1);
        const xRight = Math.min(embW - 1, x + 1);
        const gLeft = (y * embW + xLeft) * 4;
        const gRight = (y * embW + xRight) * 4;
        const gUp = (yUp * embW + x) * 4;
        const gDown = (yDown * embW + x) * 4;
        const lumL = 0.299 * gPixels[gLeft] + 0.587 * gPixels[gLeft + 1] + 0.114 * gPixels[gLeft + 2];
        const lumR = 0.299 * gPixels[gRight] + 0.587 * gPixels[gRight + 1] + 0.114 * gPixels[gRight + 2];
        const lumU = 0.299 * gPixels[gUp] + 0.587 * gPixels[gUp + 1] + 0.114 * gPixels[gUp + 2];
        const lumD = 0.299 * gPixels[gDown] + 0.587 * gPixels[gDown + 1] + 0.114 * gPixels[gDown + 2];

        // Gradient vector of garment folds
        const gradX = (lumR - lumL) / 255;
        const gradY = (lumD - lumU) / 255;

        // Displace sampling position
        const srcX = Math.max(0, Math.min(embW - 1, x + gradX * dispFactor));
        const srcY = Math.max(0, Math.min(embH - 1, y + gradY * dispFactor));
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = Math.min(embW - 1, x0 + 1);
        const y1 = Math.min(embH - 1, y0 + 1);
        const tx = srcX - x0;
        const ty = srcY - y0;
        const w00 = (1 - tx) * (1 - ty);
        const w10 = tx * (1 - ty);
        const w01 = (1 - tx) * ty;
        const w11 = tx * ty;
        const i00 = (y0 * embW + x0) * 4;
        const i10 = (y0 * embW + x1) * 4;
        const i01 = (y1 * embW + x0) * 4;
        const i11 = (y1 * embW + x1) * 4;
        const a00 = embPixels[i00 + 3] / 255;
        const a10 = embPixels[i10 + 3] / 255;
        const a01 = embPixels[i01 + 3] / 255;
        const a11 = embPixels[i11 + 3] / 255;
        const sampledAlpha = w00 * a00 + w10 * a10 + w01 * a01 + w11 * a11;

        if (sampledAlpha <= 0) continue;

        // Fabric fold shadow modulation
        const centerLum = 0.299 * gPixels[gIdx] + 0.587 * gPixels[gIdx + 1] + 0.114 * gPixels[gIdx + 2];
        const foldShadow = 0.88 + (centerLum / 255) * 0.24;

        for (let channel = 0; channel < 3; channel++) {
          const premultiplied =
            w00 * embPixels[i00 + channel] * a00 +
            w10 * embPixels[i10 + channel] * a10 +
            w01 * embPixels[i01 + channel] * a01 +
            w11 * embPixels[i11 + channel] * a11;
          const color = (premultiplied / sampledAlpha) * foldShadow;
          outPixels[idx + channel] = Math.min(255, Math.max(0, Math.round(color)));
        }
        outPixels[idx + 3] = Math.round(sampledAlpha * 255);
      }
    }

    dispCtx.putImageData(outData, 0, 0);
    return displacedCanvas;
  }
}
