import { MockupTemplate, MockupTransform } from '../types';
import { createRenderCanvas, RenderSource } from './renderCanvas';
import { analyzePhotoLighting, fabricBlendAmount, PhotoLighting, softenThreadLayer } from './fabricIntegration';
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
   * Uses photograph-derived wrinkle displacement and relative garment lighting.
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
    const fabricBlend = fabricBlendAmount(transform.fabricBlendStrength);

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
      (transform.creviceShadowStrength ?? 2.5) > 0 || fabricBlend > 0;

    if (!options.skipDisplacement && hasFabricEffects && embW > 10 && embH > 10) {
      // Crop the displacement working buffers to the visible rotated footprint,
      // including a generous shadow/filter halo. Off-canvas pixels cannot improve
      // the output, but an oversized artwork used to allocate gigabytes for them.
      const c = Math.cos(rotRad), s = Math.sin(rotRad);
      const corners = [[0, 0], [targetWidth, 0], [0, targetHeight], [targetWidth, targetHeight]]
        .map(([x, y]) => ({ x: (x - posX) * c + (y - posY) * s + embW / 2,
          y: -(x - posX) * s + (y - posY) * c + embH / 2 }));
      // The destination must extend beyond the artwork: displaced stitches can
      // occupy previously transparent pixels, including outside the artboard.
      const warpHalo = Math.ceil((Math.max(0, transform.displacementStrength) * 2.4 + 2) * outputScale) + 2;
      const halo = warpHalo + Math.ceil(6 * outputScale);
      const left = Math.max(-warpHalo, Math.floor(Math.min(...corners.map(p => p.x))) - halo);
      const top = Math.max(-warpHalo, Math.floor(Math.min(...corners.map(p => p.y))) - halo);
      const right = Math.min(embW + warpHalo, Math.ceil(Math.max(...corners.map(p => p.x))) + halo);
      const bottom = Math.min(embH + warpHalo, Math.ceil(Math.max(...corners.map(p => p.y))) + halo);
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
        { x: left, y: top, width: right - left, height: bottom - top },
        fabricBlend,
        fabricBlend > 0 ? analyzePhotoLighting(mockupImg) : { tint: [1, 1, 1], exposure: 1, confidence: 0 }
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

        const contactDist = (0.2 + (transform.shadowIntensity / 10) * 0.35) * outputScale;
        const contactBlur = Math.max(0.6, (0.5 + (transform.shadowIntensity / 10) * 1.25) * outputScale);
        const contactAlpha = Math.min(0.35, (transform.shadowIntensity / 10) * 0.30 +
          fabricBlend * .12 * Math.min(1, transform.shadowIntensity / .6)) * transform.opacity;

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
    crop: { x: number; y: number; width: number; height: number },
    fabricBlend: number,
    photoLighting: PhotoLighting
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
    const sceneHalo = Math.ceil(40 * outputScale) + 4;
    const sceneLeft = Math.max(0, Math.floor(Math.min(...mappedCorners.map(p => p.x))) - sceneHalo);
    const sceneTop = Math.max(0, Math.floor(Math.min(...mappedCorners.map(p => p.y))) - sceneHalo);
    const sceneRight = Math.min(garmentCtx.canvas.width, Math.ceil(Math.max(...mappedCorners.map(p => p.x))) + sceneHalo);
    const sceneBottom = Math.min(garmentCtx.canvas.height, Math.ceil(Math.max(...mappedCorners.map(p => p.y))) + sceneHalo);
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

    // Sample the photograph beyond the artwork so folds do not flatten at its
    // edge. Only the actual photograph bounds are clamped.
    const getPhotoIndex = (gx: number, gy: number): number => {
      const mapped = localToImage(gx, gy);
      const imageX = Math.max(0, Math.min(sceneWidth - 1, Math.round(mapped.x) - sceneLeft));
      const imageY = Math.max(0, Math.min(garmentData.height - 1, Math.round(mapped.y) - sceneTop));
      return (imageY * sceneWidth + imageX) * 4;
    };
    const getRawLum = (gx: number, gy: number): number => {
      const idx = getPhotoIndex(gx, gy);
      return 0.299 * gPixels[idx] + 0.587 * gPixels[idx + 1] + 0.114 * gPixels[idx + 2];
    };
    const colourBoundary = (ax: number, ay: number, bx: number, by: number) => {
      // Average before comparing chroma. Raw RGB in black fabric contains
      // sensor/codec noise that must never turn into a jagged displacement field.
      const average = (x: number, y: number) => {
        const rgb = [0, 0, 0];
        const radius = Math.max(1, Math.round(2 * outputScale));
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const index = getPhotoIndex(x + dx * radius, y + dy * radius);
          for (let c = 0; c < 3; c++) rgb[c] += gPixels[index + c] / 9;
        }
        return rgb;
      };
      const a = average(ax, ay), b = average(bx, by);
      const sumA = a[0] + a[1] + a[2] + 72;
      const sumB = b[0] + b[1] + b[2] + 72;
      let delta = 0;
      for (let c = 0; c < 3; c++) delta = Math.max(delta, Math.abs((a[c] + 24) / sumA - (b[c] + 24) / sumB));
      return Math.exp(-28 * delta);
    };

    // Use the cloth under actual stitches, not the rotated bounding rectangle
    // (which may include a bright studio backdrop or a collar opening).
    const lightSamples: number[] = [];
    const lumStep = Math.max(1, Math.floor(Math.min(embW, embH) / 80));
    for (let y = 0; y < embH; y += lumStep) {
      for (let x = 0; x < embW; x += lumStep) {
        const point = localToImage(x, y);
        if (embPixels[(y * embW + x) * 4 + 3] > 128 && point.x >= 0 && point.y >= 0 &&
          point.x < garmentCtx.canvas.width && point.y < garmentCtx.canvas.height) {
          lightSamples.push(getRawLum(x, y));
        }
      }
    }
    lightSamples.sort((a, b) => a - b);
    const ambientGarmentLum = lightSamples[Math.floor(lightSamples.length * 0.6)] ?? 128;

    // Multi-Scale Sobel Radii calibrated to physical garment proportions:
    // Fine (2-3px): seam ridges and micro-creases
    // Medium (8-12px): prominent garment wrinkles and folds
    // Coarse (24-36px): deep fabric draping across chest and body contour
    const rFine = Math.max(1, Math.round(2 * outputScale));
    const rMed = Math.max(3, Math.round(8 * outputScale));
    const rCoarse = Math.max(8, Math.round(24 * outputScale));
    const gateStep = Math.max(2, Math.round(6 * outputScale));
    const gateW = Math.ceil(embW / gateStep) + 1, gateH = Math.ceil(embH / gateStep) + 1;
    const colourGates = new Float32Array(gateW * gateH * 2);
    if (fabricBlend > 0) {
      for (let gy = 0; gy < gateH; gy++) for (let gx = 0; gx < gateW; gx++) {
        const x = gx * gateStep, y = gy * gateStep, i = (gy * gateW + gx) * 2;
        colourGates[i] = colourBoundary(x - rMed, y, x + rMed, y);
        colourGates[i + 1] = colourBoundary(x, y - rMed, x, y + rMed);
      }
    }
    const getColourGate = (x: number, y: number, axis: number) => {
      if (fabricBlend === 0) return 1;
      const gx = x / gateStep, gy = y / gateStep, ix = Math.floor(gx), iy = Math.floor(gy);
      const fx = gx - ix, fy = gy - iy, i = (iy * gateW + ix) * 2 + axis;
      return colourGates[i] * (1 - fx) * (1 - fy) + colourGates[i + 2] * fx * (1 - fy) +
        colourGates[i + gateW * 2] * (1 - fx) * fy + colourGates[i + gateW * 2 + 2] * fx * fy;
    };

    // Cache a physically scaled low-pass map once. Cloth grain belongs in the
    // material shading, rather than jagged displacement of every thread edge.
    const blurRadius = Math.max(1, Math.round(2 * outputScale));
    const pad = rCoarse + blurRadius + 1;
    const mapW = embW + pad * 2, mapH = embH + pad * 2;
    const horizontal = new Float32Array(mapW * mapH);
    const smooth = new Float32Array(mapW * mapH);
    const diameter = blurRadius * 2 + 1;
    for (let y = 0; y < mapH; y++) {
      let sum = 0;
      for (let x = -blurRadius; x <= blurRadius; x++) sum += getRawLum(x - pad, y - pad);
      for (let x = 0; x < mapW; x++) {
        horizontal[y * mapW + x] = sum / diameter;
        sum += getRawLum(x + blurRadius + 1 - pad, y - pad) - getRawLum(x - blurRadius - pad, y - pad);
      }
    }
    for (let x = 0; x < mapW; x++) {
      let sum = 0;
      for (let y = -blurRadius; y <= blurRadius; y++) sum += horizontal[Math.max(0, y) * mapW + x];
      for (let y = 0; y < mapH; y++) {
        smooth[y * mapW + x] = sum / diameter;
        sum += horizontal[Math.min(mapH - 1, y + blurRadius + 1) * mapW + x] -
          horizontal[Math.max(0, y - blurRadius) * mapW + x];
      }
    }
    const getSmoothLum = (x: number, y: number) => smooth[(y + pad) * mapW + x + pad];

    // Estimate texture and edge definition only under the artwork. These are
    // conservative image statistics, not a claim to identify a fabric material.
    let detail = 0, definition = 0, edgeCount = 0, materialSamples = 0;
    for (let y = 0; y < embH; y += lumStep) {
      for (let x = 0; x < embW; x += lumStep) {
        if (embPixels[(y * embW + x) * 4 + 3] < 128) continue;
        detail += Math.min(20, Math.abs(getRawLum(x, y) - getSmoothLum(x, y)));
        const near = Math.abs(getRawLum(x + rFine, y) - getRawLum(x - rFine, y)) +
          Math.abs(getRawLum(x, y + rFine) - getRawLum(x, y - rFine));
        const far = Math.abs(getRawLum(x + rMed, y) - getRawLum(x - rMed, y)) +
          Math.abs(getRawLum(x, y + rMed) - getRawLum(x, y - rMed));
        if (far > 18) { definition += Math.min(1, near / far); edgeCount++; }
        materialSamples++;
      }
    }
    const roughness = Math.min(1, detail / Math.max(1, materialSamples) / Math.max(24, ambientGarmentLum) * 12);
    const softness = edgeCount > 20 ? Math.max(0, 1 - definition / edgeCount * 2) : .25;
    softenThreadLayer(embData, Math.max(1, outputScale), fabricBlend * (.12 + softness * .18));

    // Bound displacement at every strength so high-contrast seams cannot tear
    // the artwork. Relative normalization also makes dark cloth folds usable.
    const dispFactor = (warpStrength / 10) * 165.0 * outputScale;
    const maxDisplacement = Math.max(0, warpStrength) * 2.4 * outputScale;
    const lightNormalization = Math.min(3, 180 / (ambientGarmentLum + 24));
    const creviceFactor = Math.max(0, creviceStrength) * 0.24;
    const textFactor = (textureStrength / 10);
    const bend = (gradient: number) => maxDisplacement > 0
      ? maxDisplacement * Math.tanh(gradient * dispFactor * lightNormalization / maxDisplacement)
      : 0;

    for (let y = 0; y < embH; y++) {
      for (let x = 0; x < embW; x++) {
        const idx = (y * embW + x) * 4;

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
        // Dye boundaries should not act like folds. This suppresses chromatic
        // edges; a monochrome printed pattern remains intrinsically ambiguous.
        const gateX = getColourGate(x, y, 0);
        const gateY = getColourGate(x, y, 1);
        const gradX = (f_gx * 0.12 + m_gx * 0.50 + c_gx * 0.38) * gateX;
        const gradY = (f_gy * 0.12 + m_gy * 0.50 + c_gy * 0.38) * gateY;

        // 2. Displace sampling coordinates
        const srcX = x + bend(gradX);
        const srcY = y + bend(gradY);
        // Transparent outside the source, never repeat opaque border pixels.
        if (srcX < 0 || srcY < 0 || srcX >= embW - 1 || srcY >= embH - 1) continue;

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
        const broadLum = (c_tl + 2 * c_tc + c_tr + 2 * c_ml + 4 * localSmoothLum + 2 * c_mr + c_bl + 2 * c_bc + c_br) / 16;
        const shadingConfidence = Math.min(gateX, gateY);
        const localRelLight = (localSmoothLum + 12) / (ambientGarmentLum + 12);
        const garmentRelLight = 1 + (localRelLight - 1) * shadingConfidence;

        // Transfer relative illumination, preserving opaque thread colours on
        // dark garments. A power curve retains real fold contrast at defaults.
        const foldShadeMultiplier = garmentRelLight < 1
          ? Math.max(0.32, Math.pow(garmentRelLight, Math.min(1.8, creviceFactor)))
          : Math.min(1.12, Math.pow(garmentRelLight, creviceFactor * 0.22));
        // Broad photographic light still transfers when wrinkle and crease
        // controls are zero. Avoid double shading when fold lighting is active.
        const broadRelLight = 1 + ((broadLum + 12) / (ambientGarmentLum + 12) - 1) * shadingConfidence;
        const photoShade = Math.max(.65, Math.min(1.08,
          Math.pow(broadRelLight, Math.max(0, .7 - creviceFactor) * fabricBlend)));

        // 4. Fabric Grain & Weave High-Pass Texture
        // Extracts the photograph's authentic fabric fibers/weave directly from garment image
        const photoGrainDiff = (centerLum - localSmoothLum);
        const fabricGrainSignal = Math.max(-.025, Math.min(.025,
          (photoGrainDiff / 128.0) * (textFactor * .70 + fabricBlend * .16)));
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
          // A bounded highlight shoulder avoids shiny, over-crisp digital
          // thread on matte/noisy photographs. Never multiply by garment dye.
          const shoulder = Math.max(0, baseColor - 175) * fabricBlend * (.045 + roughness * .12);
          const tint = 1 + (photoLighting.tint[channel] - 1) * fabricBlend;
          const exposure = 1 + (photoLighting.exposure - 1) * fabricBlend;
          const integrated = (baseColor - shoulder) * grainMultiplier * foldShadeMultiplier * photoShade * tint * exposure;
          outPixels[idx + channel] = Math.min(255, Math.max(0, Math.round(integrated)));
        }
        outPixels[idx + 3] = Math.round(sampledAlpha * 255);
      }
    }

    dispCtx.putImageData(outData, 0, 0);
    return displacedCanvas;
  }
}
