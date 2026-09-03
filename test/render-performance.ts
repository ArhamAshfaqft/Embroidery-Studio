import { EmbroideryRenderer } from '../src/engine/embroideryRenderer';
import { DEFAULT_EMBROIDERY_SETTINGS } from '../src/engine/presets';
import { BackgroundRenderer, isRenderCancelled } from '../src/engine/backgroundRenderer';
import { MockupRenderer } from '../src/engine/mockupRenderer';
import { getPreviewScale, assertRenderSize } from '../src/engine/renderSizing';

export function fixture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#de243a';
  ctx.fillRect(size * .1, size * .1, size * .35, size * .75);
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#fff2af');
  gradient.addColorStop(1, '#027e8b');
  ctx.fillStyle = gradient;
  ctx.beginPath(); ctx.ellipse(size * .65, size * .5, size * .22, size * .4, .2, 0, Math.PI * 2); ctx.fill();
  ctx.clearRect(size * .2, size * .3, size * .1, size * .3);
  return canvas;
}

function hash(canvas: HTMLCanvasElement, normalize = true) {
  const copy = document.createElement('canvas');
  copy.width = canvas.width; copy.height = canvas.height;
  const ctx = copy.getContext('2d')!; ctx.drawImage(canvas, 0, 0);
  const data = (normalize ? ctx : canvas.getContext('2d')!).getImageData(0, 0, canvas.width, canvas.height).data;
  let value = 2166136261;
  for (const byte of data) value = Math.imul(value ^ byte, 16777619) >>> 0;
  return value.toString(16);
}

document.querySelector<HTMLButtonElement>('#run')!.onclick = async () => {
  const source = fixture();
  const renderer = new EmbroideryRenderer();
  const hashes: Record<string, string> = {};
  for (const style of ['classic', 'natural'] as const) {
    for (const scale of [1, 2]) {
      const result = renderer.renderEmbroidery(source, { ...DEFAULT_EMBROIDERY_SETTINGS, renderStyle: style, shadowStrength: 0 }, scale);
      hashes[`${style}-${scale}`] = hash(result.canvas);
    }
  }
  document.querySelector('#results')!.textContent = JSON.stringify(hashes, null, 2);
};

