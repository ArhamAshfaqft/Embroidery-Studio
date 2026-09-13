import { MockupRenderer } from '../src/engine/mockupRenderer';
import { analyzePhotoLighting } from '../src/engine/fabricIntegration';
import { saveUserSettings, loadSavedSettings, resetUserSettings } from '../src/engine/settingsStorage';
import { DEFAULT_EMBROIDERY_SETTINGS } from '../src/engine/presets';
import type { MockupTransform } from '../src/types';

const canvas = (w = 240, h = 240) => Object.assign(document.createElement('canvas'), { width: w, height: h });
const fill = (c: HTMLCanvasElement, colour: string) => {
  const ctx = c.getContext('2d')!; ctx.fillStyle = colour; ctx.fillRect(0, 0, c.width, c.height); return c;
};
const pixel = (c: HTMLCanvasElement, x = 120, y = 120) => c.getContext('2d')!.getImageData(x, y, 1, 1).data;
const data = (c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;

export async function runFabricIntegrationChecks() {
  const checks: { name: string; pass: boolean }[] = [];
  const check = (pass: boolean, name: string) => checks.push({ name, pass });
  const renderer = new MockupRenderer(), cloth = canvas(), art = fill(canvas(80, 80), '#ffffff');
  const t: MockupTransform = { x: 50, y: 50, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal',
    displacementStrength: 0, fabricTextureStrength: 0, creviceShadowStrength: 0, shadowIntensity: 0, fabricBlendStrength: 7 };
  const render = (transform = t) => renderer.composeMockup(cloth, art, transform, 240, 240);

  fill(cloth, '#a8a8a8');
  const on = render(), off = render({ ...t, fabricBlendStrength: 0 });
  check(pixel(on)[0] < pixel(off)[0] - 4 && pixel(on)[0] > 225,
    'Smooth fabric matches photographic tonality with all wrinkle, weave and shadow controls at zero');
  check(pixel(on, 90, 120)[0] === pixel(on, 150, 120)[0], 'Uniform fabric does not create artificial folds');

  for (const colour of ['#07182f', '#dc3020', '#227f3d']) {
    fill(cloth, colour);
    const p = pixel(render());
    check(Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]) <= 1 && p[0] > 235,
      `Opaque white stitches retain neutral colour on saturated fabric ${colour}`);
  }
  fill(cloth, '#07182f');
  const ctx = art.getContext('2d')!;
  ctx.clearRect(25, 25, 30, 30);
  check(pixel(render())[0] === 7 && pixel(render())[1] === 24 && pixel(render())[2] === 47,
    'Transparent lettering holes preserve the garment without a grey matte');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 80, 80);
  fill(cloth, '#e1d3c8');
  const warm = pixel(render());
  check(warm[0] > warm[2] + 5 && warm[2] > 220,
    'A warm near-neutral photo reference adds a bounded light cast to white thread');
  fill(cloth, '#4477bb');
  check(analyzePhotoLighting(cloth).confidence === 0, 'Coloured fabric without a neutral reference does not invent a lighting cast');

  // A broad light gradient is not a wrinkle; photo matching must still follow it.
  const g = cloth.getContext('2d')!;
  const gradient = g.createLinearGradient(70, 0, 170, 0);
  gradient.addColorStop(0, '#888888'); gradient.addColorStop(1, '#dddddd'); g.fillStyle = gradient; g.fillRect(0, 0, 240, 240);
  const lit = render();
  check(pixel(lit, 95, 120)[0] < pixel(lit, 145, 120)[0] - 12,
    'Broad illumination transfers across smooth fabric independently of wrinkle shading');

  // Smooth coloured panels should cause substantially less artificial warp than
  // an achromatic fold with the same change in photographic luminance.
  const silhouetteDifference = (colour1: string, colour2: string, blend: number) => {
    ctx.clearRect(0, 0, 80, 80); ctx.fillStyle = '#fff'; ctx.fillRect(35, 0, 10, 80);
    g.fillStyle = colour1; g.fillRect(0, 0, 120, 240); g.fillStyle = colour2; g.fillRect(120, 0, 120, 240);
    const w = data(render({ ...t, fabricBlendStrength: blend, displacementStrength: 8 }));
    let changed = 0;
    for (let y = 85; y < 155; y++) for (let x = 100; x < 140; x++) {
      if ((w[(y * 240 + x) * 4] > 200) !== (x >= 115 && x < 125)) changed++;
    }
    return changed;
  };
  check(silhouetteDifference('#c62222', '#123b98', 7) < silhouetteDifference('#c62222', '#123b98', 0),
    'Chromatic fabric boundaries produce less artificial wrinkle displacement');

  const noisy = g.createImageData(240, 240);
  let seed = 19;
  for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) {
    const i = (y * 240 + x) * 4, shade = 35 + 18 * Math.sin(x / 20);
    for (let c = 0; c < 3; c++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      noisy.data[i + c] = shade + ((seed >>> 24) / 255 - .5) * 10;
    }
    noisy.data[i + 3] = 255;
  }
  g.putImageData(noisy, 0, 0);
  const noisyResult = data(render({ ...t, displacementStrength: 8 }));
  const edges: number[] = [];
  for (let y = 90; y < 150; y++) {
    for (let x = 95; x < 140; x++) if (noisyResult[(y * 240 + x) * 4] > 190) { edges.push(x); break; }
  }
  const variation = edges.slice(1).reduce((sum, x, i) => sum + Math.abs(x - edges[i]), 0) / Math.max(1, edges.length - 1);
  check(edges.length === 60 && variation < .45,
    'Camera colour noise on dark fabric does not turn a smooth fold into a jagged thread edge');

  fill(cloth, '#aaa');
  const clothData = data(cloth);
  const transparent = render({ ...t, opacity: 0, shadowIntensity: 3 });
  check(data(transparent).every((v, i) => v === clothData[i]), 'Zero design opacity leaves the complete mockup unchanged');
  const away = render({ ...t, x: -200, scale: 2, rotation: 37 });
  check(data(away).every((v, i) => v === clothData[i]), 'Fully off-canvas designs leave the photograph unchanged');

  // Real user settings use the same JSON merge for legacy and newly saved files.
  saveUserSettings(DEFAULT_EMBROIDERY_SETTINGS, { ...t, fabricBlendStrength: 0 });
  check(loadSavedSettings().transform.fabricBlendStrength === 0, 'Explicitly disabled fabric blending survives settings reload');
  const legacy = { ...t }; delete legacy.fabricBlendStrength;
  saveUserSettings(DEFAULT_EMBROIDERY_SETTINGS, legacy);
  check(loadSavedSettings().transform.fabricBlendStrength === 7, 'Older saved mockups automatically receive the new fabric blending default');
  resetUserSettings();
  return checks;
}
