import { findClosestThreadColor, hexToRgb, rgbToHex, THREAD_PALETTES } from '../src/engine/colorPalettes';
import { EMBROIDERY_PRESETS, DEFAULT_EMBROIDERY_SETTINGS } from '../src/engine/presets';
import { MOCKUP_TEMPLATES } from '../src/engine/mockupRenderer';
import { FONT_OPTIONS, renderTextToCanvas, DEFAULT_TEXT_CONFIG } from '../src/engine/textRenderer';
import { SmartOptimizer } from '../src/engine/smartOptimizer';
import { computeAdaptiveStitchField } from '../src/engine/stitchField';
import { generateStitchPlan } from '../src/engine/stitchPlanner';
import type { LocalSegmentationResult } from '../src/engine/localSegmentation';

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
assert(MOCKUP_TEMPLATES.length >= 3, 'All 3 photorealistic apparel templates (Shirt, Hoodie, Hat) available');
const hatTemplate = MOCKUP_TEMPLATES.find(m => m.category === 'hat');
assert(hatTemplate !== undefined && hatTemplate.width === 1200 && hatTemplate.height === 1200, 'Structured Cap mockup has 1200x1200px dimensions');

// Test 4: Embroidery Lettering & Typography Engine
console.log('\n4. Testing Embroidery Lettering Engine...');
assert(FONT_OPTIONS.length >= 8, 'Commercial embroidery fonts defined');
const textResult = renderTextToCanvas(DEFAULT_TEXT_CONFIG, 1000, 600);
assert(textResult.canvas.width === 1000 && Boolean(textResult.dataUrl), 'Text renderer generates high-res vector lettering canvas');

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

console.log('\n--- ALL ENGINE TESTS PASSED SUCCESSFULLY! ---');
