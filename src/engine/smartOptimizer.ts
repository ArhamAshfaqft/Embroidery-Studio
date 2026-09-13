import { EmbroiderySettings } from '../types';
import { DEFAULT_EMBROIDERY_SETTINGS } from './presets';

export interface SmartAnalysisResult {
  designType: 'solid_crest' | 'fine_typography' | 'detailed_mascot' | 'metallic_emblem' | 'fine_detail' | 'line_art' | 'standard_logo';
  designTypeLabel: string;
  confidence: number; // 0 to 100
  dominantHue: string; // e.g. 'Gold / Amber', 'Navy Blue', 'Monochrome', 'Multi-color'
  averageStrokeWidth: number; // in pixels
  fillCoverageRatio: number; // 0 to 1
  keyDecisions: string[];
  optimizedSettings: EmbroiderySettings;
}

export class SmartOptimizer {
  private analysisCanvas: HTMLCanvasElement | null = null;
  private analysisCtx: CanvasRenderingContext2D | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      this.analysisCanvas = document.createElement('canvas');
      this.analysisCtx = this.analysisCanvas.getContext('2d', { willReadFrequently: true });
    }
  }

  /**
   * Analyze input artwork and calculate optimal embroidery settings
   */
  public analyzeAndOptimize(
    sourceImg: HTMLImageElement | HTMLCanvasElement,
    currentSettings: EmbroiderySettings = DEFAULT_EMBROIDERY_SETTINGS
  ): SmartAnalysisResult {
    if (!this.analysisCanvas && typeof document !== 'undefined') {
      this.analysisCanvas = document.createElement('canvas');
      this.analysisCtx = this.analysisCanvas.getContext('2d', { willReadFrequently: true });
    }

    if (!this.analysisCanvas || !this.analysisCtx) {
      return {
        designType: 'standard_logo',
        designTypeLabel: 'Commercial Emblem',
        confidence: 90,
        dominantHue: 'Multi-color',
        averageStrokeWidth: 8.0,
        fillCoverageRatio: 0.5,
        keyDecisions: ['Analyzed using standard commercial heuristics.'],
        optimizedSettings: { ...currentSettings }
      };
    }

    const srcW = sourceImg.width || (sourceImg as HTMLImageElement).naturalWidth || 500;
    const srcH = sourceImg.height || (sourceImg as HTMLImageElement).naturalHeight || 500;

    // Scale to standard analysis resolution (500x500 max for instant calculation)
    const maxDim = 500;
    const scale = Math.min(1.0, maxDim / Math.max(srcW, srcH));
    const width = Math.max(50, Math.round(srcW * scale));
    const height = Math.max(50, Math.round(srcH * scale));

    this.analysisCanvas.width = width;
    this.analysisCanvas.height = height;
    const ctx = this.analysisCtx;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(sourceImg, 0, 0, width, height);

    const imgData = ctx.getImageData(0, 0, width, height);
    const pixels = imgData.data;
    const totalPixels = width * height;

    let nonTransparentCount = 0;
    let minX = width, maxX = 0, minY = height, maxY = 0;

    // Color metrics
    let totalR = 0, totalG = 0, totalB = 0;
    let goldPixelCount = 0;
    let darkPixelCount = 0;
    let uniqueColorBuckets = new Set<string>();

    // Spatial moment variables for principal axis orientation
    let m10 = 0, m01 = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const a = pixels[idx + 3];

        if (a >= 40) {
          nonTransparentCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;

          m10 += x;
          m01 += y;

          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];

          totalR += r;
          totalG += g;
          totalB += b;

          // Check for Gold / Metallic tones (high red/green, lower blue)
          const hsv = this.rgbToHsv(r, g, b);
          if (hsv.h >= 35 && hsv.h <= 55 && hsv.s >= 0.35 && hsv.v >= 0.5) {
            goldPixelCount++;
          }
          if (hsv.v < 0.25) {
            darkPixelCount++;
          }

          const bucket = `${Math.floor(r / 32)}_${Math.floor(g / 32)}_${Math.floor(b / 32)}`;
          uniqueColorBuckets.add(bucket);
        }
      }
    }

    if (nonTransparentCount === 0) {
      return {
        designType: 'standard_logo',
        designTypeLabel: 'Commercial Logo',
        confidence: 85,
        dominantHue: 'Multi-color',
        averageStrokeWidth: 8,
        fillCoverageRatio: 0.5,
        keyDecisions: ['No opaque content detected. Applied balanced commercial defaults.'],
        optimizedSettings: { ...currentSettings }
      };
    }

    const bboxW = Math.max(1, maxX - minX + 1);
    const bboxH = Math.max(1, maxY - minY + 1);
    const bboxArea = bboxW * bboxH;
    const fillCoverageRatio = nonTransparentCount / bboxArea;

    // Centroid
    const cx = m10 / nonTransparentCount;
    const cy = m01 / nonTransparentCount;

    // Second central moments (Inertia Tensor)
    let mu20 = 0, mu02 = 0, mu11 = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = (y * width + x) * 4;
        if (pixels[idx + 3] >= 40) {
          const dx = x - cx;
          const dy = y - cy;
          mu20 += dx * dx;
          mu02 += dy * dy;
          mu11 += dx * dy;
        }
      }
    }

    // Principal Orientation Angle
    let principalAngleRad = 0.5 * Math.atan2(2 * mu11, mu20 - mu02);
    let principalDeg = Math.round((principalAngleRad * 180) / Math.PI);
    if (principalDeg < 0) principalDeg += 180;

    let optimalStitchAngle = (principalDeg + 45) % 180;
    if (optimalStitchAngle < 15) optimalStitchAngle = 45;

    // Distance map stroke estimation
    const distanceMap = this.computeFastDistanceMap(pixels, width, height);
    let maxDistance = 0;
    let distanceSum = 0;
    let distanceCount = 0;

    for (let i = 0; i < totalPixels; i++) {
      const d = distanceMap[i];
      if (d > 0 && d < 9999) {
        distanceSum += d;
        distanceCount++;
        if (d > maxDistance) maxDistance = d;
      }
    }

    const avgDistance = distanceCount > 0 ? distanceSum / distanceCount : 4;
    const strokeThicknessEstimated = avgDistance * 2.0;

    const hasMultipleColorThemes = uniqueColorBuckets.size >= 4;
    const isDetailedMascot = hasMultipleColorThemes && fillCoverageRatio > 0.35;
    const isGoldMetallic = !isDetailedMascot && (goldPixelCount / nonTransparentCount > 0.28);
    const isFineDetail = strokeThicknessEstimated < 7.0 || fillCoverageRatio < 0.24;
    const isSolidCrest = fillCoverageRatio > 0.55 && maxDistance > 14;
    const isTypography = bboxW / bboxH > 2.0 || (strokeThicknessEstimated >= 7.0 && strokeThicknessEstimated <= 14.0 && fillCoverageRatio < 0.45);

    let designType: SmartAnalysisResult['designType'] = 'standard_logo';
    let designTypeLabel = 'Commercial Emblem';
    let confidence = 92;
    const decisions: string[] = [];

    const newSettings: EmbroiderySettings = {
      ...currentSettings,
      // Preserve each engine's established result: Classic retains its original
      // commercial spool optimization while Natural keeps the full source palette.
      quantizeColors: currentSettings.renderStyle === 'natural' ? false : true,
      maxColors: Math.min(24, Math.max(6, uniqueColorBuckets.size)),
      needlePunctureDepth: 6.5
    };
    newSettings.stitchAngle = optimalStitchAngle;
    decisions.push(`Calculated principal visual axis (${principalDeg}°) -> Set stitch angle to ${optimalStitchAngle}° for anisotropic sheen.`);

    if (isDetailedMascot) {
      designType = 'detailed_mascot';
      designTypeLabel = 'Detailed Mascot / Character';
      confidence = 96;
      newSettings.presetId = 'tatami_standard';
      newSettings.stitchPlanningMode = 'object-aware';
      newSettings.threadThickness = 4.8;
      newSettings.stitchDensity = 6.8;
      newSettings.stitchLength = 4.8;
      newSettings.threadTwist = 5.5;
      newSettings.borderType = 'satin';
      newSettings.borderThickness = Math.max(4, Math.min(8, maxDistance * 0.35));
      newSettings.embroideryDepth = 5.5;
      newSettings.ambientOcclusion = 5.5;
      newSettings.specularStrength = 7.2;
      decisions.push(`Detected multi-color mascot illustration (${uniqueColorBuckets.size} colors) -> Activated seamless AI Object-Aware with tight 6.8 commercial density, 4.8mm Tatami brick-weave, and 5.5 silky twist.`);
    } else if (isGoldMetallic) {
      designType = 'metallic_emblem';
      designTypeLabel = 'Metallic Gold Thread';
      confidence = 96;
      newSettings.presetId = 'gold_metallic';
      newSettings.specularStrength = 8.8;
      newSettings.threadTwist = 6.2;
      newSettings.embroideryDepth = 6.0;
      newSettings.colorMode = 'original';
      newSettings.borderType = 'satin';
      newSettings.borderThickness = Math.max(3, Math.min(10, maxDistance * 0.4));
      decisions.push('Detected prominent gold/warm hues -> Configured high-luster metallic thread profile.');
    } else if (isFineDetail) {
      designType = 'fine_detail';
      designTypeLabel = 'Fine Detail / Line-Art';
      confidence = 94;
      newSettings.presetId = 'micro_detail';
      newSettings.threadThickness = 3.2;
      newSettings.stitchDensity = 8.0;
      newSettings.stitchLength = 4.0;
      newSettings.stitchJitter = 1.0;
      newSettings.borderType = 'running';
      newSettings.borderThickness = 2.5;
      newSettings.embroideryDepth = 4.0;
      newSettings.specularStrength = 6.5;
      decisions.push(`Detected fine strokes (avg ${strokeThicknessEstimated.toFixed(1)}px) -> Reduced thread thickness to 3.2px with micro running border to preserve legibility.`);
    } else if (isSolidCrest) {
      designType = 'solid_crest';
      designTypeLabel = '3D Structured Patch';
      confidence = 95;
      newSettings.presetId = 'puff_cap_3d';
      newSettings.threadThickness = 6.0;
      newSettings.stitchDensity = 7.0;
      newSettings.stitchLength = 5.5;
      newSettings.borderType = 'satin';
      newSettings.borderThickness = Math.max(6, Math.min(12, maxDistance * 0.5));
      newSettings.embroideryDepth = 7.5;
      newSettings.ambientOcclusion = 6.5;
      newSettings.shadowStrength = 7.0;
      newSettings.specularStrength = 7.5;
      decisions.push(`Detected heavy solid fill (${Math.round(fillCoverageRatio * 100)}% coverage) -> Enabled 3D puff relief (7.5) and thick satin border.`);
    } else if (isTypography) {
      designType = 'fine_typography';
      designTypeLabel = 'Typography Wordmark';
      confidence = 93;
      newSettings.presetId = 'satin_crest';
      newSettings.threadThickness = 4.8;
      newSettings.stitchDensity = 6.5;
      newSettings.stitchLength = 4.8;
      newSettings.borderType = 'satin';
      newSettings.borderThickness = 4.5;
      newSettings.embroideryDepth = 5.5;
      newSettings.ambientOcclusion = 6.0;
      newSettings.specularStrength = 7.0;
      decisions.push(`Detected typography wordmark layout -> Optimized satin contour and 5.5 depth relief.`);
    } else {
      designType = 'standard_logo';
      designTypeLabel = 'Commercial Tatami Emblem';
      confidence = 90;
      newSettings.presetId = 'tatami_standard';
      newSettings.threadThickness = 5.0;
      newSettings.stitchDensity = 6.0;
      newSettings.stitchLength = 4.5;
      newSettings.borderType = 'satin';
      newSettings.borderThickness = 5.0;
      newSettings.embroideryDepth = 5.0;
      newSettings.ambientOcclusion = 5.5;
      newSettings.specularStrength = 6.5;
      decisions.push('Balanced commercial logo profile applied with classic 45° Tatami fill.');
    }

    if (newSettings.stitchPlanningMode === 'thread-studio') {
      if (isDetailedMascot || isFineDetail) {
        newSettings.threadStudio = {
          preset: 'realistic',
          threadWidth: 1.7,
          spacing: 2.0,
          stitchLen: 7.5,
          fillAngle: 16,
          bandSize: 15,
          edgeWidth: 1.6,
          edgeDensity: 42,
          roughness: 4,
          shine: 40,
          depth: 3.8,
          drawOutline: false,
          drawFuzz: false,
          drawEdge: true
        };
        decisions.push('Thread Studio: Fine multi-color artwork detected -> Realistic preset with micro-thread detail.');
      } else if (isSolidCrest) {
        newSettings.threadStudio = {
          preset: 'puff',
          threadWidth: 3.0,
          spacing: 2.4,
          stitchLen: 14.0,
          fillAngle: 10,
          bandSize: 18,
          edgeWidth: 6.0,
          edgeDensity: 72,
          roughness: 7,
          shine: 54,
          depth: 7.0,
          drawOutline: false,
          drawFuzz: false,
          drawEdge: true
        };
        decisions.push('Thread Studio: Large solid shape detected -> Raised Puff 3D preset with deep relief.');
      } else if (isTypography) {
        newSettings.threadStudio = {
          preset: 'satin',
          threadWidth: 2.0,
          spacing: 1.9,
          stitchLen: 10.5,
          fillAngle: 0,
          bandSize: 15,
          edgeWidth: 2.8,
          edgeDensity: 60,
          roughness: 5,
          shine: 48,
          depth: 4.5,
          drawOutline: false,
          drawFuzz: false,
          drawEdge: true
        };
        decisions.push('Thread Studio: Lettering / wordmark detected -> Dense Satin preset with smooth sheen.');
      } else {
        newSettings.threadStudio = {
          preset: 'cleanLogo',
          threadWidth: 1.9,
          spacing: 2.2,
          stitchLen: 8.2,
          fillAngle: 18,
          bandSize: 16,
          edgeWidth: 2.0,
          edgeDensity: 46,
          roughness: 6,
          shine: 44,
          depth: 4.0,
          drawOutline: false,
          drawFuzz: false,
          drawEdge: true
        };
        decisions.push('Thread Studio: Commercial badge detected -> Clean Logo preset with balanced brick-weave Tatami.');
      }
    }

    let dominantHue = 'Multi-color';
    if (uniqueColorBuckets.size <= 2) {
      dominantHue = darkPixelCount > nonTransparentCount * 0.7 ? 'Monochrome Dark' : 'Monochrome';
    } else if (isGoldMetallic) {
      dominantHue = 'Gold / Metallic';
    }

    return {
      designType,
      designTypeLabel,
      confidence,
      dominantHue,
      averageStrokeWidth: parseFloat(strokeThicknessEstimated.toFixed(1)),
      fillCoverageRatio: parseFloat(fillCoverageRatio.toFixed(2)),
      keyDecisions: decisions,
      optimizedSettings: newSettings
    };
  }

  private computeFastDistanceMap(pixels: Uint8ClampedArray, width: number, height: number): Float32Array {
    const total = width * height;
    const distanceMap = new Float32Array(total);

    for (let i = 0; i < total; i++) {
      distanceMap[i] = pixels[i * 4 + 3] >= 40 ? 9999 : 0;
    }

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (distanceMap[idx] === 0) continue;

        let minD = distanceMap[idx];
        const dL = distanceMap[idx - 1] + 1;
        const dU = distanceMap[idx - width] + 1;
        if (dL < minD) minD = dL;
        if (dU < minD) minD = dU;
        distanceMap[idx] = minD;
      }
    }

    for (let y = height - 2; y > 0; y--) {
      for (let x = width - 2; x > 0; x--) {
        const idx = y * width + x;
        if (distanceMap[idx] === 0) continue;

        let minD = distanceMap[idx];
        const dR = distanceMap[idx + 1] + 1;
        const dD = distanceMap[idx + width] + 1;
        if (dR < minD) minD = dR;
        if (dD < minD) minD = dD;
        distanceMap[idx] = minD;
      }
    }

    return distanceMap;
  }

  private rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    let h = 0;
    const s = max === 0 ? 0 : diff / max;
    const v = max;

    if (diff !== 0) {
      if (max === r) {
        h = (60 * ((g - b) / diff) + 360) % 360;
      } else if (max === g) {
        h = (60 * ((b - r) / diff) + 120) % 360;
      } else {
        h = (60 * ((r - g) / diff) + 240) % 360;
      }
    }

    return { h, s, v };
  }
}
