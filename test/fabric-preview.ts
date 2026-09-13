import { MockupRenderer } from '../src/engine/mockupRenderer';

/** Same artwork, placement and photo in both columns. No template-specific
 * material maps are passed to the renderer. Crops only make inspection easier. */
export async function renderFabricBlendComparison(embroidery: HTMLCanvasElement, sourceWidth: number) {
  const renderer = new MockupRenderer();
  const sheet = Object.assign(document.createElement('canvas'), { width: 1200, height: 1050 });
  const ctx = sheet.getContext('2d')!;
  ctx.fillStyle = '#17191b'; ctx.fillRect(0, 0, 1200, 1050);
  const photos = [
    { file: 'tshirt_white_heavyweight.png', label: 'Smooth white fabric', y: 47, warp: 0 },
    { file: 'hoodie_forest_green.png', label: 'Coloured fabric', y: 52, warp: 0 },
    { file: 'tshirt_black.jpg', label: 'Dark fabric with folds', y: 66, warp: 4.5 }
  ];
  for (const [row, photo] of photos.entries()) {
    const image = new Image(); image.src = '/mockups/' + photo.file; await image.decode();
    for (const [column, blend] of [0, 7].entries()) {
      const rendered = renderer.composeMockup(image, embroidery, {
        x: 50, y: photo.y, scale: .85, rotation: 0, opacity: 1, blendMode: 'normal',
        displacementStrength: photo.warp, creviceShadowStrength: 3,
        fabricTextureStrength: 2, shadowIntensity: .6, fabricBlendStrength: blend
      }, 1200, 1200, { embroideryRenderScale: embroidery.width / sourceWidth });
      ctx.drawImage(rendered, 340, photo.y * 12 - 120, 520, 260, column * 600, row * 350 + 42, 600, 300);
      ctx.fillStyle = '#eeeeee'; ctx.font = '16px Arial';
      ctx.fillText(photo.label + (column ? ' / Automatic blend' : ' / Blend off'), column * 600 + 14, row * 350 + 26);
    }
  }
  return sheet.toDataURL('image/png').split(',')[1];
}
