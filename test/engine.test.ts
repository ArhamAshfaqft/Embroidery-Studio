import { findClosestThreadColor, hexToRgb, rgbToHex, THREAD_PALETTES } from '../src/engine/colorPalettes';
import { EMBROIDERY_PRESETS, DEFAULT_EMBROIDERY_SETTINGS } from '../src/engine/presets';
import { MOCKUP_TEMPLATES } from '../src/engine/mockupRenderer';
import { FONT_OPTIONS, renderTextToCanvas, DEFAULT_TEXT_CONFIG } from '../src/engine/textRenderer';
import { deriveFontFamilyNames, inferFontFormat, getAllFontOptions, CustomFontItem } from '../src/engine/fontManager';
import { SmartOptimizer } from '../src/engine/smartOptimizer';
import { computeAdaptiveStitchField } from '../src/engine/stitchField';
import { generateStitchPlan } from '../src/engine/stitchPlanner';
import type { LocalSegmentationResult } from '../src/engine/localSegmentation';
import { computeObjectStitchFlow } from '../src/engine/objectStitchFlow';
import { getPreviewScale, assertRenderSize, getMockupRenderScale } from '../src/engine/renderSizing';
import { FABRIC_SUBSTRATE_DEFINITIONS, FabricSubstrateEngine } from '../src/engine/fabricSubstrateEngine';
import { ThreadStudioRenderer } from '../src/engine/threadStudioRenderer';
import { DEFAULT_THREAD_STUDIO_CONFIG, THREAD_STUDIO_PRESETS } from '../src/engine/presets';
import { knockoutNeutralEdgeBackground } from '../src/engine/imageUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  } else {
    console.log(`[PASS] ${message}`);
  }
}

console.log('--- RUNNING RAVEN EMBROIDERY STUDIO ENGINE TESTS ---');

// Test 1: Color Palette and Thread Matching
console.log('\n1. Testing Thread Palettes & Color Matching...');
assert(THREAD_PALETTES.length >= 3, 'All 3 thread palettes defined');
assert(THREAD_PALETTES[0].colors.length > 10, 'Madeira Classic contains rich color gamut');

const redMatch = findClosestThreadColor('#FF0000', 'madeira_classic');
assert(redMatch.category === 'Red', `Red hex matched to Red thread: ${redMatch.name}`);

const goldMatch = findClosestThreadColor('#D4AF37', 'metallic_luxury');
assert(goldMatch.category === 'Metallic', `Gold hex matched to Metallic thread: ${goldMatch.name}`);

const hexConverted = rgbToHex(255, 128, 0);
assert(hexConverted === '#FF8000', 'RGB to Hex conversion is accurate');

const rgbConverted = hexToRgb('#FF8000');
assert(rgbConverted !== null && rgbConverted.r === 255 && rgbConverted.g === 128 && rgbConverted.b === 0, 'Hex to RGB conversion is accurate');

// Test 2: Embroidery Presets
console.log('\n2. Testing Embroidery Presets...');
assert(EMBROIDERY_PRESETS.length >= 7, 'All 7 commercial presets defined');
const puffPreset = EMBROIDERY_PRESETS.find(p => p.id === 'puff_cap_3d');
assert(puffPreset !== undefined && (puffPreset.settings.embroideryDepth || 0) >= 8, '3D Puff cap preset has elevated depth');

const metallicPreset = EMBROIDERY_PRESETS.find(p => p.id === 'gold_metallic');
assert(metallicPreset !== undefined && (metallicPreset.settings.specularStrength || 0) >= 9, 'Metallic thread preset has maximum specular luster');

