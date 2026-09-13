/** Deterministic strand material in source-pixel coordinates. No random pixel grain. */
export function studioStrand(across: number, along: number, spacing: number, length: number,
  twist: number, depth: number, occlusion: number) {
  const row = Math.floor(across / spacing);
  const offset = ((row % 5 + 5) % 5) * length / 5;
  const u = ((across / spacing % 1 + 1) % 1) * 2 - 1;
  const v = (((along + offset) / length % 1 + 1) % 1) * 2 - 1;
  const end = Math.pow(Math.abs(v), 12);
  const ridge = Math.sqrt(Math.max(0.015, 1 - u * u));
  // Fine parallel filaments follow the strand, not screen-space white noise.
  const filament = Math.sin(u * Math.PI * 5 + along * 0.12 * twist) * 0.035;
  return {
    crossNormal: u * 0.62 + filament,
    endNormal: v * end * 0.32,
    height: Math.max(0.12, ridge * (1 - end * 0.60) * (0.9 + depth * 0.065)),
    shade: Math.max(0.55, 1 - Math.pow(Math.abs(u), 8) * occlusion * 0.028 - end * 0.12)
  };
}
