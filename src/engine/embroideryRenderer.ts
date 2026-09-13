import { EmbroiderySettings, ColorMode } from '../types';
import { findClosestThreadColor, hexToRgb, rgbToHex } from './colorPalettes';
import { computeAdaptiveStitchField } from './stitchField';
import { generateStitchPlan, StitchPlan } from './stitchPlanner';
import { createRenderCanvas, RenderSource } from './renderCanvas';
import { renderStitchPlan } from './pathEmbroideryRenderer';
import { computeObjectStitchFlow } from './objectStitchFlow';
import { studioStrand } from './studioThread';
import {
  LocalSegmentationResult,
  SegmentationProgress,
  segmentArtworkLocally
} from './localSegmentation';
import { FabricSubstrateEngine } from './fabricSubstrateEngine';
import { ThreadStudioRenderer } from './threadStudioRenderer';
import { knockoutNeutralEdgeBackground } from './imageUtils';

/**
 * Raven High-Fidelity Wilcom-Grade Procedural Embroidery Engine
 * Calibrated for 100% color fidelity, true dye-preserving anisotropic sheen,
 * 3D thread relief, and authentic needle punctures.
 */

export interface RenderResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  renderTimeMs: number;
  constructionMode?: 'surface' | 'vector-paths' | 'raster-paths' | 'ai-object-aware' | 'safe-fallback' | 'thread-studio';
  objectCount?: number;
  statusMessage?: string;
}

interface ColorCluster {
  r: number;
  g: number;
  b: number;
}

export class EmbroideryRenderer {
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private threadStudioRenderer = new ThreadStudioRenderer();