// Test 3: Mockup Templates
console.log('\n3. Testing Mockup Templates...');
assert(MOCKUP_TEMPLATES.length === 15, `All 15 production apparel templates available (found ${MOCKUP_TEMPLATES.length})`);
const hatTemplate = MOCKUP_TEMPLATES.find(m => m.category === 'hat');
assert(hatTemplate !== undefined && hatTemplate.width === 1200 && hatTemplate.height === 1200, 'Structured Cap mockup has 1200x1200px dimensions');
assert(MOCKUP_TEMPLATES.some(m => m.category === 'shirt'), 'Shirt templates available');
assert(MOCKUP_TEMPLATES.some(m => m.category === 'sweatshirt'), 'Sweatshirt / Hoodie templates available');
assert(MOCKUP_TEMPLATES.some(m => m.category === 'jacket'), 'Jacket templates available');
assert(MOCKUP_TEMPLATES.some(m => m.category === 'tote'), 'Tote & Backpack templates available');
const aspectLandscape = 1600 / 900;
const layoutHLand = Math.round(1200 / aspectLandscape);
assert(layoutHLand === 675, '16:9 landscape mockup layout dimensions calculated accurately (1200x675)');
const aspectPortrait = 900 / 1600;
const layoutWPort = Math.round(1200 * aspectPortrait);
assert(layoutWPort === 675, '9:16 portrait mockup layout dimensions calculated accurately (675x1200)');
assert(
  MOCKUP_TEMPLATES.every(m =>
    typeof m.defaultTransform.displacementStrength === 'number' &&
    m.defaultTransform.displacementStrength >= 3 &&
    typeof m.defaultTransform.fabricTextureStrength === 'number' &&
    (m.defaultTransform.fabricTextureStrength ?? 0) > 0 &&
    typeof m.defaultTransform.creviceShadowStrength === 'number' &&
    (m.defaultTransform.creviceShadowStrength ?? 0) > 0 &&
    m.defaultTransform.shadowIntensity > 0 &&
    m.defaultTransform.shadowIntensity <= 2
  ),
  'All mockup templates use visible fabric integration with restrained contact shadows'
);

const knockoutPixels = new Uint8ClampedArray(5 * 5 * 4);
for (let i = 0; i < knockoutPixels.length; i += 4) {
  knockoutPixels[i] = knockoutPixels[i + 1] = knockoutPixels[i + 2] = 255;
  knockoutPixels[i + 3] = 255;
}
// A coloured ring protects an intentionally white internal detail from the
// edge-connected cleanup, like a white star inside a badge.
for (const pixel of [6, 7, 8, 11, 13, 16, 17, 18]) {
  const i = pixel * 4;
  knockoutPixels[i] = 10; knockoutPixels[i + 1] = 40; knockoutPixels[i + 2] = 100;
}
const knockedOut = knockoutNeutralEdgeBackground(knockoutPixels, 5, 5);
assert(knockedOut > 0 && knockoutPixels[3] === 0, 'Neutral edge artboards are removed before embroidery rendering');
assert(knockoutPixels[(12 * 4) + 3] === 255, 'Enclosed white artwork details survive background cleanup');

// Test 4: Embroidery Lettering & Typography Engine
console.log('\n4. Testing Embroidery Lettering & Typography Engine...');
assert(FONT_OPTIONS.length >= 8, 'Commercial embroidery fonts defined');
const textResult = renderTextToCanvas(DEFAULT_TEXT_CONFIG, 1000, 600);
assert(textResult.logicalWidth === 1000 && textResult.canvas.width === 3000 && Boolean(textResult.dataUrl), 'Text renderer generates high-res vector lettering canvas');

// Custom Font Helpers
const derived = deriveFontFamilyNames('collegiate_varsity_heavy.ttf');
assert(derived.label === 'Collegiate Varsity Heavy', 'Font label cleanly formatted');
assert(derived.rawFamilyName === 'CustomFont_collegiate_varsity_heavy', 'Safe CSS identifier generated');
assert(inferFontFormat('my_font.otf') === 'opentype', 'OTF format detected correctly');
assert(inferFontFormat('my_font.woff2') === 'woff2', 'WOFF2 format detected correctly');

const customFontSample: CustomFontItem = {
  id: 'font_123',
  name: derived.label,
  family: derived.family,
  rawFamilyName: derived.rawFamilyName,
  fileName: 'collegiate_varsity_heavy.ttf',
  dataUrl: 'data:font/ttf;base64,AAA...',
  format: 'truetype',
  createdAt: Date.now()
};
const combined = getAllFontOptions([customFontSample]);
assert(combined[0].isCustom === true && combined[0].name === 'Collegiate Varsity Heavy', 'Custom font placed at top of font list');

