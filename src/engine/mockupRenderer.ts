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
      shadowIntensity: 1.5,
      fabricTextureStrength: 2,
      creviceShadowStrength: 2.5
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
      displacementStrength: 4.5,
      shadowIntensity: 1.5,
      fabricTextureStrength: 2,
      creviceShadowStrength: 3
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
      shadowIntensity: 1.25,
      fabricTextureStrength: 1.5,
      creviceShadowStrength: 2
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

    const hasFabricEffects =
      transform.displacementStrength > 0 ||
      (transform.fabricTextureStrength ?? 2) > 0 ||
      (transform.creviceShadowStrength ?? 2.5) > 0;

    if (!options.skipDisplacement && hasFabricEffects && embW > 10 && embH > 10) {
      // Crop the displacement working buffers to the visible rotated footprint,
      // including a generous shadow/filter halo. Off-canvas pixels cannot improve
      // the output, but an oversized artwork used to allocate gigabytes for them.
      const c = Math.cos(rotRad), s = Math.sin(rotRad);
      const corners = [[0, 0], [targetWidth, 0], [0, targetHeight], [targetWidth, targetHeight]]
        .map(([x, y]) => ({ x: (x - posX) * c + (y - posY) * s + embW / 2,
          y: -(x - posX) * s + (y - posY) * c + embH / 2 }));
      const halo = Math.ceil(((8 * scale + transform.shadowIntensity * 1.6) * 3 +
        (4 * scale + transform.shadowIntensity * 1.2) + (transform.displacementStrength || 1) * 0.45) * outputScale + 8);
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
        transform.fabricTextureStrength ?? 2,
        transform.creviceShadowStrength ?? 2.5,
        outputScale,
        rotRad,
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
      // Thread sits against the cloth; a wide, opaque drop shadow makes it look
      // like a paper cut-out floating above the garment. Keep this a very tight
      // contact occlusion and let the fold map below supply the larger shading.
      ctx.shadowColor = `rgba(0, 0, 0, ${(transform.shadowIntensity / 10) * 0.28})`;
      ctx.shadowBlur = (0.6 + transform.shadowIntensity * 0.7) * outputScale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = (0.25 + transform.shadowIntensity * 0.2) * outputScale;
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
   * Multi-Scale Directional Fabric Displacement & Material Integration Engine
   * Conforms embroidery around physical garment creases using 3-octave Sobel gradients,
   * realistic crevice fold shadowing, and high-pass cloth weave texture imprinting.
   */
  private applyFabricDisplacement(
    garmentCtx: CanvasRenderingContext2D,
    embroideryCanvas: RenderSource,
    posX: number,
    posY: number,
    embW: number,
    embH: number,
    warpStrength: number,
    textureStrength: number,
    creviceStrength: number,
    outputScale: number,
    rotation: number,
    crop: { x: number; y: number; width: number; height: number }
  ): RenderSource {
    const originalWidth = embW, originalHeight = embH;
    embW = crop.width; embH = crop.height;
    const displacedCanvas = createRenderCanvas();
    displacedCanvas.width = embW;
    displacedCanvas.height = embH;
    const dispCtx = displacedCanvas.getContext('2d', { willReadFrequently: true });
    if (!dispCtx) throw new Error('Could not create displacement canvas');

    // Resample embroidery to the final placed pixel density
    dispCtx.imageSmoothingEnabled = true;
    dispCtx.imageSmoothingQuality = 'high';
    dispCtx.drawImage(embroideryCanvas, -crop.x, -crop.y, originalWidth, originalHeight);
    const embData = dispCtx.getImageData(0, 0, embW, embH);
    const embPixels = embData.data;

    // The embroidery is drawn rotated after this pass.  Sampling the garment as
    // an axis-aligned rectangle (the old approach) made folds slide across the
    // design when it was rotated. Sample in image coordinates instead, so every
    // stitch receives the exact fabric/lighting that is underneath it.
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const localToImage = (localX: number, localY: number) => ({
      x: posX + (localX + crop.x - originalWidth / 2) * cos - (localY + crop.y - originalHeight / 2) * sin,
      y: posY + (localX + crop.x - originalWidth / 2) * sin + (localY + crop.y - originalHeight / 2) * cos
    });
    const mappedCorners = [
      localToImage(0, 0), localToImage(embW, 0),
      localToImage(0, embH), localToImage(embW, embH)
    ];
    const sceneLeft = Math.max(0, Math.floor(Math.min(...mappedCorners.map(p => p.x))) - 2);
    const sceneTop = Math.max(0, Math.floor(Math.min(...mappedCorners.map(p => p.y))) - 2);
    const sceneRight = Math.min(garmentCtx.canvas.width, Math.ceil(Math.max(...mappedCorners.map(p => p.x))) + 2);
    const sceneBottom = Math.min(garmentCtx.canvas.height, Math.ceil(Math.max(...mappedCorners.map(p => p.y))) + 2);
    if (sceneRight <= sceneLeft || sceneBottom <= sceneTop) return displacedCanvas;

    let garmentData: ImageData;
    try {
      garmentData = garmentCtx.getImageData(sceneLeft, sceneTop, sceneRight - sceneLeft, sceneBottom - sceneTop);
    } catch {
      return displacedCanvas;
    }

    const gPixels = garmentData.data;
    const sceneWidth = garmentData.width;
    const outData = dispCtx.createImageData(embW, embH);
    const outPixels = outData.data;

    // Fast luminance lookup helper with boundary clamping
    const getRawLum = (gx: number, gy: number): number => {
      const cx = gx < 0 ? 0 : gx >= embW ? embW - 1 : gx;
      const cy = gy < 0 ? 0 : gy >= embH ? embH - 1 : gy;
      const mapped = localToImage(cx, cy);
      const imageX = Math.max(0, Math.min(sceneWidth - 1, Math.round(mapped.x) - sceneLeft));
      const imageY = Math.max(0, Math.min(garmentData.height - 1, Math.round(mapped.y) - sceneTop));
      const idx = (imageY * sceneWidth + imageX) * 4;
      return 0.299 * gPixels[idx] + 0.587 * gPixels[idx + 1] + 0.114 * gPixels[idx + 2];
    };

    // 3x3 binomial-smoothed luminance map removes camera noise and JPEG compression
    // artifacts before derivative calculation (matching Raven Mockup Studio's blur filter)
    const getSmoothLum = (gx: number, gy: number): number => {
      return (
        getRawLum(gx - 1, gy - 1) + 2 * getRawLum(gx, gy - 1) + getRawLum(gx + 1, gy - 1) +
        2 * getRawLum(gx - 1, gy) + 4 * getRawLum(gx, gy) + 2 * getRawLum(gx + 1, gy) +
        getRawLum(gx - 1, gy + 1) + 2 * getRawLum(gx, gy + 1) + getRawLum(gx + 1, gy + 1)
      ) / 16;
    };

    // Radii for Multi-Scale Sobel Octaves:
    // Fine (2px): micro threads, seam ridges, small creases
    // Medium (6px): visible garment wrinkles and folds
    // Coarse (16px): deep fabric draping and body contour curves
    const rFine = Math.max(1, Math.round(2 * outputScale));
    const rMed = Math.max(2, Math.round(6 * outputScale));
    const rCoarse = Math.max(4, Math.round(16 * outputScale));

    // Directional displacement amplitude scale (calibrated for real cloth flex)
    const dispFactor = (warpStrength / 10) * 18.0 * outputScale;
    const creviceFactor = (creviceStrength / 10);
    const textFactor = (textureStrength / 10);

    for (let y = 0; y < embH; y++) {
      for (let x = 0; x < embW; x++) {
        const idx = (y * embW + x) * 4;
        const alpha = embPixels[idx + 3];
        if (alpha === 0) continue;

        // 1. Multi-scale Sobel Octaves on smoothed fabric luminance
        // Fine
        const f_tl = getSmoothLum(x - rFine, y - rFine), f_tc = getSmoothLum(x, y - rFine), f_tr = getSmoothLum(x + rFine, y - rFine);
        const f_ml = getSmoothLum(x - rFine, y),                                            f_mr = getSmoothLum(x + rFine, y);
        const f_bl = getSmoothLum(x - rFine, y + rFine), f_bc = getSmoothLum(x, y + rFine), f_br = getSmoothLum(x + rFine, y + rFine);
        const f_gx = (f_tr + 2 * f_mr + f_br - (f_tl + 2 * f_ml + f_bl)) / 1020;
        const f_gy = (f_bl + 2 * f_bc + f_br - (f_tl + 2 * f_tc + f_tr)) / 1020;

        // Medium
        const m_tl = getSmoothLum(x - rMed, y - rMed), m_tc = getSmoothLum(x, y - rMed), m_tr = getSmoothLum(x + rMed, y - rMed);
        const m_ml = getSmoothLum(x - rMed, y),                                            m_mr = getSmoothLum(x + rMed, y);
        const m_bl = getSmoothLum(x - rMed, y + rMed), m_bc = getSmoothLum(x, y + rMed), m_br = getSmoothLum(x + rMed, y + rMed);
        const m_gx = (m_tr + 2 * m_mr + m_br - (m_tl + 2 * m_ml + m_bl)) / 1020;
        const m_gy = (m_bl + 2 * m_bc + m_br - (m_tl + 2 * m_tc + m_tr)) / 1020;

        // Coarse
        const c_tl = getSmoothLum(x - rCoarse, y - rCoarse), c_tc = getSmoothLum(x, y - rCoarse), c_tr = getSmoothLum(x + rCoarse, y - rCoarse);
        const c_ml = getSmoothLum(x - rCoarse, y),                                                  c_mr = getSmoothLum(x + rCoarse, y);
        const c_bl = getSmoothLum(x - rCoarse, y + rCoarse), c_bc = getSmoothLum(x, y + rCoarse), c_br = getSmoothLum(x + rCoarse, y + rCoarse);
        const c_gx = (c_tr + 2 * c_mr + c_br - (c_tl + 2 * c_ml + c_bl)) / 1020;
        const c_gy = (c_bl + 2 * c_bc + c_br - (c_tl + 2 * c_tc + c_tr)) / 1020;

        // Balanced gradient combination: Coarse & Medium drive bulk fabric warp; Fine gives subtle micro-flex
        const gradX = f_gx * 0.15 + m_gx * 0.45 + c_gx * 0.40;
        const gradY = f_gy * 0.15 + m_gy * 0.45 + c_gy * 0.40;

        // 2. Displace sampling coordinates
        const srcX = Math.max(0, Math.min(embW - 1, x + gradX * dispFactor));
        const srcY = Math.max(0, Math.min(embH - 1, y + gradY * dispFactor));

        // Bilinear interpolation
        const x0 = Math.floor(srcX), y0 = Math.floor(srcY);
        const x1 = Math.min(embW - 1, x0 + 1), y1 = Math.min(embH - 1, y0 + 1);
        const tx = srcX - x0, ty = srcY - y0;
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

        // 3. Garment Crevice Shadowing & Ridge Highlights
        const centerLum = getRawLum(x, y);
        const localCoarseAvg = (c_tl + c_tc + c_tr + c_ml + c_mr + c_bl + c_bc + c_br) / 8;
        const relLum = (centerLum + 8) / (localCoarseAvg + 8);
        const foldShadow = Math.max(0.48, Math.min(1.0, 1.0 + (relLum - 1.0) * creviceFactor * 0.85));
        const ridgeHighlight = Math.max(0, (relLum - 1.0)) * 28.0 * (creviceFactor * 0.5);

        // 4. Fabric Grain & Weave High-Pass Texture
        // Extract photographic garment high-pass texture + tactile structural yarn weave
        const smoothCenter = getSmoothLum(x, y);
        const photoGrainDiff = (centerLum - smoothCenter) * 8.5;

        // Textile yarn interlace pattern anchored to garment coordinate space
        const mapped = localToImage(x, y);
        const absX = mapped.x;
        const absY = mapped.y;
        const weaveScale = 1.35 / Math.max(0.4, outputScale);
        const wx = absX * weaveScale;
        const wy = absY * weaveScale;
        // Warp/weft yarn interlace + diagonal twill ribs (matching authentic garment weaves)
        const yarnOverUnder = Math.sin(wx) * Math.cos(wy);
        const twillRib = Math.sin((wx + wy) * 0.707) * 0.6;
        const yarnWeave = (yarnOverUnder + twillRib) * 48.0;

        // Combined fabric grain signal scaled by the Cloth Weave Grain slider
        const fabricGrainSignal = (photoGrainDiff * 0.85 + yarnWeave * 0.80) * textFactor;

        // Normalized texture map in [0, 1] where 0.5 is neutral gray (no modification)
        const texMap = Math.max(0.05, Math.min(0.95, 0.5 + fabricGrainSignal / 255));
        const blendWeight = Math.min(1.0, textFactor * 0.95);

        // 5. Compose realistic channels with Hard-Light Fabric Weave & Fold Shading
        for (let channel = 0; channel < 3; channel++) {
          const premultiplied =
            w00 * embPixels[i00 + channel] * a00 +
            w10 * embPixels[i10 + channel] * a10 +
            w01 * embPixels[i01 + channel] * a01 +
            w11 * embPixels[i11 + channel] * a11;
          const baseColor = (premultiplied / sampledAlpha);
          const B = Math.max(0, Math.min(1, baseColor / 255));

          // Hard-Light blending: 0.5 leaves color unchanged, peaks illuminate threads, grooves indent depth
          let hl: number;
          if (texMap <= 0.5) {
            hl = 2 * B * texMap;
          } else {
            hl = 1 - 2 * (1 - B) * (1 - texMap);
          }

          // Interpolate according to Cloth Weave Grain slider
          const textured = B * (1 - blendWeight) + hl * blendWeight;

          // Apply fold crevice shadowing and ridge highlights
          const shaded = textured * foldShadow + (ridgeHighlight / 255);
          outPixels[idx + channel] = Math.min(255, Math.max(0, Math.round(shaded * 255)));
        }
        outPixels[idx + 3] = Math.round(sampledAlpha * 255);
      }
    }

    dispCtx.putImageData(outData, 0, 0);
    return displacedCanvas;
  }
}
