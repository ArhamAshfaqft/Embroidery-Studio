import { findClosestThreadColor, hexToRgb, rgbToHex, THREAD_PALETTES } from '../src/engine/colorPalettes';
import { EMBROIDERY_PRESETS, DEFAULT_EMBROIDERY_SETTINGS } from '../src/engine/presets';
import { MOCKUP_TEMPLATES } from '../src/engine/mockupRenderer';
import { FONT_OPTIONS, renderTextToCanvas, DEFAULT_TEXT_CONFIG } from '../src/engine/textRenderer';
import { SmartOptimizer } from '../src/engine/smartOptimizer';
import { computeAdaptiveStitchField } from '../src/engine/stitchField';

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

console.log('\n--- ALL ENGINE TESTS PASSED SUCCESSFULLY! ---');