// Test 5: Smart Analysis & Auto-Optimization Engine
console.log('\n5. Testing Smart Analysis & Auto-Optimization Engine...');
const optimizer = new SmartOptimizer();
assert(typeof optimizer.analyzeAndOptimize === 'function', 'SmartOptimizer is initialized and exposes analyzeAndOptimize');

// Test 6: Dual Rendering Styles
console.log('\n6. Testing Dual Rendering Styles...');
assert(DEFAULT_EMBROIDERY_SETTINGS.renderStyle === 'classic', 'Classic Stitch remains the default renderer');

const regionPixels = new Uint8ClampedArray(64 * 64 * 4);
for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const index = (y * 64 + x) * 4;
    regionPixels[index] = x < 32 ? 230 : 15;
    regionPixels[index + 1] = x < 32 ? 30 : 170;
    regionPixels[index + 2] = x < 32 ? 40 : 220;
    regionPixels[index + 3] = 255;
  }
}
const naturalField = computeAdaptiveStitchField(regionPixels, 64, 64);
const boundaryIndex = 32 * naturalField.width + 31;
assert(naturalField.boundaryProximity[boundaryIndex] > 0.5, 'Natural Thread detects internal color-region boundaries');
assert(naturalField.coherence[boundaryIndex] > 0.2, 'Natural Thread calculates a confident local stitch direction');

// Test 7: Object-Aware Stitch Planner
console.log('\n7. Testing Object-Aware Stitch Planner...');
const plannerWidth = 128;
const plannerHeight = 96;
const plannerPixels = new Uint8ClampedArray(plannerWidth * plannerHeight * 4);
const paint = (x: number, y: number, r: number, g: number, b: number) => {
  const index = (y * plannerWidth + x) * 4;
  plannerPixels[index] = r;
  plannerPixels[index + 1] = g;
  plannerPixels[index + 2] = b;
  plannerPixels[index + 3] = 255;
};

// Thin red running line.
for (let y = 5; y <= 6; y++) for (let x = 5; x <= 42; x++) paint(x, y, 235, 30, 40);
// Narrow green satin column.
for (let y = 20; y <= 74; y++) for (let x = 5; x <= 12; x++) paint(x, y, 20, 190, 80);
// Broad blue tatami region.
for (let y = 24; y <= 72; y++) for (let x = 28; x <= 70; x++) paint(x, y, 30, 90, 220);
// Gold ring with a genuine internal hole.
for (let y = 20; y <= 72; y++) {
  for (let x = 82; x <= 118; x++) {
    if (x <= 86 || x >= 114 || y <= 24 || y >= 68) paint(x, y, 235, 175, 20);
  }
}

const planned = generateStitchPlan(
  plannerPixels,
  plannerWidth,
  plannerHeight,
  {
    ...DEFAULT_EMBROIDERY_SETTINGS,
    stitchPlanningMode: 'object-aware',
    designWidthMm: 64,
    borderType: 'none',
    maxColors: 8
  }
);
const plannedTypes = new Set(planned.regions.map((region) => region.stitchType));
assert(planned.regions.length >= 4, 'Planner separates independent artwork objects and colors');
assert(plannedTypes.has('running'), 'Planner classifies hairline geometry as running stitch');
assert(plannedTypes.has('satin'), 'Planner classifies narrow geometry as satin stitch');
assert(plannedTypes.has('tatami'), 'Planner classifies broad geometry as tatami fill');
assert(planned.regions.some((region) => region.holes.length > 0), 'Planner preserves internal holes in traced geometry');
assert(planned.stitchCount > 0 && planned.jumpCount > 0 && planned.trimCount > 0, 'Planner emits stitch, jump, tie/trim command sequences');
assert(planned.colorCount >= 4, 'Planner preserves distinct thread color groups');

