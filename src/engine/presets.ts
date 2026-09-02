import { EmbroideryPreset, EmbroiderySettings } from '../types';

export const DEFAULT_EMBROIDERY_SETTINGS: EmbroiderySettings = {
  presetId: 'tatami_standard',
  renderStyle: 'classic',
  stitchPlanningMode: 'surface',
  designWidthMm: 100,

  // Stitch Fill
  stitchAngle: 45,
  stitchDensity: 5.5,
  threadThickness: 5.0,
  stitchLength: 8.0,
  stitchJitter: 2.0,
  threadTwist: 6.0,

  // Border / Edge
  borderType: 'satin',
  borderThickness: 5.0,
  borderColor: '#111111',
  useCustomBorderColor: false,

  // 3D Depth & Lighting
  lightAngle: 135,
  lightElevation: 45,
  embroideryDepth: 5.5,
  specularStrength: 6.5,
  ambientOcclusion: 6.0,
  needlePunctureDepth: 6.0,
  shadowStrength: 5.0,
  shadowBlur: 8.0,
  shadowDistance: 6.0,

  // Color & Palette
  colorMode: 'original',
  quantizeColors: false,
  maxColors: 16,
  monochromeColor: '#C41230',
  paletteId: 'madeira_classic',
  brightness: 0,
  contrast: 5,
  saturation: 10,

  // Scale
  renderScale: 1
};

export const EMBROIDERY_PRESETS: EmbroideryPreset[] = [
  {
    id: 'tatami_standard',
    name: 'Standard Tatami Fill',
    description: 'Classic commercial embroidery with 45° angled parallel weave and satin perimeter border',
    category: 'Commercial',
    settings: {
      presetId: 'tatami_standard',
      stitchAngle: 45,
      stitchDensity: 5.5,
      threadThickness: 5.0,
      stitchLength: 8.0,
      stitchJitter: 2.0,
      threadTwist: 6.0,
      borderType: 'satin',
      borderThickness: 5.0,
      embroideryDepth: 5.5,
      specularStrength: 6.5,
      ambientOcclusion: 6.0,
      needlePunctureDepth: 6.0,
      quantizeColors: false,
      maxColors: 16,
      shadowStrength: 5.0,
      useCustomBorderColor: false
    }
  },
  {
    id: 'satin_crest',
    name: 'Heavy Satin Crest',
    description: 'Bold satin-stitched badge with prominent raised relief and high thread luster',
    category: 'Emblem',
    settings: {
      presetId: 'satin_crest',
      stitchAngle: 90,
      stitchDensity: 7.5,
      threadThickness: 6.5,
      stitchLength: 12.0,
      stitchJitter: 1.0,
      threadTwist: 7.0,
      borderType: 'satin',
      borderThickness: 8.0,
      embroideryDepth: 7.5,
      specularStrength: 8.0,
      ambientOcclusion: 7.5,
      needlePunctureDepth: 7.0,
      quantizeColors: false,
      maxColors: 14,
      shadowStrength: 7.0,
      useCustomBorderColor: false
    }
  },
  {
    id: 'puff_cap_3d',
    name: '3D Puff Cap Stitch',
    description: 'High-relief foam-backed 3D embroidery designed for structured caps and outerwear',
    category: 'Apparel',
    settings: {
      presetId: 'puff_cap_3d',
      stitchAngle: 60,
      stitchDensity: 8.0,
      threadThickness: 7.5,
      stitchLength: 10.0,
      stitchJitter: 1.5,
      threadTwist: 8.0,
      borderType: 'satin',
      borderThickness: 10.0,
      embroideryDepth: 9.5,
      specularStrength: 8.5,
      ambientOcclusion: 9.0,
      needlePunctureDepth: 8.5,
      quantizeColors: false,
      maxColors: 12,
      shadowStrength: 8.5,
      shadowDistance: 10.0,
      useCustomBorderColor: false
    }
  },
  {
    id: 'gold_metallic',
    name: 'Metallic Gold Thread',
    description: 'Foil-wrapped metallic thread with intense directional sheen and sharp highlights',
    category: 'Luxury',
    settings: {
      presetId: 'gold_metallic',
      stitchAngle: 30,
      stitchDensity: 6.5,
      threadThickness: 4.5,
      stitchLength: 7.0,
      stitchJitter: 1.0,
      threadTwist: 9.0,
      borderType: 'satin',
      borderThickness: 6.0,
      embroideryDepth: 6.0,
      specularStrength: 10.0,
      ambientOcclusion: 6.5,
      needlePunctureDepth: 5.5,
      quantizeColors: false,
      maxColors: 10,
      shadowStrength: 5.5,
      colorMode: 'palette',
      paletteId: 'metallic_luxury',
      useCustomBorderColor: false
    }
  },
  {
    id: 'vintage_chainstitch',
    name: 'Vintage Chainstitch',
    description: 'Textured handmade chainstitch aesthetic with subtle irregularity and soft luster',
    category: 'Vintage',
    settings: {
      presetId: 'vintage_chainstitch',
      stitchAngle: 120,
      stitchDensity: 4.0,
      threadThickness: 6.0,
      stitchLength: 6.0,
      stitchJitter: 6.0,
      threadTwist: 4.0,
      borderType: 'running',
      borderThickness: 4.0,
      embroideryDepth: 4.5,
      specularStrength: 4.0,
      ambientOcclusion: 5.0,
      needlePunctureDepth: 5.0,
      quantizeColors: false,
      maxColors: 12,
      shadowStrength: 4.0,
      useCustomBorderColor: false
    }
  },
  {
    id: 'heavy_merrowed',
    name: 'Merrowed Edge Patch',
    description: 'Heavy military-grade overlock merrowed border enclosing a tight tatami fill',
    category: 'Patch',
    settings: {
      presetId: 'heavy_merrowed',
      stitchAngle: 45,
      stitchDensity: 6.0,
      threadThickness: 5.5,
      stitchLength: 9.0,
      stitchJitter: 2.0,
      threadTwist: 6.0,
      borderType: 'merrowed',
      borderThickness: 12.0,
      embroideryDepth: 7.0,
      specularStrength: 6.0,
      ambientOcclusion: 8.0,
      needlePunctureDepth: 7.5,
      quantizeColors: false,
      maxColors: 14,
      shadowStrength: 7.5,
      useCustomBorderColor: false
    }
  },
  {
    id: 'micro_detail',
    name: 'Fine Micro Stitch',
    description: 'Ultra-dense fine gauge thread for small typography, intricate crests, and fine lines',
    category: 'Detail',
    settings: {
      presetId: 'micro_detail',
      stitchAngle: 0,
      stitchDensity: 8.5,
      threadThickness: 3.0,
      stitchLength: 4.0,
      stitchJitter: 1.0,
      threadTwist: 8.0,
      borderType: 'running',
      borderThickness: 2.5,
      embroideryDepth: 3.5,
      specularStrength: 7.0,
      ambientOcclusion: 4.5,
      needlePunctureDepth: 4.0,
      quantizeColors: false,
      maxColors: 20,
      shadowStrength: 3.5,
      useCustomBorderColor: false
    }
  }
];