const report = (text: string) => { document.querySelector('#results')!.textContent += text + '\n'; };
const check = (condition: boolean, message: string) => { if (!condition) throw new Error(message); report('PASS ' + message); };
const baseline = { 'classic-1': '9faeef87', 'classic-2': '28f10c3f', 'natural-1': 'e31fad7e', 'natural-2': '25af57ef' };
function compare(left: HTMLCanvasElement, right: HTMLCanvasElement) {
  const pixels = (canvas: HTMLCanvasElement) => {
    const copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
    const ctx = copy.getContext('2d')!; ctx.drawImage(canvas, 0, 0); return ctx.getImageData(0, 0, copy.width, copy.height).data;
  };
  const a = pixels(left), b = pixels(right);
  let changed = 0, max = 0, sum = 0; const first = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) {
    changed++; max = Math.max(max, Math.abs(a[i] - b[i])); sum += Math.abs(a[i] - b[i]);
    if (first.length < 8) first.push({ i, a: a[i], b: b[i] });
  }
  report(JSON.stringify({ changed, max, meanError: sum / a.length, first }));
  // Canvas vs ImageBitmap scaling can round antialiased boundary channels
  // differently. Bound mean channel error below 0.1 / 255 (0.04%). The CPU
  // shader baseline itself is checked byte-for-byte separately.
  return sum / a.length < 0.1;
}
document.querySelector<HTMLButtonElement>('#worker')!.onclick = async () => {
  document.querySelector('#results')!.textContent = '';
  const worker = new BackgroundRenderer();
  try {
    const source = fixture();
    const sync = new EmbroideryRenderer();
    for (const style of ['classic', 'natural'] as const) for (const scale of [1, 2] as const) {
      const settings = { ...DEFAULT_EMBROIDERY_SETTINGS, renderStyle: style, shadowStrength: 0 };
      const expected = baseline[`${style}-${scale}`];
      const reference = sync.renderEmbroidery(source, settings, scale).canvas;
      check(hash(reference, false) === expected, `${style} ${scale}x baseline unchanged`);
      const result = await worker.renderEmbroideryAsync(source, settings, scale);
      check(compare(result.canvas, reference), `${style} ${scale}x worker retains pixel fidelity`);
    }
    for (const style of ['classic', 'natural'] as const) {
      const settings = { ...DEFAULT_EMBROIDERY_SETTINGS, renderStyle: style, shadowStrength: 5, quantizeColors: true, useCustomBorderColor: true, borderColor: '#123abc' };
      check(compare((await worker.renderEmbroideryAsync(source, settings, 1)).canvas, sync.renderEmbroidery(source, settings, 1).canvas), `${style} shadows, borders and quantization retained`);
    }
    // Cached AI masks must never influence Surface mode after switching back.
    const modeWorker = new Worker(new URL('../src/engine/render.worker.ts', import.meta.url), { type: 'module' });
    try {
      const input = await createImageBitmap(source);
      const isolated = new Promise<ImageBitmap>((resolve, reject) => {
        modeWorker.onerror = event => reject(new Error(event.message));
        modeWorker.onmessage = ({ data }) => { if (data.error) reject(new Error(data.error)); else if (data.bitmap) resolve(data.bitmap); };
      });
      modeWorker.postMessage({ id: 1, kind: 'render', source: input, sourceWidth: 256, sourceHeight: 256, scale: 1,
        assetBase: new URL('../', document.baseURI).href,
        settings: { ...DEFAULT_EMBROIDERY_SETTINGS, shadowStrength: 0, stitchPlanningMode: 'surface' },
        segmentation: { width: 256, height: 256, labels: new Uint16Array(256 * 256).fill(1), reliable: true,
          foregroundCoverage: 1, provider: 'MobileSAM ONNX', objects: [{ id: 1, score: .95, areaPx: 65536,
            bounds: { x: 0, y: 0, width: 256, height: 256 }, directionDegrees: 90, directionConfidence: .9 }] }
      }, [input]);
      const bitmap = await isolated;
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      canvas.getContext('bitmaprenderer')!.transferFromImageBitmap(bitmap);
      check(compare(canvas, sync.renderEmbroidery(source, { ...DEFAULT_EMBROIDERY_SETTINGS, shadowStrength: 0 }).canvas), 'Surface ignores cached AI masks');
    } finally { modeWorker.terminate(); }
    const svg = new Image();
    svg.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect x="30" y="30" width="70" height="190" fill="red"/><ellipse cx="175" cy="125" rx="40" ry="90" fill="teal"/></svg>');
    await svg.decode();
    const vector = await worker.renderEmbroideryAsync(svg, { ...DEFAULT_EMBROIDERY_SETTINGS, stitchPlanningMode: 'object-aware' }, 2);
    check(vector.constructionMode === 'vector-paths' && vector.width === 512 && vector.height === 512, 'SVG shapes remain vector-planned at export scale');
    const garment = fixture(600), emb = sync.renderEmbroidery(source, DEFAULT_EMBROIDERY_SETTINGS).canvas;
    const transform = { x: 50, y: 48, scale: .8, rotation: 15, opacity: .9, blendMode: 'normal' as const, displacementStrength: 4, shadowIntensity: 6 };
    const composition = { embroideryRenderScale: 1, layoutWidth: 600, layoutHeight: 600 };
    check(compare((await worker.compose(garment, emb, transform, 600, 600, composition)).canvas,
      new MockupRenderer().composeMockup(garment, emb, transform, 600, 600, composition)), 'mockup worker retains pixel fidelity');
    for (const type of ['image/png', 'image/webp', 'image/jpeg']) {
      const exported = await worker.export(source, DEFAULT_EMBROIDERY_SETTINGS, 2, type, .95);
      check(exported.blob.type === type && exported.width === 512 && exported.height === 512, `${type} exports original at requested 2x`);
    }
    let unsafeRejected = false;
    try { assertRenderSize(19424, 20720); } catch { unsafeRejected = true; }
    check(unsafeRejected, 'unsafe 402 MP export rejected before allocating');
    const big = fixture(4096);
    let pulses = 0, maxGap = 0, last = performance.now();
    const timer = window.setInterval(() => { const now = performance.now(); maxGap = Math.max(maxGap, now - last); last = now; pulses++; }, 10);
    const start = performance.now();
    await worker.renderEmbroideryAsync(big, DEFAULT_EMBROIDERY_SETTINGS, 1);
    clearInterval(timer);
    check(pulses > 20, 'UI heartbeat continues throughout 16 MP native render');
    report(JSON.stringify({ renderMs: Math.round(performance.now() - start), pulses, maxGapMs: Math.round(maxGap) }));
    const cancelled = worker.renderEmbroideryAsync(big, { ...DEFAULT_EMBROIDERY_SETTINGS, stitchAngle: 72 }).catch(error => error);
    await new Promise(resolve => setTimeout(resolve, 30));
    worker.cancel();
    check(isRenderCancelled(await cancelled), 'obsolete work is cancelled');
    const replacement = await worker.renderEmbroideryAsync(source, { ...DEFAULT_EMBROIDERY_SETTINGS, shadowStrength: 0 });
    check(compare(replacement.canvas, sync.renderEmbroidery(source, { ...DEFAULT_EMBROIDERY_SETTINGS, shadowStrength: 0 }).canvas), 'replacement after cancellation returns correct pixels');
    report('ALL WORKER TESTS PASSED');
  } catch (error) { report('FAIL ' + error); }
  finally { worker.dispose(); }
};