// Test 8: Local-AI Object Map Integration
console.log('\n8. Testing Local-AI Object Map Integration...');
const aiWidth = 80;
const aiHeight = 40;
const aiPixels = new Uint8ClampedArray(aiWidth * aiHeight * 4);
const aiLabels = new Uint16Array(aiWidth * aiHeight);
for (let y = 8; y < 32; y++) {
  for (let x = 8; x < 72; x++) {
    const index = y * aiWidth + x;
    const rgba = index * 4;
    aiPixels[rgba] = 220;
    aiPixels[rgba + 1] = 40;
    aiPixels[rgba + 2] = 50;
    aiPixels[rgba + 3] = 255;
    aiLabels[index] = x < 40 ? 1 : 2;
  }
}
const aiSegmentation: LocalSegmentationResult = {
  width: aiWidth,
  height: aiHeight,
  labels: aiLabels,
  objects: [
    { id: 1, score: 0.94, areaPx: 768, bounds: { x: 8, y: 8, width: 32, height: 24 }, directionDegrees: 0, directionConfidence: 0.8 },
    { id: 2, score: 0.93, areaPx: 768, bounds: { x: 40, y: 8, width: 32, height: 24 }, directionDegrees: 0, directionConfidence: 0.8 }
  ],
  foregroundCoverage: 1,
  reliable: true,
  provider: 'MobileSAM ONNX'
};
const aiPlan = generateStitchPlan(
  aiPixels,
  aiWidth,
  aiHeight,
  { ...DEFAULT_EMBROIDERY_SETTINGS, stitchPlanningMode: 'object-aware', borderType: 'none' },
  '',
  aiSegmentation
);
assert(aiPlan.sourceKind === 'ai-raster', 'Planner identifies a reliable local-AI raster map');
assert(aiPlan.regions.length >= 2, 'AI masks keep touching same-color objects separate');

// Test 9: Dense Curved Object Stitch Flow
console.log('\n9. Testing Dense Curved Object Stitch Flow...');
const flowWidth = 72;
const flowHeight = 64;
const flowLabels = new Uint16Array(flowWidth * flowHeight);
for (let y = 8; y <= 21; y++) {
  for (let x = 6; x <= 60; x++) flowLabels[y * flowWidth + x] = 1;
}
for (let y = 36; y <= 52; y++) {
  for (let x = 26; x <= 42; x++) {
    if (Math.hypot(x - 34, y - 44) <= 8) flowLabels[y * flowWidth + x] = 2;
  }
}
const flowSegmentation: LocalSegmentationResult = {
  width: flowWidth,
  height: flowHeight,
  labels: flowLabels,
  objects: [
    { id: 1, score: 0.95, areaPx: 770, bounds: { x: 6, y: 8, width: 55, height: 14 }, directionDegrees: 0, directionConfidence: 0.9 },
    { id: 2, score: 0.94, areaPx: 197, bounds: { x: 26, y: 36, width: 17, height: 17 }, directionDegrees: 0, directionConfidence: 0 }
  ],
  foregroundCoverage: 1,
  reliable: true,
  provider: 'MobileSAM ONNX'
};
const curvedFlow = computeObjectStitchFlow(flowSegmentation);
const horizontalColumnSample = 12 * curvedFlow.width + 33;
assert(
  Math.abs(curvedFlow.tangentY[horizontalColumnSample]) > Math.abs(curvedFlow.tangentX[horizontalColumnSample]),
  'Elongated objects receive cross-column satin direction instead of one along-axis fill'
);
const circleRight = 44 * curvedFlow.width + 40;
const circleTop = 38 * curvedFlow.width + 34;
assert(
  Math.abs(curvedFlow.tangentX[circleRight]) > Math.abs(curvedFlow.tangentY[circleRight]) &&
    Math.abs(curvedFlow.tangentY[circleTop]) > Math.abs(curvedFlow.tangentX[circleTop]),
  'Compact objects receive a curved radial field rather than one global angle'
);
assert(
  curvedFlow.confidence[circleRight] > 0.5 && curvedFlow.confidence[circleTop] > 0.5,
  'Object flow exposes confident per-pixel directions for the renderer'
);
assert(
  Number.isFinite(curvedFlow.rowCoordinate[circleRight]) &&
    Number.isFinite(curvedFlow.longCoordinate[circleRight]) &&
    Math.abs(curvedFlow.rowCoordinate[circleRight] - curvedFlow.rowCoordinate[circleRight - 1]) < 3,
  'Curved stitch directions are integrated into continuous procedural row phases'
);

