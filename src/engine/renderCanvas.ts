export type RenderSource = HTMLImageElement | HTMLCanvasElement | OffscreenCanvas | ImageBitmap;

/** Renderers use only the shared Canvas 2D API, never DOM canvas methods.
 * Isolate the compatibility cast so identical math runs in workers and tests. */
export function createRenderCanvas(): HTMLCanvasElement {
  if (typeof document !== 'undefined') {
    return document.createElement('canvas');
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(1, 1) as unknown as HTMLCanvasElement;
  }
  // Safe mock for headless Node.js CLI testing
  return {
    width: 1,
    height: 1,
    getContext: () => ({
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
      putImageData: () => {},
      drawImage: () => {},
      fillRect: () => {},
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      createPattern: () => null
    })
  } as unknown as HTMLCanvasElement;
}

export function sourceDimensions(source: RenderSource) {
  return {
    width: 'naturalWidth' in source ? source.naturalWidth || source.width : source.width,
    height: 'naturalHeight' in source ? source.naturalHeight || source.height : source.height
  };
}