document.querySelector<HTMLButtonElement>('#stress')!.onclick = async () => {
  document.querySelector('#results')!.textContent = 'Creating 101 MP source…\n';
  const worker = new BackgroundRenderer();
  const source = document.createElement('canvas'); source.width = 9712; source.height = 10360;
  const ctx = source.getContext('2d')!; ctx.fillStyle = '#cb303a'; ctx.fillRect(100, 100, 9000, 9600);
  const scale = getPreviewScale(source.width, source.height, .09);
  let pulses = 0, maxGap = 0, last = performance.now();
  const timer = window.setInterval(() => { const now = performance.now(); maxGap = Math.max(maxGap, now - last); last = now; pulses++; }, 10);
  try {
    const start = performance.now();
    const result = await worker.renderEmbroideryAsync(source, DEFAULT_EMBROIDERY_SETTINGS, scale);
    report(JSON.stringify({ original: [source.width, source.height], preview: [result.width, result.height], totalMs: Math.round(performance.now() - start), renderMs: Math.round(result.renderTimeMs), pulses, maxGapMs: Math.round(maxGap) }));
    check(source.width === 9712 && source.height === 10360, '101 MP original dimensions preserved');
  } catch (error) { report('FAIL ' + error); }
  finally { clearInterval(timer); source.width = source.height = 1; worker.dispose(); }
};

document.querySelector<HTMLButtonElement>('#native')!.onclick = async () => {
  document.querySelector('#results')!.textContent = 'Native 101 MP export running in background…\n';
  const worker = new BackgroundRenderer();
  const source = document.createElement('canvas'); source.width = 9712; source.height = 10360;
  const ctx = source.getContext('2d')!; ctx.fillStyle = '#df573b'; ctx.fillRect(400, 400, 8500, 9400);
  let pulses = 0, maxGap = 0, last = performance.now();
  const timer = window.setInterval(() => { const now = performance.now(); maxGap = Math.max(maxGap, now - last); last = now; pulses++; }, 10);
  try {
    const start = performance.now();
    const result = await worker.export(source, DEFAULT_EMBROIDERY_SETTINGS, 1, 'image/png', 1);
    const header = new DataView(await result.blob.slice(0, 24).arrayBuffer());
    check(header.getUint32(16) === 9712 && header.getUint32(20) === 10360, 'encoded PNG retains every original pixel dimension');
    check(pulses > 100, 'UI stays responsive through native rendering AND encoding');
    report(JSON.stringify({ exportMs: Math.round(performance.now() - start), bytes: result.blob.size, pulses, maxGapMs: Math.round(maxGap) }));
  } catch (error) { report('FAIL ' + error); }
  finally { clearInterval(timer); source.width = source.height = 1; worker.dispose(); }
};