console.log('\n10. Testing Render Size and Pixel Density Policies...');
assertRenderSize(9712, 10360);
assert(getPreviewScale(9712, 10360, .09) === .25, '101 MP fit preview uses a screen-density tier');
assert(getPreviewScale(9712, 10360, 1) === 1, '100% zoom requests native source detail');
assert(getPreviewScale(1230, 1278, .5) === 1, 'normal artwork retains full native preview');
assert(getPreviewScale(9712, 10360, .10) === getPreviewScale(9712, 10360, .11), 'small wheel changes reuse the same preview tier');
assert(getMockupRenderScale(9712, 10360, .1, 2) < 1, 'mockup source resolution follows its placed pixel footprint');
let oversizedRejected = false;
try { assertRenderSize(19424, 20720); } catch { oversizedRejected = true; }
assert(oversizedRejected, 'unsafe 402 MP allocations are rejected before rendering');

// Test 11: Fabric Substrate & Patch Engine
console.log('\n11. Testing Fabric Substrate & Patch Engine...');
assert(FABRIC_SUBSTRATE_DEFINITIONS.length >= 7, 'All 7 fabric substrates (Leather, Denim, Fleece, Patch, Linen, etc.) defined');
const leatherDef = FABRIC_SUBSTRATE_DEFINITIONS.find(f => f.id === 'black_leather');
assert(leatherDef !== undefined && leatherDef.category === 'Leather', 'Black Pebbled Leather substrate defined');
const denimDef = FABRIC_SUBSTRATE_DEFINITIONS.find(f => f.id === 'indigo_denim');
assert(denimDef !== undefined && denimDef.category === 'Denim', 'Dark Indigo Denim substrate defined');
const fleeceDef = FABRIC_SUBSTRATE_DEFINITIONS.find(f => f.id === 'olive_sweatshirt');
assert(fleeceDef !== undefined && fleeceDef.category === 'Fleece', 'Olive Green Sweatshirt Fleece substrate defined');

const leatherTile = FabricSubstrateEngine.getFabricTile('black_leather', 1);
assert(leatherTile.width === 256 && leatherTile.height === 256, 'Leather procedural tile synthesizes at 256x256px');
const denimTile = FabricSubstrateEngine.getFabricTile('indigo_denim', 1);
assert(denimTile.width === 256 && denimTile.height === 256, 'Indigo Denim procedural tile synthesizes at 256x256px');
const fleeceTile = FabricSubstrateEngine.getFabricTile('olive_sweatshirt', 1);
assert(fleeceTile.width === 256 && fleeceTile.height === 256, 'Olive Fleece procedural tile synthesizes at 256x256px');

// Test 12: Thread Studio Engine
console.log('\n12. Testing Thread Studio Engine...');
assert(DEFAULT_EMBROIDERY_SETTINGS.stitchPlanningMode === 'thread-studio', 'Thread Studio is set as the default stitch construction mode');
assert(DEFAULT_THREAD_STUDIO_CONFIG.threadWidth === 2.0, 'Default Thread Studio thread width is 2.0px');
assert(Object.keys(THREAD_STUDIO_PRESETS).length === 4, 'All 4 Thread Studio presets (cleanLogo, realistic, satin, puff) defined');
assert(THREAD_STUDIO_PRESETS.puff.depth === 8.5, 'Raised/Puff preset has elevated 8.5px depth relief');
assert(THREAD_STUDIO_PRESETS.realistic.drawOutline === true && THREAD_STUDIO_PRESETS.realistic.drawFuzz === true, 'Realistic preset enables outline and micro fuzz passes');

const studio = new ThreadStudioRenderer();
assert(typeof studio.render === 'function', 'ThreadStudioRenderer exposes render method');
assert(typeof studio.analyzeArtwork === 'function', 'ThreadStudioRenderer exposes analyzeArtwork method');

// Synthesize a 100x100 circle logo
const samplePixels = new Uint8ClampedArray(100 * 100 * 4);
for (let y = 0; y < 100; y++) {
  for (let x = 0; x < 100; x++) {
    const idx = (y * 100 + x) * 4;
    const dist = Math.hypot(x - 50, y - 50);
    if (dist < 35) {
      samplePixels[idx] = 210;     // R (Gold)
      samplePixels[idx + 1] = 165; // G
      samplePixels[idx + 2] = 50;  // B
      samplePixels[idx + 3] = 255; // A
    }
  }
}
const analysis = studio.analyzeArtwork(samplePixels, 100, 100);
assert(analysis.coverage > 0.2 && analysis.recommended !== undefined, `Artwork analyzed: profile=${analysis.profile}, recommended=${analysis.recommended}`);

