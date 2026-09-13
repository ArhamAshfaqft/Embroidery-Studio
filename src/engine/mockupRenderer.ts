import { MockupTemplate, MockupTransform } from '../types';
import { createRenderCanvas, RenderSource } from './renderCanvas';
import {
  REAL_TSHIRT_DATA_URL,
  REAL_HOODIE_DATA_URL,
  REAL_CAP_DATA_URL
} from './realMockupAssets';

/**
 * Resolve the public asset URL for a mockup file.
 * Handles root deployment (Vercel), subpath routing, and Electron file:// protocols.
 */
export function getMockupAssetUrl(filename: string): string {
  if (typeof window !== 'undefined' && (document.baseURI || window.location?.href)) {
    try {
      return new URL(`mockups/${filename}`, document.baseURI || window.location.href).href;
    } catch {
      return `mockups/${filename}`;
    }
  }
  return `mockups/${filename}`;
}

export const MOCKUP_TEMPLATES: MockupTemplate[] = [
  {
    id: 'mockup_tshirt_black',
    name: 'Crewneck T-Shirt (Black)',
    category: 'shirt',
    filename: 'tshirt_black.jpg',
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
      displacementStrength: 4.5,
      shadowIntensity: 0.6,
      fabricTextureStrength: 2.0,
      creviceShadowStrength: 3.0
    },
    placementZone: { x: 380, y: 340, width: 440, height: 380 }
  },
  {
    id: 'mockup_tshirt_white_heavyweight',
    name: 'Heavyweight T-Shirt (White)',
    category: 'shirt',
    filename: 'tshirt_white_heavyweight.png',
    imageUrl: getMockupAssetUrl('tshirt_white_heavyweight.png'),
    width: 1200,
    height: 1200,
    defaultTransform: {
      x: 50,
      y: 46,
      scale: 0.38,
      rotation: 0,
      opacity: 1,
      blendMode: 'normal',
      displacementStrength: 4.5,
      shadowIntensity: 0.6,
      fabricTextureStrength: 2.0,
      creviceShadowStrength: 2.8
    },
    placementZone: { x: 380, y: 340, width: 440, height: 380 }
  },
  {
    id: 'mockup_hoodie_heather',
    name: 'Heavyweight Hoodie (Heather Grey)',
    category: 'sweatshirt',
    filename: 'hoodie_gray.jpg',
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
      shadowIntensity: 0.6,
      fabricTextureStrength: 2.0,
      creviceShadowStrength: 3.0
    },
    placementZone: { x: 380, y: 320, width: 440, height: 320 }
  },
  {
    id: 'mockup_hoodie_forest_green',
    name: 'Hoodie (Forest Green)',
    category: 'sweatshirt',
    filename: 'hoodie_forest_green.png',
    imageUrl: getMockupAssetUrl('hoodie_forest_green.png'),
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
      shadowIntensity: 0.6,
      fabricTextureStrength: 2.0,
      creviceShadowStrength: 3.0
    },
    placementZone: { x: 380, y: 320, width: 440, height: 320 }
  },
  {
    id: 'mockup_sweatshirt_oatmeal_crewneck',
    name: 'Crewneck Sweatshirt (Oatmeal)',
    category: 'sweatshirt',
    filename: 'sweatshirt_oatmeal_crewneck.png',
    imageUrl: getMockupAssetUrl('sweatshirt_oatmeal_crewneck.png'),
    width: 1200,
    height: 1200,
    defaultTransform: {
      x: 50,
      y: 45,
      scale: 0.38,
      rotation: 0,
      opacity: 1,
      blendMode: 'normal',
      displacementStrength: 4.5,
      shadowIntensity: 0.6,
      fabricTextureStrength: 2.0,
      creviceShadowStrength: 3.0
    },
    placementZone: { x: 380, y: 320, width: 440, height: 350 }
  },
  {
    id: 'mockup_polo_navy_front',
    name: 'Polo Shirt (Navy)',
    category: 'shirt',
    filename: 'polo_navy_front.png',
    imageUrl: getMockupAssetUrl('polo_navy_front.png'),
    width: 1200,
    height: 1200,
    defaultTransform: {
      x: 50,
      y: 46,
      scale: 0.36,
      rotation: 0,
      opacity: 1,
      blendMode: 'normal',
      displacementStrength: 4.0,
      shadowIntensity: 0.6,
      fabricTextureStrength: 2.0,
      creviceShadowStrength: 2.8
    },
    placementZone: { x: 380, y: 340, width: 440, height: 360 }
  },
  {
    id: 'mockup_workshirt_khaki_front',
    name: 'Workshirt (Khaki)',
    category: 'shirt',
    filename: 'workshirt_khaki_front.png',
    imageUrl: getMockupAssetUrl('workshirt_khaki_front.png'),
    width: 1200,
    height: 1200,
    defaultTransform: {
      x: 50,
      y: 46,
      scale: 0.36,
      rotation: 0,
      opacity: 1,
      blendMode: 'normal',
      displacementStrength: 4.2,
      shadowIntensity: 0.6,
      fabricTextureStrength: 2.0,
      creviceShadowStrength: 2.8
    },
    placementZone: { x: 380, y: 330, width: 440, height: 380 }
  },
  {
    id: 'mockup_hat_navy',
    name: 'Structured Cap (Navy)',
    category: 'hat',
    filename: 'cap_navy.jpg',
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
      displacementStrength: 3.2,
      shadowIntensity: 0.5,
      fabricTextureStrength: 1.5,
      creviceShadowStrength: 2.2
    },
    placementZone: { x: 420, y: 340, width: 360, height: 240 }
  },
  {
    id: 'mockup_cap_cream_five_panel',
    name: 'Five-Panel Cap (Cream)',
    category: 'hat',
    filename: 'cap_cream_five_panel.png',
    imageUrl: getMockupAssetUrl('cap_cream_five_panel.png'),
    width: 1200,
    height: 1200,
    defaultTransform: {
      x: 50,
      y: 42,
      scale: 0.28,
      rotation: 0,
      opacity: 1,
      blendMode: 'normal',
      displacementStrength: 3.2,
      shadowIntensity: 0.5,
      fabricTextureStrength: 1.8,
      creviceShadowStrength: 2.2
    },
    placementZone: { x: 410, y: 360, width: 380, height: 250 }
  },
  {
    id: 'mockup_beanie_rust_cuffed',
    name: 'Cuffed Beanie (Rust)',
    category: 'hat',
    filename: 'beanie_rust_cuffed.png',
    imageUrl: getMockupAssetUrl('beanie_rust_cuffed.png'),
    width: 1200,
    height: 1200,
    defaultTransform: {
      x: 50,
      y: 45,
      scale: 0.28,
      rotation: 0,
      opacity: 1,
      blendMode: 'normal',
      displacementStrength: 3.5,
      shadowIntensity: 0.5,
      fabricTextureStrength: 2.2,
      creviceShadowStrength: 2.5
    },
    placementZone: { x: 410, y: 400, width: 380, height: 240 }
  },
  {
    id: 'mockup_jacket_denim_back',
    name: 'Denim Jacket (Back)',
    category: 'jacket',
    filename: 'jacket_denim_back.png',
    imageUrl: getMockupAssetUrl('jacket_denim_back.png'),
    width: 1200,
    height: 1200,
    defaultTransform: {
      x: 50,
      y: 44,
      scale: 0.42,
      rotation: 0,
      opacity: 1,
      blendMode: 'normal',
      displacementStrength: 4.5,
      shadowIntensity: 0.6,
      fabricTextureStrength: 2.4,
      creviceShadowStrength: 3.0
    },
    placementZone: { x: 360, y: 290, width: 480, height: 430 }
  },
  {
    id: 'mockup_jacket_black_bomber_back',
    name: 'Black Bomber Jacket (Back)',
    category: 'jacket',
    filename: 'jacket_black_bomber_back.png',
    imageUrl: getMockupAssetUrl('jacket_black_bomber_back.png'),
    width: 1200,
    height: 1200,
    defaultTransform: {
      x: 50,
      y: 44,
      scale: 0.42,
      rotation: 0,
      opacity: 1,
      blendMode: 'normal',
      displacementStrength: 4.2,
      shadowIntensity: 0.6,
      fabricTextureStrength: 2.0,
      creviceShadowStrength: 2.8
    },
    placementZone: { x: 360, y: 290, width: 480, height: 430 }
  },
  {
    id: 'mockup_tote_natural_canvas',
    name: 'Natural Canvas Tote Bag',
    category: 'tote',
    filename: 'tote_natural_canvas.png',
    imageUrl: getMockupAssetUrl('tote_natural_canvas.png'),
    width: 1200,
    height: 1200,
    defaultTransform: {
      x: 50,
      y: 52,
      scale: 0.42,
      rotation: 0,
      opacity: 1,
      blendMode: 'normal',
      displacementStrength: 4.2,
      shadowIntensity: 0.6,
      fabricTextureStrength: 2.2,
      creviceShadowStrength: 2.8
    },
    placementZone: { x: 380, y: 400, width: 440, height: 400 }
  },
  {
    id: 'mockup_backpack_charcoal_front',
    name: 'Charcoal Backpack (Front)',
    category: 'tote',
    filename: 'backpack_charcoal_front.png',
    imageUrl: getMockupAssetUrl('backpack_charcoal_front.png'),
    width: 1200,
    height: 1200,
    defaultTransform: {
      x: 50,
      y: 50,
      scale: 0.36,
      rotation: 0,
      opacity: 1,
      blendMode: 'normal',
      displacementStrength: 4.0,
      shadowIntensity: 0.6,
      fabricTextureStrength: 2.0,
      creviceShadowStrength: 2.8
    },
    placementZone: { x: 390, y: 380, width: 420, height: 360 }
  },
  {
    id: 'mockup_apron_charcoal_canvas',
    name: 'Charcoal Canvas Apron',
    category: 'shirt',
    filename: 'apron_charcoal_canvas.png',
    imageUrl: getMockupAssetUrl('apron_charcoal_canvas.png'),
    width: 1200,
    height: 1200,
    defaultTransform: {
      x: 50,
      y: 42,
      scale: 0.38,
      rotation: 0,
      opacity: 1,
      blendMode: 'normal',
      displacementStrength: 4.5,
      shadowIntensity: 0.6,
      fabricTextureStrength: 2.0,
      creviceShadowStrength: 2.8
    },
    placementZone: { x: 400, y: 290, width: 400, height: 380 }
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

    // 4. Photorealistic Fabric Contact Occlusion (Zero Floating Drop Shadow)
    if (transform.shadowIntensity > 0) {
      // Thread penetrates directly into the garment weave — there is NO floating
      // drop shadow. Instead, we compute tight, localized contact ambient occlusion (AO)
      // that seats the outer perimeter of the stitches into the cloth depressions.
      const maskCanvas = createRenderCanvas();
      maskCanvas.width = drawW;
      maskCanvas.height = drawH;
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.drawImage(finalEmbroiderySource, 0, 0, drawW, drawH);
        maskCtx.globalCompositeOperation = 'source-in';
        maskCtx.fillStyle = '#000000';
        maskCtx.fillRect(0, 0, drawW, drawH);

        const contactDist = (0.2 + (transform.shadowIntensity / 10) * 0.75) * outputScale;
        const contactBlur = Math.max(0.6, (0.5 + (transform.shadowIntensity / 10) * 1.25) * outputScale);
        const contactAlpha = Math.min(0.35, (transform.shadowIntensity / 10) * 0.30) * transform.opacity;

        ctx.save();
        ctx.globalAlpha = contactAlpha;
        if (typeof ctx.filter !== 'undefined') {
          ctx.filter = `blur(${contactBlur.toFixed(2)}px)`;
        }
        // Micro contact offset in key-light direction (45 deg down-right)
        ctx.drawImage(maskCanvas, drawX + contactDist * 0.45, drawY + contactDist * 0.75, drawW, drawH);
        ctx.restore();
      }
    }

    // 5. Draw Embroidery Graphic ONCE with selected Blend Mode & Opacity
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

    // The embroidery is drawn rotated after this pass. Sampling the garment in
    // image coordinates ensures every stitch receives the exact fabric/lighting
    // that is underneath it regardless of rotation angle.
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

    // Calculate baseline ambient garment luminance across the placed area
    let totalGarmentLum = 0;
    let garmentSampleCount = 0;
    const lumStep = Math.max(1, Math.floor(sceneWidth / 24));
    for (let sy = 0; sy < garmentData.height; sy += lumStep) {
      for (let sx = 0; sx < sceneWidth; sx += lumStep) {
        const sidx = (sy * sceneWidth + sx) * 4;
        totalGarmentLum += 0.299 * gPixels[sidx] + 0.587 * gPixels[sidx + 1] + 0.114 * gPixels[sidx + 2];
        garmentSampleCount++;
      }
    }
    const ambientGarmentLum = garmentSampleCount > 0 ? totalGarmentLum / garmentSampleCount : 128;

    // 3x3 binomial-smoothed luminance map removes camera sensor noise before derivative calculation
    const getSmoothLum = (gx: number, gy: number): number => {
      return (
        getRawLum(gx - 1, gy - 1) + 2 * getRawLum(gx, gy - 1) + getRawLum(gx + 1, gy - 1) +
        2 * getRawLum(gx - 1, gy) + 4 * getRawLum(gx, gy) + 2 * getRawLum(gx + 1, gy) +
        getRawLum(gx - 1, gy + 1) + 2 * getRawLum(gx, gy + 1) + getRawLum(gx + 1, gy + 1)
      ) / 16;
    };

    // Multi-Scale Sobel Radii calibrated to physical garment proportions:
    // Fine (2-3px): seam ridges and micro-creases
    // Medium (8-12px): prominent garment wrinkles and folds
    // Coarse (24-36px): deep fabric draping across chest and body contour
    const rFine = Math.max(1, Math.round(2 * outputScale));
    const rMed = Math.max(3, Math.round(8 * outputScale));
    const rCoarse = Math.max(8, Math.round(24 * outputScale));

    // Directional displacement amplitude scale:
    // Calibrated so warpStrength 4 produces visible 6-9px physical wrap conforming to folds,
    // and warpStrength 10 produces deep 18-24px dramatic fabric conformance.
    const dispFactor = (warpStrength / 10) * 165.0 * outputScale;
    const creviceFactor = (creviceStrength / 10);
    const textFactor = (textureStrength / 10);

    for (let y = 0; y < embH; y++) {
      for (let x = 0; x < embW; x++) {
        const idx = (y * embW + x) * 4;
        const alpha = embPixels[idx + 3];
        if (alpha === 0) continue;

        // 1. Multi-scale Sobel Octaves on smoothed fabric luminance
        // Fine (seams & micro-creases)
        const f_tl = getSmoothLum(x - rFine, y - rFine), f_tc = getSmoothLum(x, y - rFine), f_tr = getSmoothLum(x + rFine, y - rFine);
        const f_ml = getSmoothLum(x - rFine, y),                                            f_mr = getSmoothLum(x + rFine, y);
        const f_bl = getSmoothLum(x - rFine, y + rFine), f_bc = getSmoothLum(x, y + rFine), f_br = getSmoothLum(x + rFine, y + rFine);
        const f_gx = (f_tr + 2 * f_mr + f_br - (f_tl + 2 * f_ml + f_bl)) / 1020;
        const f_gy = (f_bl + 2 * f_bc + f_br - (f_tl + 2 * f_tc + f_tr)) / 1020;

        // Medium (visible garment wrinkles & folds)
        const m_tl = getSmoothLum(x - rMed, y - rMed), m_tc = getSmoothLum(x, y - rMed), m_tr = getSmoothLum(x + rMed, y - rMed);
        const m_ml = getSmoothLum(x - rMed, y),                                            m_mr = getSmoothLum(x + rMed, y);
        const m_bl = getSmoothLum(x - rMed, y + rMed), m_bc = getSmoothLum(x, y + rMed), m_br = getSmoothLum(x + rMed, y + rMed);
        const m_gx = (m_tr + 2 * m_mr + m_br - (m_tl + 2 * m_ml + m_bl)) / 1020;
        const m_gy = (m_bl + 2 * m_bc + m_br - (m_tl + 2 * m_tc + m_tr)) / 1020;

        // Coarse (chest drape & large fabric curves)
        const c_tl = getSmoothLum(x - rCoarse, y - rCoarse), c_tc = getSmoothLum(x, y - rCoarse), c_tr = getSmoothLum(x + rCoarse, y - rCoarse);
        const c_ml = getSmoothLum(x - rCoarse, y),                                                  c_mr = getSmoothLum(x + rCoarse, y);
        const c_bl = getSmoothLum(x - rCoarse, y + rCoarse), c_bc = getSmoothLum(x, y + rCoarse), c_br = getSmoothLum(x + rCoarse, y + rCoarse);
        const c_gx = (c_tr + 2 * c_mr + c_br - (c_tl + 2 * c_ml + c_bl)) / 1020;
        const c_gy = (c_bl + 2 * c_bc + c_br - (c_tl + 2 * c_tc + c_tr)) / 1020;

        // Balanced gradient combination: Coarse & Medium drive bulk fabric warp; Fine gives subtle micro-flex
        const gradX = f_gx * 0.12 + m_gx * 0.50 + c_gx * 0.38;
        const gradY = f_gy * 0.12 + m_gy * 0.50 + c_gy * 0.38;

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
        // Compares local fold brightness against ambient garment lighting so dark folds visibly shade the stitches
        const centerLum = getRawLum(x, y);
        const localSmoothLum = getSmoothLum(x, y);
        const garmentRelLight = (localSmoothLum + 12) / (ambientGarmentLum + 12);

        let foldShadeMultiplier = 1.0;
        if (garmentRelLight < 1.0) {
          // In a fold shadow: darken the embroidery in tandem with the garment crease
          foldShadeMultiplier = Math.max(0.38, 1.0 - (1.0 - garmentRelLight) * creviceFactor * 1.15);
        } else {
          // On a fold ridge: catch ambient specular highlight along the crease apex
          foldShadeMultiplier = Math.min(1.22, 1.0 + (garmentRelLight - 1.0) * creviceFactor * 0.40);
        }

        // 4. Fabric Grain & Weave High-Pass Texture
        // Extracts the photograph's authentic fabric fibers/weave directly from garment image
        const photoGrainDiff = (centerLum - localSmoothLum);
        const fabricGrainSignal = (photoGrainDiff / 128.0) * textFactor * 0.70;
        const grainMultiplier = Math.max(0.70, Math.min(1.30, 1.0 + fabricGrainSignal));

        // 5. Compose realistic channels with Fabric Weave & Fold Shading
        for (let channel = 0; channel < 3; channel++) {
          const premultiplied =
            w00 * embPixels[i00 + channel] * a00 +
            w10 * embPixels[i10 + channel] * a10 +
            w01 * embPixels[i01 + channel] * a01 +
            w11 * embPixels[i11 + channel] * a11;
          const baseColor = (premultiplied / sampledAlpha);

          // Apply photographic cloth grain modulation and fold crease lighting
          const integrated = baseColor * grainMultiplier * foldShadeMultiplier;
          outPixels[idx + channel] = Math.min(255, Math.max(0, Math.round(integrated)));
        }
        outPixels[idx + 3] = Math.round(sampledAlpha * 255);
      }
    }

    dispCtx.putImageData(outData, 0, 0);
    return displacedCanvas;
  }
}