  constructor() {
    this.offscreenCanvas = createRenderCanvas();
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true })!;
  }

  public releaseWorkingMemory() {
    this.offscreenCanvas.width = 1;
    this.offscreenCanvas.height = 1;
    this.threadStudioRenderer.releaseWorkingMemory();
  }

  /**
   * Asynchronous entry point used by the UI and export pipeline. Raster artwork
   * in Object-Aware mode is segmented by the bundled MobileSAM model first;
   * SVG and Surface renders remain instant and unchanged.
   */
  public async renderEmbroideryAsync(
    sourceImage: RenderSource,
    settings: EmbroiderySettings,
    targetScale = 1,
    onProgress?: SegmentationProgress
  ): Promise<RenderResult> {
    const sourceUrl =
      typeof HTMLImageElement !== 'undefined' && sourceImage instanceof HTMLImageElement
        ? sourceImage.src
        : '';
    const isVector = sourceUrl.startsWith('data:image/svg+xml');
    if (settings.stitchPlanningMode !== 'object-aware' || isVector) {
      return this.renderEmbroidery(sourceImage, settings, targetScale);
    }
    try {
      const segmentation = await segmentArtworkLocally(sourceImage, onProgress);
      if (segmentation.reliable) {
        return this.renderEmbroidery(sourceImage, settings, targetScale, segmentation);
      }
      const fallback = this.renderEmbroidery(sourceImage, settings, targetScale);
      return {
        ...fallback,
        constructionMode: 'safe-fallback',
        statusMessage: 'AI fallback: Surface (low confidence)'
      };
    } catch (error) {
      console.warn('Local MobileSAM segmentation was unavailable. Using safe fallback.', error);
      const fallback = this.renderEmbroidery(sourceImage, settings, targetScale);
      return {
        ...fallback,
        constructionMode: 'safe-fallback',
        statusMessage: 'AI unavailable: Surface fallback'
      };
    }
  }

  /**
   * Main rendering pipeline: transforms any flat AI artwork into Wilcom-grade 3D physical embroidery
   */
  public renderEmbroidery(
    sourceImage: RenderSource,
    settings: EmbroiderySettings,
    targetScale = 1,
    segmentation?: LocalSegmentationResult,
    sourceInfo?: { width: number; height: number; vectorPlan?: StitchPlan }
  ): RenderResult {
    const startTime = performance.now();

    if (settings.stitchPlanningMode === 'thread-studio') {
      const studioResult = this.threadStudioRenderer.render(sourceImage, settings, targetScale, sourceInfo);
      const hasFabricSubstrate = settings.fabricSubstrate && settings.fabricSubstrate !== 'none';
      if (hasFabricSubstrate) {
        const substrateCanvas = FabricSubstrateEngine.compositeWithFabric(
          studioResult.canvas,
          studioResult.width,
          studioResult.height,
          settings,
          targetScale
        );
        return {
          ...studioResult,
          canvas: substrateCanvas
        };
      }
      return studioResult;
    }

    const srcWidth = sourceInfo?.width ?? sourceImage.width;
    const srcHeight = sourceInfo?.height ?? sourceImage.height;

    const width = Math.round(srcWidth * targetScale);
    const height = Math.round(srcHeight * targetScale);

    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    const ctx = this.offscreenCtx;

    // 1. Draw source image scaled to working canvas
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(sourceImage, 0, 0, width, height);

    const sourceData = ctx.getImageData(0, 0, width, height);
    const srcPixels = sourceData.data;
    knockoutNeutralEdgeBackground(srcPixels, width, height);
    ctx.putImageData(sourceData, 0, 0);
    const totalPixels = width * height;

    // Fast emptiness check
    let hasContent = false;
    for (let i = 3; i < srcPixels.length; i += 4) {
      if (srcPixels[i] > 10) {
        hasContent = true;
        break;
      }
    }
    if (!hasContent) {
      return {
        canvas: this.offscreenCanvas,
        width,
        height,
        renderTimeMs: performance.now() - startTime
      };
    }

    let constructionMode: RenderResult['constructionMode'] =
      settings.stitchPlanningMode === 'object-aware' ? 'safe-fallback' : 'surface';
    let statusMessage = settings.stitchPlanningMode === 'object-aware'
      ? 'Object-Aware: Surface fallback'
      : 'Surface rendering';

    // Object-aware construction is deliberately isolated from the two proven
    // surface engines. It segments the artwork, creates real needle paths, then
    // lets Classic or Natural provide the final thread material response.
    if (settings.stitchPlanningMode === 'object-aware') {
      const sourceUrl =
        typeof HTMLImageElement !== 'undefined' && sourceImage instanceof HTMLImageElement
          ? sourceImage.src
          : '';
      const stitchPlan = sourceInfo?.vectorPlan ?? generateStitchPlan(
        srcPixels,
        width,
        height,
        settings,
        sourceUrl,
        segmentation
      );
      const smallRegionCutoff = Math.max(12, stitchPlan.analysisWidth * stitchPlan.analysisHeight * 0.00005);
      const smallRegionShare = stitchPlan.regions.length > 0
        ? stitchPlan.regions.filter((region) => region.areaPx < smallRegionCutoff).length / stitchPlan.regions.length
        : 1;
      const totalCenterlineBranches = stitchPlan.regions.reduce(
        (sum, region) => sum + region.centerlines.length,
        0
      );
      const hasBranchedColorNetwork =
        stitchPlan.regions.some((region) => region.centerlines.length > 18) ||
        totalCenterlineBranches > Math.max(24, stitchPlan.regions.length * 7);
      const analysisArea = stitchPlan.analysisWidth * stitchPlan.analysisHeight;
      const hasSparseSpanningColorNetwork = stitchPlan.regions.some((region) => {
        const boundsArea = region.bounds.width * region.bounds.height;
        const fillRatio = region.areaPx / Math.max(1, boundsArea);
        return boundsArea > analysisArea * 0.08 && fillRatio < 0.24;
      });
      const reliablePathPreview =
        stitchPlan.sourceKind === 'vector' ||
        (stitchPlan.sourceKind === 'raster' &&
          stitchPlan.regions.length <= 20 &&
          smallRegionShare <= 0.45 &&
          !hasBranchedColorNetwork &&
          !hasSparseSpanningColorNetwork);

      // Pure stitch paths are excellent for clean/vector objects but shaded
      // raster illustrations can fragment into hundreds of false objects. Keep
      // their real plan for future machine export while using the proven surface
      // renderer for the beauty preview instead of showing broken wireframes.
      if (reliablePathPreview) {
        const pathCanvas = renderStitchPlan(stitchPlan, settings, 1);
        return {
          canvas: pathCanvas,
          width,
          height,
          renderTimeMs: performance.now() - startTime,
          constructionMode: stitchPlan.sourceKind === 'vector' ? 'vector-paths' : 'raster-paths',
          objectCount: stitchPlan.regions.length,
          statusMessage: `${stitchPlan.regions.length} planned stitch regions`
        };
      }

      // Complex raster artwork keeps the proven high-fidelity Surface material
      // renderer, while MobileSAM supplies clean object-specific stitch flow.
      if (stitchPlan.sourceKind === 'ai-raster' && segmentation?.reliable) {
        constructionMode = 'ai-object-aware';
        statusMessage = `Local AI: ${segmentation.objects.length} objects • curved flow`;
      }
    }

    // 2. Thread Spool Color Processing (Preserves 100% exact colors or optional quantization)
    let processedPixels: ArrayLike<number> = srcPixels;
    if (settings.quantizeColors && settings.colorMode === 'original') {
      processedPixels = this.quantizeToThreadSpools(srcPixels, width, height, settings.maxColors || 16);
    }

    // 3. Pre-calculate Distance Transform and Edge Normals
    const distanceMap = this.computeDistanceAndBorders(
      srcPixels,
      width,
      height,
      settings.borderThickness * targetScale
    );
    const useNaturalThread = settings.renderStyle === 'natural';
    const adaptiveField = useNaturalThread || Boolean(segmentation?.reliable)
      ? computeAdaptiveStitchField(srcPixels, width, height)
      : null;
    const objectFlow = segmentation?.reliable
      ? computeObjectStitchFlow(segmentation)
      : null;

    // 4. Prepare Output Buffer
    // All neighbourhood analysis is complete. Shade each pixel in place:
    // no later pixel reads an earlier pixel's colour. Saves 402 MB at 101 MP.
    const outputData = sourceData;
    const outPixels = outputData.data;

    // Angle conversions
    const stitchRad = (settings.stitchAngle * Math.PI) / 180;
    const cosAngle = Math.cos(stitchRad);
    const sinAngle = Math.sin(stitchRad);

    // 3D Light vector (normalized)
    const lightAzimuthRad = (settings.lightAngle * Math.PI) / 180;
    const lightElevRad = (settings.lightElevation * Math.PI) / 180;
    const lx = Math.cos(lightAzimuthRad) * Math.cos(lightElevRad);
    const ly = Math.sin(lightAzimuthRad) * Math.cos(lightElevRad);
    const lz = Math.sin(lightElevRad);

    // Calibrated physical thread geometry (modeled after standard 40-weight commercial embroidery thread)
    // Ensures threads pack tightly side-by-side with rich physical sheen and prevents hollow trenches.
    const thicknessRatio = Math.max(0.6, Math.min(1.5, settings.threadThickness / 5.0));
    const densityRatio = Math.max(0.5, Math.min(1.8, settings.stitchDensity / 5.5));
    const calibratedSpacing = (5.2 * thicknessRatio) / densityRatio;
    const rowSpacing = Math.max(1.8 * targetScale, Math.min(9.5 * targetScale, calibratedSpacing * targetScale));
    const segmentLen = Math.max(3.8 * targetScale, settings.stitchLength * 1.35 * targetScale * thicknessRatio);
    const punctureStrength = (settings.needlePunctureDepth !== undefined ? settings.needlePunctureDepth : 6.0) / 10;

    // Cached RGB overrides
    const customBorderRgb = settings.useCustomBorderColor ? hexToRgb(settings.borderColor) : null;
    const monochromeRgb = settings.colorMode === 'monochrome' ? hexToRgb(settings.monochromeColor) : null;

    // Color adjust parameters
    const bright = settings.brightness / 100;
    const cont = (settings.contrast + 100) / 100;
    const sat = (settings.saturation + 100) / 100;
    const adaptiveScaleX = adaptiveField ? adaptiveField.width / width : 0;
    const adaptiveScaleY = adaptiveField ? adaptiveField.height / height : 0;
    const objectFlowScaleX = objectFlow ? objectFlow.width / width : 0;
    const objectFlowScaleY = objectFlow ? objectFlow.height / height : 0;
    const objectFlowCoordinateScale = objectFlow
      ? Math.sqrt(objectFlowScaleX * objectFlowScaleY)
      : 0;

    // 5. SYNTHESIZE 3D THREAD GEOMETRY & ANISOTROPIC OPTICS
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const alpha = srcPixels[idx + 3];

        if (alpha < 40) {
          outPixels[idx] = outPixels[idx + 1] = outPixels[idx + 2] = outPixels[idx + 3] = 0;
          continue;
        }

        const pixel = y * width + x;
        const d = distanceMap[pixel];
        const interior = x > 0 && x < width - 1 && y > 0 && y < height - 1;
        const isBorder = interior && d > 0 && d <= Math.max(1, settings.borderThickness * targetScale);
        // Same Sobel math, without 100 million JS references and tiny objects.
        let edgeX = 0, edgeY = 0, hasEdgeNormal = false;
        if (interior && d > 0 && d <= 32) {
          const dx = (distanceMap[pixel + 1 - width] + 2 * distanceMap[pixel + 1] + distanceMap[pixel + 1 + width]) -
            (distanceMap[pixel - 1 - width] + 2 * distanceMap[pixel - 1] + distanceMap[pixel - 1 + width]);
          const dy = (distanceMap[pixel - 1 + width] + 2 * distanceMap[pixel + width] + distanceMap[pixel + 1 + width]) -
            (distanceMap[pixel - 1 - width] + 2 * distanceMap[pixel - width] + distanceMap[pixel + 1 - width]);
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0.05) { edgeX = dx / len; edgeY = dy / len; hasEdgeNormal = true; }
        }
        const adaptiveX = adaptiveField
          ? Math.min(adaptiveField.width - 1, Math.floor(x * adaptiveScaleX))
          : 0;
        const adaptiveY = adaptiveField
          ? Math.min(adaptiveField.height - 1, Math.floor(y * adaptiveScaleY))
          : 0;
        const adaptiveIndex = adaptiveField ? adaptiveY * adaptiveField.width + adaptiveX : 0;
        let objectLabel = 0;
        if (objectFlow) {
          const fieldX = Math.max(0, Math.min(objectFlow.width - 1, Math.round((x + 0.5) * objectFlowScaleX - 0.5)));
          const fieldY = Math.max(0, Math.min(objectFlow.height - 1, Math.round((y + 0.5) * objectFlowScaleY - 0.5)));
          objectLabel = objectFlow.labels[fieldY * objectFlow.width + fieldX];
        }
        const internalBoundaryInfluence = adaptiveField
          ? adaptiveField.boundaryProximity[adaptiveIndex] *
            Math.max(
              adaptiveField.coherence[adaptiveIndex],
              adaptiveField.boundaryStrength[adaptiveIndex] * 0.65
            )
          : 0;

        // Resolve thread dye color
        let r = processedPixels[idx];
        let g = processedPixels[idx + 1];
        let b = processedPixels[idx + 2];

        if (settings.colorMode === 'monochrome' && monochromeRgb) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = monochromeRgb.r * (gray / 255);
          g = monochromeRgb.g * (gray / 255);
          b = monochromeRgb.b * (gray / 255);
        } else if (settings.colorMode === 'palette') {
          const closest = findClosestThreadColor(rgbToHex(r, g, b), settings.paletteId);
          const paletteRgb = hexToRgb(closest.hex);
          if (paletteRgb) {
            r = paletteRgb.r;
            g = paletteRgb.g;
            b = paletteRgb.b;
          }
        }

        // User color adjustments
        if (bright !== 0 || cont !== 1 || sat !== 1) {
          r = Math.min(255, Math.max(0, ((r - 128) * cont + 128) * (1 + bright)));
          g = Math.min(255, Math.max(0, ((g - 128) * cont + 128) * (1 + bright)));
          b = Math.min(255, Math.max(0, ((b - 128) * cont + 128) * (1 + bright)));

          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = Math.min(255, Math.max(0, gray + (r - gray) * sat));
          g = Math.min(255, Math.max(0, gray + (g - gray) * sat));
          b = Math.min(255, Math.max(0, gray + (b - gray) * sat));
        }

        // Custom border override
        if (isBorder && settings.borderType !== 'none' && customBorderRgb) {
          r = customBorderRgb.r;
          g = customBorderRgb.g;
          b = customBorderRgb.b;
        }

        // Thread geometry calculations
        let tangentX: number;
        let tangentY: number;
        let normalX: number;
        let normalY: number;
        let normalZ: number;
        let creviceAO = 1.0;
        let threadFiberPhase = 0;

        if (isBorder && settings.borderType !== 'none') {
          // --- SATIN / MERROWED BORDER CONTOUR ---
          tangentX = hasEdgeNormal ? edgeX : cosAngle;
          tangentY = hasEdgeNormal ? edgeY : sinAngle;

          const borderTangentX = -tangentY;
          const borderTangentY = tangentX;
          const projDist = x * borderTangentX + y * borderTangentY;

          const borderSpacing = Math.max(1.2, 8.0 - settings.stitchDensity * 0.7) * targetScale;
          const modDist = ((projDist % borderSpacing) + borderSpacing) % borderSpacing;
          const normalizedDist = (modDist / borderSpacing) * 2 - 1;

          const profileZ = Math.sqrt(Math.max(0, 1 - normalizedDist * normalizedDist));
          normalX = normalizedDist * borderTangentX * 0.85;
          normalY = normalizedDist * borderTangentY * 0.85;
          normalZ = profileZ * (0.8 + settings.embroideryDepth * 0.18);

          if (settings.borderType === 'merrowed') {
            const loopOsc = Math.sin((projDist / borderSpacing) * Math.PI * 2);
            normalZ += loopOsc * 0.25;
          }

          const creviceDepth = Math.pow(Math.abs(normalizedDist), 2.8);
          creviceAO = 1.0 - creviceDepth * (settings.ambientOcclusion * 0.07);
          threadFiberPhase = (x * tangentX + y * tangentY) * (settings.threadTwist * 0.35);
        } else {
          // --- TATAMI WEAVE FILL ---
          // Each object is assigned a constant, rock-solid stitch orientation:
          // Elongated directional shapes (leaves, ribbons) use their principal orientation;
          // broad/round shapes (cup body, coffee, fills) use the master stitch angle.
          // Because the angle is completely uniform across each object,
          // the projection x * perpX + y * perpY produces 100% mathematically
          // straight, parallel, pristine Tatami rows without pinwheels or Moiré ripples.
          let localTanX = cosAngle;
          let localTanY = sinAngle;

          if (objectLabel > 0 && objectFlow) {
            const objX = objectFlow.baseX[objectLabel];
            const objY = objectFlow.baseY[objectLabel];
            if (Math.hypot(objX, objY) > 0.5) {
              localTanX = objX;
              localTanY = objY;
            }
          }

          if (adaptiveField && internalBoundaryInfluence > 0.015) {
            let regionNormalX = adaptiveField.normalX[adaptiveIndex];
            let regionNormalY = adaptiveField.normalY[adaptiveIndex];
            if (regionNormalX * localTanX + regionNormalY * localTanY < 0) {
              regionNormalX = -regionNormalX;
              regionNormalY = -regionNormalY;
            }
            // Keep subtle organic fiber variation without bending commercial Tatami into wood grain.
            const maximumRegionWeight = 0.08;
            const regionWeight = Math.min(
              maximumRegionWeight,
              internalBoundaryInfluence * maximumRegionWeight
            );
            const blendedX = localTanX * (1 - regionWeight) + regionNormalX * regionWeight;
            const blendedY = localTanY * (1 - regionWeight) + regionNormalY * regionWeight;
            const blendedLength = Math.sqrt(blendedX * blendedX + blendedY * blendedY) || 1;
            localTanX = blendedX / blendedLength;
            localTanY = blendedY / blendedLength;
          }

          tangentX = localTanX;
          tangentY = localTanY;

          const perpX = -tangentY;
          const perpY = tangentX;

          const localRowSpacing = rowSpacing * (1 - internalBoundaryInfluence * 0.16);
          const localSegmentLength = segmentLen * (1 + internalBoundaryInfluence * 0.18);

          // Unified global coordinate system prevents phase breaks at object borders.
          // When AI Object Flow is active, the continuous Poisson field connects
          // adjacent parts seamlessly. For fallback or surface mode, unified canvas
          // coordinates ensure touching patches share identical stitch alignment.
          const phaseX = x;
          const phaseY = y;
          // Pure directional projection: produces straight, parallel, uniform stitch rows
          // at the calculated local stitch angle without any topological vortices or fingerprint whorls.
          const rowCoord = x * perpX + y * perpY;
          const rowIndex = Math.floor(rowCoord / localRowSpacing);
          const rowMod = ((rowCoord % localRowSpacing) + localRowSpacing) % localRowSpacing;
          const normRowPos = (rowMod / localRowSpacing) * 2 - 1; // -1 to 1 across thread width

          // Stagger alternate rows (1/3 segment offset for authentic commercial Tatami brick weave)
          const staggerOffset = (Math.abs(rowIndex) % 3) * (localSegmentLength / 3);
          const longCoord = (x * tangentX + y * tangentY) + staggerOffset;
          const segMod = ((longCoord % localSegmentLength) + localSegmentLength) % localSegmentLength;
          const normSegPos = (segMod / localSegmentLength) * 2 - 1; // -1 to 1 along segment

          let jitter = 0;
          if (settings.stitchJitter > 0) {
            jitter = (Math.sin(rowIndex * 12.9898 + normSegPos * 78.233) * 0.5) * (settings.stitchJitter * 0.07);
          }

          // Calendered thread strand profile: simulates soft spun polyester/rayon flattened
          // under machine tension (100g pull) against adjacent threads and underlay.
          const absRow = Math.abs(normRowPos);
          const absSeg = Math.abs(normSegPos);
          const rowProfile = Math.max(0, 1.0 - Math.pow(absRow, 1.7));
          // Authentic needle pull: thread crowns gently in stitch center and tapers into puncture holes
          const segProfile = Math.max(0, 1.0 - Math.pow(absSeg, 2.8));
          const combinedHeight = (0.26 + 0.74 * rowProfile) * (0.32 + 0.68 * segProfile);

          // Balanced 3D normal: stitch segment curvature is visible alongside cross-row curvature,
          // creating authentic pillowy brick-weave stitches rather than continuous extruded pipes.
          normalX = (normRowPos * perpX * 0.62 + normSegPos * tangentX * 0.58 + jitter) * 0.78;
          normalY = (normRowPos * perpY * 0.62 + normSegPos * tangentY * 0.58 + jitter) * 0.78;
          normalZ = Math.max(0.25, combinedHeight * (0.65 + settings.embroideryDepth * 0.14));

          // Physical Needle Puncture Cavity + Soft Row Crevice AO:
          // Tight contact line between pressed threads instead of wide dark canyons.
          const rowCrevice = Math.pow(absRow, 3.2) * (settings.ambientOcclusion * 0.042);
          const needleCavity = Math.pow(absSeg, 4.2) * (punctureStrength * 0.42);
          creviceAO = Math.max(0.36, 1.0 - (rowCrevice + needleCavity));
          creviceAO *= 1 - internalBoundaryInfluence * 0.16;

          threadFiberPhase = longCoord * (settings.threadTwist * 0.3);
        }

        // Classic keeps the restored strand response byte-for-byte. Natural
        // adds the recovered secondary ply and filament ridge frequencies.
        const twistWave = Math.sin(threadFiberPhase) * (settings.threadTwist * 0.04);
        const combinedFiberNormal = useNaturalThread
          ? twistWave +
            Math.sin(threadFiberPhase * 2.03 + 0.8) * (settings.threadTwist * 0.012) +
            Math.sin(threadFiberPhase * 6.1 + 1.7) * 0.014
          : twistWave;
        normalX += combinedFiberNormal * tangentY;
        normalY -= combinedFiberNormal * tangentX;

        // Perimeter edge bevel falloff for 3D raised patch feel
        const edgeDepthFactor = Math.min(1.0, d / (3.5 * targetScale));
        normalZ *= edgeDepthFactor;

        // Normalize 3D Normal
        const normalLen = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ) || 1.0;
        const nx = normalX / normalLen;
        const ny = normalY / normalLen;
        const nz = normalZ / normalLen;

        // 6. DYE-PRESERVING DUAL-LUSTER ANISOTROPIC OPTICS
        // A. Diffuse light with ambient floor
        const nDotL = Math.max(0, nx * lx + ny * ly + nz * lz);
        const diffuse = 0.48 + 0.52 * nDotL;

        // B. Anisotropic Silky Luster (Runs along cylinder, enhances thread's natural dye color)
        const tDotL = tangentX * lx + tangentY * ly;
        const viewZ = 1.0;
        const tDotV = 0.0;
        const sinTL = Math.sqrt(Math.max(0, 1.0 - tDotL * tDotL));
        const sinTV = 1.0;
        const broadSheen = Math.pow(Math.max(0, sinTL * sinTV - tDotL * tDotV), 14.0);

        // C. Micro-Glint (2-ply twisted fiber strand glint)
        const halfX = lx;
        const halfY = ly;
        const halfZ = lz + viewZ;
        const halfLen = Math.sqrt(halfX * halfX + halfY * halfY + halfZ * halfZ) || 1.0;
        const nDotH = Math.max(0, nx * (halfX / halfLen) + ny * (halfY / halfLen) + nz * (halfZ / halfLen));
        const microGlint = Math.pow(nDotH, 40.0) * (0.6 + 0.4 * Math.cos(threadFiberPhase));

        // 7. BALANCED ILLUMINATION
        // Silky thread luster factor multiplies the dye color directly (100% color accuracy, no white wash)
        const lusterMultiplier = 1.0 + broadSheen * (settings.specularStrength * 0.08);
        const litFactor = diffuse * lusterMultiplier * creviceAO;

        let litR = r * litFactor;
        let litG = g * litFactor;
        let litB = b * litFactor;

        // Pinpoint specular glint only on extreme peaks
        const glintAmount = microGlint * (settings.specularStrength * 0.05) * 255;
        litR += glintAmount;
        litG += glintAmount;
        litB += glintAmount;

        outPixels[idx] = Math.min(255, Math.max(0, Math.round(litR)));
        outPixels[idx + 1] = Math.min(255, Math.max(0, Math.round(litG)));
        outPixels[idx + 2] = Math.min(255, Math.max(0, Math.round(litB)));
        outPixels[idx + 3] = alpha;
      }
    }

    // 8. Contact Shadow & Fabric Substrate Composition Pass
    const finalCanvas = createRenderCanvas();
    finalCanvas.width = width;
    finalCanvas.height = height;
    const finalCtx = finalCanvas.getContext('2d', { willReadFrequently: true })!;

    const tempCanvas = this.offscreenCanvas;
    const tempCtx = this.offscreenCtx;
    tempCtx.putImageData(outputData, 0, 0);

    const hasFabricSubstrate = settings.fabricSubstrate && settings.fabricSubstrate !== 'none';

    if (hasFabricSubstrate) {
      // 8a. Procedural Physical Fabric Substrate (Leather, Denim, Fleece, Twill Patch, Linen)
      const substrateCanvas = FabricSubstrateEngine.compositeWithFabric(
        tempCanvas,
        width,
        height,
        settings,
        targetScale
      );
      finalCtx.drawImage(substrateCanvas, 0, 0);
    } else if (settings.shadowStrength > 0) {
      // 8b. Clean Transparent Background with Soft Contact Shadow
      const shadowDistance = (settings.shadowDistance * 0.8 + 2.0) * targetScale;
      const shadowBlur = (settings.shadowBlur * 0.8 + 3.0) * targetScale;
      const shadowAngleRad = (settings.lightAngle * Math.PI) / 180 + Math.PI;

      const shadowOffsetX = Math.cos(shadowAngleRad) * shadowDistance;
      const shadowOffsetY = Math.sin(shadowAngleRad) * shadowDistance;

      finalCtx.save();
      finalCtx.shadowColor = `rgba(0, 0, 0, ${0.15 + (settings.shadowStrength / 10) * 0.45})`;
      finalCtx.shadowBlur = shadowBlur;
      finalCtx.shadowOffsetX = shadowOffsetX;
      finalCtx.shadowOffsetY = shadowOffsetY;

      finalCtx.drawImage(tempCanvas, 0, 0);
      finalCtx.restore();

      finalCtx.drawImage(tempCanvas, 0, 0);
    } else {
      finalCtx.drawImage(tempCanvas, 0, 0);
    }

    return {
      canvas: finalCanvas,
      width,
      height,
      renderTimeMs: performance.now() - startTime,
      constructionMode,
      objectCount: segmentation?.reliable ? segmentation.objects.length : undefined,
      statusMessage
    };
  }

  /**
   * Fast Adaptive Thread Spool Color Quantization (Hue & Saturation Preserving)
   */
  private quantizeToThreadSpools(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    maxColors: number
  ): Uint8ClampedArray {
    const quantized = new Uint8ClampedArray(pixels.length);
    quantized.set(pixels);

    // Sample color frequency in 5-bit color space (32x32x32 buckets)
    const colorHistogram = new Map<number, { r: number; g: number; b: number; count: number }>();
    const total = width * height;

    const step = Math.max(1, Math.floor(total / 50000));
    for (let i = 0; i < total; i += step) {
      const idx = i * 4;
      if (pixels[idx + 3] > 25) {
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

        const existing = colorHistogram.get(key);
        if (existing) {
          existing.count++;
        } else {
          colorHistogram.set(key, { r, g, b, count: 1 });
        }
      }
    }

    if (colorHistogram.size === 0) return quantized;

    const sortedBuckets = Array.from(colorHistogram.values()).sort((a, b) => b.count - a.count);
    const centroids: ColorCluster[] = [];

    for (const bucket of sortedBuckets) {
      if (centroids.length >= maxColors) break;

      let isDistinct = true;
      for (const c of centroids) {
        const dr = bucket.r - c.r;
        const dg = bucket.g - c.g;
        const db = bucket.b - c.b;
        // Perceptual distance (red/green weighted)
        const distSq = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
        if (distSq < 200) {
          isDistinct = false;
          break;
        }
      }

      if (isDistinct) {
        centroids.push({ r: bucket.r, g: bucket.g, b: bucket.b });
      }
    }

    if (centroids.length === 0) return quantized;

    const lut = new Map<number, ColorCluster>();

    for (let i = 0; i < total; i++) {
      const idx = i * 4;
      if (pixels[idx + 3] >= 40) {
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

        let match = lut.get(key);
        if (!match) {
          let bestDist = Infinity;
          let bestCentroid = centroids[0];
          for (const c of centroids) {
            const dr = r - c.r;
            const dg = g - c.g;
            const db = b - c.b;
            const dist = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
            if (dist < bestDist) {
              bestDist = dist;
              bestCentroid = c;
            }
          }
          match = bestCentroid;
          lut.set(key, match);
        }

        quantized[idx] = match.r;
        quantized[idx + 1] = match.g;
        quantized[idx + 2] = match.b;
      }
    }

    return quantized;
  }

  /**
   * Distance transform and normal gradient computation
   */
  private computeDistanceAndBorders(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    borderThickness: number
  ): Float32Array {
    const total = width * height;
    const distanceMap = new Float32Array(total);

    const INF = 99999.0;
    for (let i = 0; i < total; i++) {
      distanceMap[i] = pixels[i * 4 + 3] >= 40 ? INF : 0.0;
    }

    // Forward pass
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (distanceMap[idx] === 0) continue;

        let minD = distanceMap[idx];
        const dL = distanceMap[idx - 1] + 1.0;
        const dU = distanceMap[idx - width] + 1.0;
        const dUL = distanceMap[idx - width - 1] + 1.414;
        const dUR = distanceMap[idx - width + 1] + 1.414;

        if (dL < minD) minD = dL;
        if (dU < minD) minD = dU;
        if (dUL < minD) minD = dUL;
        if (dUR < minD) minD = dUR;
        distanceMap[idx] = minD;
      }
    }

    // Backward pass
    for (let y = height - 2; y > 0; y--) {
      for (let x = width - 2; x > 0; x--) {
        const idx = y * width + x;
        if (distanceMap[idx] === 0) continue;

        let minD = distanceMap[idx];
        const dR = distanceMap[idx + 1] + 1.0;
        const dD = distanceMap[idx + width] + 1.0;
        const dDR = distanceMap[idx + width + 1] + 1.414;
        const dDL = distanceMap[idx + width - 1] + 1.414;

        if (dR < minD) minD = dR;
        if (dD < minD) minD = dD;
        if (dDR < minD) minD = dDR;
        if (dDL < minD) minD = dDL;
        distanceMap[idx] = minD;
      }
    }

    return distanceMap;
  }
}