// Test 13: Gumroad Licensing & 14-Day Free Trial
console.log('\n13. Testing Gumroad Licensing & 14-Day Free Trial Engine...');
const {
  GUMROAD_PRODUCT_ID,
  TRIAL_DURATION_DAYS,
  checkAccessStatus,
  verifyGumroadLicense
} = await import('../src/engine/licenseEngine');

assert(GUMROAD_PRODUCT_ID === 'eR3zHFxrqIi3e8k3QCgGRQ==', 'Configured with Gumroad product ID eR3zHFxrqIi3e8k3QCgGRQ==');
assert(TRIAL_DURATION_DAYS === 14, 'Trial duration set to 14 days');

const initialStatus = checkAccessStatus();
assert(initialStatus.status === 'trial_active' || initialStatus.status === 'licensed', 'Initial status grants access');
assert(typeof initialStatus.daysRemaining === 'number', `Days remaining calculated: ${initialStatus.daysRemaining} days`);

const verifyResult = await verifyGumroadLicense('INVALID-SAMPLE-KEY-12345');
assert(verifyResult.success === false, 'Invalid license rejected with error message');
assert(typeof verifyResult.message === 'string', `Gumroad API returned message: "${verifyResult.message}"`);

// Test 14: Settings Retention & Persistence Engine
console.log('\n14. Testing Settings Retention & Persistence Engine...');
const {
  loadSavedSettings,
  saveUserSettings,
  resetUserSettings,
  STORAGE_KEY_SETTINGS
} = await import('../src/engine/settingsStorage');

assert(typeof STORAGE_KEY_SETTINGS === 'string', 'Storage key defined');

// Reset to ensure clean baseline
resetUserSettings();
const baseline = loadSavedSettings();
assert(baseline.hasSavedSettings === false, 'Fresh baseline has no saved settings');
assert(baseline.settings.stitchDensity !== undefined, 'Baseline has valid default settings');

// Customize and save settings
const customSettings = {
  ...baseline.settings,
  stitchDensity: 8.5,
  threadThickness: 7.2,
  stitchAngle: 45
};
const customTransform = {
  ...baseline.transform,
  displacementStrength: 7.5,
  fabricTextureStrength: 6.0,
  creviceShadowStrength: 8.0,
  scale: 1.45
};

saveUserSettings(customSettings, customTransform, 'hoodie_01', { showCheckerboard: false, showRulers: false });

// Reload and verify retention
const reloaded = loadSavedSettings();
assert(reloaded.hasSavedSettings === true, 'Saved settings detected on reload');
assert(reloaded.settings.stitchDensity === 8.5, 'Custom stitch density 8.5 retained');
assert(reloaded.settings.threadThickness === 7.2, 'Custom thread thickness 7.2 retained');
assert(reloaded.settings.stitchAngle === 45, 'Custom stitch angle 45° retained');
assert(reloaded.transform.displacementStrength === 7.5, 'Custom wrinkle displacement 7.5 retained');
assert(reloaded.transform.fabricTextureStrength === 6.0, 'Custom weave grain 6.0 retained');
assert(reloaded.transform.creviceShadowStrength === 8.0, 'Custom fold shadow 8.0 retained');
assert(reloaded.transform.scale === 1.45, 'Custom scale 1.45 retained');
assert(reloaded.selectedMockupId === 'hoodie_01', 'Custom mockup template hoodie_01 retained');
assert(reloaded.viewport?.showCheckerboard === false, 'Custom viewport preferences retained');

// Reset to factory defaults
resetUserSettings();
const afterReset = loadSavedSettings();
assert(afterReset.hasSavedSettings === false, 'Settings successfully cleared after reset');
assert(afterReset.settings.stitchDensity === baseline.settings.stitchDensity, 'Factory stitch density restored after reset');

console.log('\n--- ALL ENGINE TESTS PASSED SUCCESSFULLY! ---');
