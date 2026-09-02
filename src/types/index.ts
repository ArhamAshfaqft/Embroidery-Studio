export type AppScreen = 'create' | 'embroidery' | 'mockup';

export type ToolType = 'hand' | 'zoom';

export type BorderType = 'satin' | 'merrowed' | 'running' | 'none';

export type ColorMode = 'original' | 'monochrome' | 'palette';

export type EmbroideryRenderStyle = 'classic' | 'natural';

export type StitchPlanningMode = 'surface' | 'object-aware';

export interface EmbroiderySettings {
  // Preset identifier
  presetId?: string;

  // Rendering engine
  renderStyle: EmbroideryRenderStyle;
  stitchPlanningMode: StitchPlanningMode;

  // Physical design size used by the object-aware planner
  designWidthMm: number;

  // Stitch Fill
  stitchAngle: number; // 0 to 360 degrees
  stitchDensity: number; // 1 to 10
  threadThickness: number; // 1 to 10
  stitchLength: number; // 2 to 20 mm
  stitchJitter: number; // 0 to 10
  threadTwist: number; // 1 to 10

  // Border / Edge
  borderType: BorderType;
  borderThickness: number; // 1 to 20 px
  borderColor: string;
  useCustomBorderColor: boolean;

  // 3D Depth & Lighting
  lightAngle: number; // 0 to 360 degrees
  lightElevation: number; // 15 to 85 degrees
  embroideryDepth: number; // 1 to 10
  specularStrength: number; // 0 to 10
  ambientOcclusion: number; // 0 to 10
  needlePunctureDepth: number; // 0 to 10
  shadowStrength: number; // 0 to 10
  shadowBlur: number; // 0 to 20 px
  shadowDistance: number; // 0 to 20 px

  // Color & Palette
  colorMode: ColorMode;
  quantizeColors: boolean; // Quantize gradients into authentic solid thread spools
  maxColors: number; // 4 to 32 discrete thread spools
  monochromeColor: string;
  paletteId: string;
  brightness: number; // -50 to 50
  contrast: number; // -50 to 50
  saturation: number; // -50 to 50

  // Scale
  renderScale: number;
}

export interface TextConfig {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  letterSpacing: number;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
  archAngle: number;
  uppercase: boolean;
}

export interface SourceAsset {
  type: 'image' | 'text';
  id: string;
  name: string;
  dataUrl?: string;
  width: number;
  height: number;
  textConfig?: TextConfig;
}

export interface MockupTransform {
  x: number; // percentage
  y: number; // percentage
  scale: number;
  rotation: number;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'overlay' | 'hard-light';
  displacementStrength: number;
  shadowIntensity: number;
}

export interface MockupTemplate {
  id: string;
  name: string;
  category: 'shirt' | 'sweatshirt' | 'hat' | 'tote';
  imageUrl: string;
  width: number;
  height: number;
  defaultTransform: MockupTransform;
  placementZone?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ThreadColor {
  name: string;
  code: string;
  hex: string;
  category: string;
}

export interface ThreadPalette {
  id: string;
  name: string;
  description: string;
  colors: ThreadColor[];
}

export interface EmbroideryPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  settings: Partial<EmbroiderySettings>;
}

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp';
  resolutionMultiplier: 1 | 2 | 3 | 4;
  transparentBackground: boolean;
  quality: number;
  includeMockup: boolean;
  fileName: string;
}

export interface HistoryStep {
  description: string;
  settings: EmbroiderySettings;
  transform: MockupTransform;
  timestamp: number;
}
