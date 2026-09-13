import type { EmbroiderySettings } from '../types';

/** The garment compositor supplies contact shadows. A baked drop shadow from
 * the standalone artwork makes direct embroidery float above the photograph. */
export function getMockupEmbroiderySettings(settings: EmbroiderySettings): EmbroiderySettings {
  return { ...settings, shadowStrength: 0 };
}
