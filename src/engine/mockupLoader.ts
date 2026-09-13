import { MockupTemplate, MockupTransform, DiskMockupFile } from '../types';
import { MOCKUP_TEMPLATES } from './mockupRenderer';


/**
 * Cleanly format a filename into a title for display
 * e.g. "oversized_black_hoodie.jpg" -> "Oversized Black Hoodie"
 */
export function formatMockupTitle(filename: string): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  const words = withoutExt
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/);

  return words
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === 'tshirt' || lower === 'tee') return 'T-Shirt';
      if (lower === 'hoodie') return 'Hoodie';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Infer the apparel category from the filename
 */
export function inferMockupCategory(filename: string): 'shirt' | 'sweatshirt' | 'hat' | 'tote' | 'jacket' | 'bag' | string {
  const lower = filename.toLowerCase();
  if (lower.includes('hoodie') || lower.includes('sweat') || lower.includes('pullover') || lower.includes('fleece')) {
    return 'sweatshirt';
  }
  if (lower.includes('hat') || lower.includes('cap') || lower.includes('snapback') || lower.includes('beanie') || lower.includes('visor')) {
    return 'hat';
  }
  if (lower.includes('tote') || lower.includes('bag') || lower.includes('backpack') || lower.includes('sack')) {
    return 'tote';
  }
  if (lower.includes('jacket') || lower.includes('denim') || lower.includes('bomber') || lower.includes('vest') || lower.includes('coat')) {
    return 'jacket';
  }
  return 'shirt';
}

/**
 * Query available mockup files from Electron IPC or Vite dev API
 */
export async function fetchDiskMockupFiles(): Promise<DiskMockupFile[]> {
  // 1. Try Native Electron IPC first
  if (window.electronAPI?.listMockupFiles) {
    try {
      const files = await window.electronAPI.listMockupFiles();
      if (Array.isArray(files) && files.length > 0) {
        return files;
      }
    } catch (err) {
      console.warn('Electron listMockupFiles failed, falling back to HTTP:', err);
    }
  }

  // 2. Try Vite Dev Server API Endpoint
  try {
    const res = await fetch('/api/mockups', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch {
    // Silently fall back if running in pure offline static mode
  }

  return [];
}

/**
 * Open the public/mockups folder in the user's OS file manager (Windows Explorer)
 */
export async function openMockupsFolder(): Promise<boolean> {
  if (window.electronAPI?.openMockupsFolder) {
    try {
      return await window.electronAPI.openMockupsFolder();
    } catch (err) {
      console.error('Failed to open mockups folder via Electron:', err);
    }
  }

  try {
    const res = await fetch('/api/open-mockups-folder');
    const data = await res.json();
    return Boolean(data?.success);
  } catch (err) {
    console.error('Failed to open mockups folder via HTTP:', err);
    return false;
  }
}

/**
 * Asynchronously probe an image's natural dimensions
 */
export function probeImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      resolve({
        width: img.naturalWidth > 0 ? img.naturalWidth : 1200,
        height: img.naturalHeight > 0 ? img.naturalHeight : 1200
      });
    };
    img.onerror = () => {
      resolve({ width: 1200, height: 1200 });
    };
    img.src = src;
  });
}

/**
 * Map of core default mockup filenames to their built-in template IDs
 */
const CORE_FILENAME_MAP: Record<string, string> = {
  'tshirt_black.jpg': 'mockup_tshirt_black',
  'tshirt_black.jpeg': 'mockup_tshirt_black',
  'hoodie_gray.jpg': 'mockup_hoodie_heather',
  'hoodie_gray.jpeg': 'mockup_hoodie_heather',
  'cap_navy.jpg': 'mockup_hat_navy',
  'cap_navy.jpeg': 'mockup_hat_navy'
};

/**
 * Synchronize current templates with files found on disk
 */
