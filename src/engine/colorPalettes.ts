import { ThreadPalette, ThreadColor } from '../types';

export const THREAD_PALETTES: ThreadPalette[] = [
  {
    id: 'madeira_classic',
    name: 'Madeira Classic Rayon',
    description: 'High-sheen luxury rayon thread palette with natural luster',
    colors: [
      { name: 'Super White', code: '1001', hex: '#FFFFFF', category: 'Neutral' },
      { name: 'Jet Black', code: '1000', hex: '#111111', category: 'Neutral' },
      { name: 'Charcoal Grey', code: '1041', hex: '#333338', category: 'Neutral' },
      { name: 'Silver Mist', code: '1011', hex: '#A8A9AD', category: 'Neutral' },
      { name: 'Crimson Red', code: '1184', hex: '#C41230', category: 'Red' },
      { name: 'Ruby Scarlet', code: '1147', hex: '#E31B23', category: 'Red' },
      { name: 'Burgundy', code: '1035', hex: '#631D2A', category: 'Red' },
      { name: 'Royal Navy', code: '1044', hex: '#0B2265', category: 'Blue' },
      { name: 'Cobalt Blue', code: '1134', hex: '#0055A5', category: 'Blue' },
      { name: 'Sky Cerulean', code: '1029', hex: '#418AB3', category: 'Blue' },
      { name: 'Forest Green', code: '1170', hex: '#1D4428', category: 'Green' },
      { name: 'Kelly Green', code: '1051', hex: '#00843D', category: 'Green' },
      { name: 'Varsity Gold', code: '1125', hex: '#FDB813', category: 'Yellow' },
      { name: 'Canary Yellow', code: '1067', hex: '#FFE600', category: 'Yellow' },
      { name: 'Tangerine Orange', code: '1065', hex: '#FF671F', category: 'Orange' },
      { name: 'Imperial Purple', code: '1033', hex: '#582C83', category: 'Purple' },
      { name: 'Rich Tan', code: '1055', hex: '#D2B48C', category: 'Brown' },
      { name: 'Saddle Brown', code: '1058', hex: '#8B4513', category: 'Brown' }
    ]
  },
  {
    id: 'isacord_poly',
    name: 'Isacord Universal Poly',
    description: 'Durable polyester embroidery thread with rich colorfast pigments',
    colors: [
      { name: 'White', code: '0015', hex: '#F9F9F9', category: 'Neutral' },
      { name: 'Deep Black', code: '0020', hex: '#0A0A0A', category: 'Neutral' },
      { name: 'Steel', code: '0131', hex: '#707372', category: 'Neutral' },
      { name: 'Signal Red', code: '1902', hex: '#D62226', category: 'Red' },
      { name: 'Bordeaux', code: '2115', hex: '#4D1223', category: 'Red' },
      { name: 'Marine Navy', code: '3641', hex: '#0E1E38', category: 'Blue' },
      { name: 'Electric Cyan', code: '3900', hex: '#00A3E0', category: 'Blue' },
      { name: 'Hunter Green', code: '5555', hex: '#1A3C2B', category: 'Green' },
      { name: 'Speed Gold', code: '0800', hex: '#F2A900', category: 'Yellow' },
      { name: 'Neon Coral', code: '1304', hex: '#FF5C39', category: 'Orange' },
      { name: 'Deep Violet', code: '2905', hex: '#3E1B5B', category: 'Purple' },
      { name: 'Khaki Stone', code: '0872', hex: '#9E8B6E', category: 'Brown' }
    ]
  },
  {
    id: 'metallic_luxury',
    name: 'Metallic & Specialty Threads',
    description: 'Reflective metallic foil and specialty threads with intense highlights',
    colors: [
      { name: '24K Crown Gold', code: 'M-101', hex: '#FFD700', category: 'Metallic' },
      { name: 'Antique Brass Gold', code: 'M-102', hex: '#C5A059', category: 'Metallic' },
      { name: 'Sterling Silver', code: 'M-201', hex: '#E0E2E5', category: 'Metallic' },
      { name: 'Raw Platinum', code: 'M-202', hex: '#C0C0C0', category: 'Metallic' },
      { name: 'Rose Gold', code: 'M-301', hex: '#B76E79', category: 'Metallic' },
      { name: 'Polished Bronze', code: 'M-302', hex: '#CD7F32', category: 'Metallic' },
      { name: 'Gunmetal Titanium', code: 'M-401', hex: '#4A4E51', category: 'Metallic' }
    ]
  }
];

// Helper to find closest thread color from a hex
export function findClosestThreadColor(hex: string, paletteId = 'madeira_classic'): ThreadColor {
  const palette = THREAD_PALETTES.find(p => p.id === paletteId) || THREAD_PALETTES[0];
  const targetRgb = hexToRgb(hex);
  if (!targetRgb) return palette.colors[0];

  let closest = palette.colors[0];
  let minDistance = Infinity;

  for (const thread of palette.colors) {
    const threadRgb = hexToRgb(thread.hex);
    if (!threadRgb) continue;

    // Euclidean distance in RGB (weighted for perception)
    const dr = targetRgb.r - threadRgb.r;
    const dg = targetRgb.g - threadRgb.g;
    const db = targetRgb.b - threadRgb.b;
    const dist = Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);

    if (dist < minDistance) {
      minDistance = dist;
      closest = thread;
    }
  }

  return closest;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6) return null;
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}
