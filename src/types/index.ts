export type AppScreen = 'create' | 'embroidery' | 'mockup';

export type ToolType = 'hand' | 'zoom';

export type BorderType = 'satin' | 'merrowed' | 'running' | 'none';

export type ColorMode = 'original' | 'monochrome' | 'palette';

export type EmbroideryRenderStyle = 'classic' | 'natural';

export type StitchPlanningMode = 'thread-studio' | 'surface' | 'object-aware';

export type ThreadStudioPresetId = 'cleanLogo' | 'realistic' | 'satin' | 'puff';

export interface ThreadStudioConfig {
  preset?: ThreadStudioPresetId;
  lightAngle?: number;   // 0 to 360 deg (default 225)
  lightHeight?: number;  // 20 to 85 deg (default 48)
  threadWidth: number;   // 1.1 to 6.5 px (default 2.0)
  spacing: number;       // 1.5 to 9.5 px (default 2.2)
  stitchLen: number;     // 4.0 to 30.0 px (default 8.5)
  fillAngle: number;     // -90 to 90 deg (default 18)
  bandSize?: number;     // 10 to 70 px (default 18)
  edgeWidth: number;     // 0 to 14 px (default 2.2)
  edgeDensity: number;   // 25 to 100 % (default 50)
  shine: number;         // 0 to 100 % (default 46)
  roughness: number;     // 0 to 100 % (default 8)
  depth?: number;        // 0 to 16 px (default 4.0)
  drawEdge: boolean;     // default true
  drawOutline: boolean;  // default false
  drawFuzz: boolean;     // default false
}

export type FabricSubstrateType =
  | 'none'
  | 'black_leather'
  | 'indigo_denim'
  | 'olive_sweatshirt'
  | 'heather_grey'
  | 'canvas_patch'
  | 'vintage_linen';

export interface EmbroiderySettings {
  // Preset identifier
  presetId?: string;

  // Rendering engine
  renderStyle: EmbroideryRenderStyle;
  stitchPlanningMode: StitchPlanningMode;
  threadStudio?: ThreadStudioConfig;

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

  // Fabric Substrate & Backing
  fabricSubstrate?: FabricSubstrateType;
  fabricColor?: string;

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
  fabricTextureStrength?: number;
  creviceShadowStrength?: number;
}

export interface MockupTemplate {
  id: string;
  name: string;
  category: 'shirt' | 'sweatshirt' | 'hat' | 'tote' | 'jacket' | 'bag' | 'other' | string;
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
  filename?: string;
  isCustom?: boolean;
}

export interface DiskMockupFile {
  filename: string;
  name: string;
  category: string;
  url: string;
  mtime: number;
  size: number;
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

declare global {
  interface Window {
    electronAPI?: {
      listMockupFiles?: () => Promise<DiskMockupFile[]>;
      openMockupsFolder?: () => Promise<boolean>;
      onMockupsChanged?: (callback: (files: DiskMockupFile[]) => void) => () => void;
      saveUserSettings?: (data: unknown) => Promise<boolean>;
      loadUserSettings?: () => Promise<unknown>;
    };
  }
}