export async function syncMockupTemplatesWithDisk(
  currentTemplates: MockupTemplate[],
  diskFiles: DiskMockupFile[]
): Promise<MockupTemplate[]> {
  if (!diskFiles || diskFiles.length === 0) {
    // If no disk files found (e.g. running in web preview without dev server), keep current templates
    return currentTemplates.length > 0 ? currentTemplates : [...MOCKUP_TEMPLATES];
  }

  // Preserve any custom templates uploaded by the user via file dialog
  const userCustomTemplates = currentTemplates.filter((t) => t.isCustom);

  // Map of existing templates by ID or filename for fast lookup
  const existingById = new Map<string, MockupTemplate>();
  for (const t of currentTemplates) {
    existingById.set(t.id, t);
    if (t.filename) existingById.set(t.filename, t);
  }

  // Map of core templates
  const coreTemplatesById = new Map<string, MockupTemplate>();
  for (const t of MOCKUP_TEMPLATES) {
    coreTemplatesById.set(t.id, t);
  }

  const resultTemplates: MockupTemplate[] = [];
  const processedIds = new Set<string>();

  for (const file of diskFiles) {
    const lowerFilename = file.filename.toLowerCase();
    const matchedCoreId = CORE_FILENAME_MAP[lowerFilename];

    if (matchedCoreId && coreTemplatesById.has(matchedCoreId)) {
      // 1. One of the 3 calibrated studio templates
      const coreTpl = coreTemplatesById.get(matchedCoreId)!;
      resultTemplates.push({
        ...coreTpl,
        filename: file.filename,
        imageUrl: file.url
      });
      processedIds.add(coreTpl.id);
    } else {
      // 2. Newly pasted or existing additional disk template
      const diskId = `mockup_disk_${file.filename.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const existing = existingById.get(diskId) || existingById.get(file.filename);

      if (existing) {
        // Keep existing user adjustments if modified, just refresh URL in case modified
        resultTemplates.push({
          ...existing,
          imageUrl: file.url,
          filename: file.filename
        });
        processedIds.add(diskId);
      } else {
        // Brand new template! Probe dimensions and set smart placement defaults
        const dims = await probeImageDimensions(file.url);
        const category = inferMockupCategory(file.filename);
        const displayName = formatMockupTitle(file.filename);

        const defaultTransform: MockupTransform = {
          x: 50,
          y: category === 'hat' ? 40 : category === 'tote' ? 52 : 44,
          scale: category === 'hat' ? 0.30 : category === 'tote' ? 0.42 : 0.38,
          rotation: 0,
          opacity: 1,
          blendMode: 'normal',
          displacementStrength: category === 'hat' ? 3.0 : 4.0,
          shadowIntensity: 1.5,
          fabricTextureStrength: 2.0,
          creviceShadowStrength: 2.5
        };

        const newTemplate: MockupTemplate = {
          id: diskId,
          name: displayName,
          category,
          imageUrl: file.url,
          width: dims.width,
          height: dims.height,
          defaultTransform,
          placementZone: {
            x: Math.round(dims.width * 0.32),
            y: Math.round(dims.height * 0.28),
            width: Math.round(dims.width * 0.36),
            height: Math.round(dims.height * 0.34)
          },
          filename: file.filename,
          isCustom: false
        };

        resultTemplates.push(newTemplate);
        processedIds.add(diskId);
      }
    }
  }

  // Ensure all 3 core default templates are always present even if disk scanning was partial
  for (const coreTpl of MOCKUP_TEMPLATES) {
    if (!processedIds.has(coreTpl.id)) {
      resultTemplates.push(coreTpl);
      processedIds.add(coreTpl.id);
    }
  }

  // Re-append user manual upload templates
  for (const customTpl of userCustomTemplates) {
    if (!processedIds.has(customTpl.id)) {
      resultTemplates.push(customTpl);
      processedIds.add(customTpl.id);
    }
  }

  return resultTemplates;
}
