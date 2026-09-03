export type RenderSource = HTMLImageElement | HTMLCanvasElement | OffscreenCanvas | ImageBitmap;

/** Renderers use only the shared Canvas 2D API, never DOM canvas methods.
 * Isolate the compatibility cast so identical math runs in workers and tests. */
export function createRenderCanvas(): HTMLCanvasElement {
  return typeof document !== 'undefined'
    ? document.createElement('canvas')
    : new OffscreenCanvas(1, 1) as unknown as HTMLCanvasElement;
}

export function sourceDimensions(source: RenderSource) {
  return {
    width: 'naturalWidth' in source ? source.naturalWidth || source.width : source.width,
    height: 'naturalHeight' in source ? source.naturalHeight || source.height : source.height
  };
}
