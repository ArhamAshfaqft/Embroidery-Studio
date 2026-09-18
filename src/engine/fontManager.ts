/**
 * Font Manager for Embroidery Studio
 * Supports uploading, storing, and rendering custom user fonts (.ttf, .otf, .woff, .woff2)
 * alongside built-in curated embroidery studio fonts.
 */

export interface CustomFontItem {
  id: string;
  name: string;
  family: string;
  rawFamilyName: string;
  fileName: string;
  dataUrl: string;
  format: 'truetype' | 'opentype' | 'woff' | 'woff2';
  createdAt: number;
}

export interface FontOption {
  name: string;
  label: string;
  family: string;
  isCustom?: boolean;
  id?: string;
  fileName?: string;
}

export const BUILTIN_FONTS: FontOption[] = [
  { name: 'Alfa Slab One', label: 'Varsity Block (Heavy)', family: "'Alfa Slab One', cursive" },
  { name: 'Bebas Neue', label: 'Athletic Condensed', family: "'Bebas Neue', sans-serif" },
  { name: 'Oswald', label: 'Heavyweight Sans', family: "'Oswald', sans-serif" },
  { name: 'Montserrat', label: 'Modern Geometric Bold', family: "'Montserrat', sans-serif" },
  { name: 'Cinzel', label: 'Classic Roman Serif', family: "'Cinzel', serif" },
  { name: 'Playfair Display', label: 'Luxury Display Serif', family: "'Playfair Display', serif" },
  { name: 'Alex Brush', label: 'Formal Calligraphy', family: "'Alex Brush', cursive" },
  { name: 'Great Vibes', label: 'Flowing Script', family: "'Great Vibes', cursive" },
  { name: 'Rye', label: 'Vintage Western', family: "'Rye', serif" },
  { name: 'Inter', label: 'Clean Technical', family: "'Inter', sans-serif" }
];

const DB_NAME = 'embroidery_studio_fonts_db';
const DB_VERSION = 1;
const STORE_NAME = 'custom_fonts';
const LOCAL_STORAGE_KEY = 'embroidery_studio_custom_fonts_v1';

// In-memory cache of loaded fonts
let cachedCustomFonts: CustomFontItem[] | null = null;

function openFontDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCustomFontToStorage(font: CustomFontItem): Promise<void> {
  try {
    const db = await openFontDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(font);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      const fonts: CustomFontItem[] = existingStr ? JSON.parse(existingStr) : [];
      const updated = [...fonts.filter(f => f.id !== font.id), font];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore quota error
    }
  }

  if (cachedCustomFonts) {
    cachedCustomFonts = [...cachedCustomFonts.filter(f => f.id !== font.id), font];
  }
}

export async function deleteCustomFontFromStorage(id: string): Promise<void> {
  try {
    const db = await openFontDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (existingStr) {
        const fonts: CustomFontItem[] = JSON.parse(existingStr);
        const updated = fonts.filter(f => f.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {
      // Ignore
    }
  }

  if (typeof document !== 'undefined') {
    const styleElem = document.getElementById(`font-style-${id}`);
    if (styleElem && styleElem.parentNode) {
      styleElem.parentNode.removeChild(styleElem);
    }
  }

  if (cachedCustomFonts) {
    cachedCustomFonts = cachedCustomFonts.filter(f => f.id !== id);
  }
}

export async function loadCustomFontsFromStorage(): Promise<CustomFontItem[]> {
  if (cachedCustomFonts !== null) {
    return cachedCustomFonts;
  }

  let loadedFonts: CustomFontItem[] = [];

  try {
    const db = await openFontDB();
    loadedFonts = await new Promise<CustomFontItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const str = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (str) {
        loadedFonts = JSON.parse(str);
      }
    } catch {
      loadedFonts = [];
    }
  }

  for (const font of loadedFonts) {
    await registerFontFace(font).catch(() => {});
  }

  cachedCustomFonts = loadedFonts;
  return loadedFonts;
}

export async function registerFontFace(font: CustomFontItem): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  try {
    if (typeof FontFace !== 'undefined') {
      const fontFace = new FontFace(font.rawFamilyName, `url("${font.dataUrl}")`);
      const loadedFace = await fontFace.load();
      document.fonts.add(loadedFace);
    }

    let styleElem = document.getElementById(`font-style-${font.id}`) as HTMLStyleElement | null;
    if (!styleElem) {
      styleElem = document.createElement('style');
      styleElem.id = `font-style-${font.id}`;
      document.head.appendChild(styleElem);
    }
    styleElem.textContent = `
      @font-face {
        font-family: "${font.rawFamilyName}";
        src: url("${font.dataUrl}") format("${font.format}");
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }
    `;

    return true;
  } catch (err) {
    console.warn(`Could not register font "${font.name}":`, err);
    return false;
  }
}

export function deriveFontFamilyNames(fileName: string): { label: string; rawFamilyName: string; family: string } {
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const label = baseName
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  const safeId = baseName.replace(/[^a-zA-Z0-9]/g, '_');
  const rawFamilyName = `CustomFont_${safeId}`;
  const family = `"${rawFamilyName}", sans-serif`;

  return { label, rawFamilyName, family };
}

export function inferFontFormat(fileName: string): 'truetype' | 'opentype' | 'woff' | 'woff2' {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'otf') return 'opentype';
  if (ext === 'woff') return 'woff';
  if (ext === 'woff2') return 'woff2';
  return 'truetype';
}

export async function processFontFile(file: File): Promise<CustomFontItem> {
  const isFont = /\.(ttf|otf|woff|woff2)$/i.test(file.name) || file.type.includes('font');
  if (!isFont) {
    throw new Error('Unsupported format. Please upload a .ttf, .otf, .woff, or .woff2 font file.');
  }

  const format = inferFontFormat(file.name);
  const { label, rawFamilyName, family } = deriveFontFamilyNames(file.name);

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const fontItem: CustomFontItem = {
    id: `font_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    name: label,
    family,
    rawFamilyName,
    fileName: file.name,
    dataUrl,
    format,
    createdAt: Date.now()
  };

  await registerFontFace(fontItem);
  await saveCustomFontToStorage(fontItem);

  return fontItem;
}

export function getAllFontOptions(customFonts: CustomFontItem[] = []): FontOption[] {
  const customOptions: FontOption[] = customFonts.map(f => ({
    name: f.name,
    label: f.name,
    family: f.family,
    isCustom: true,
    id: f.id,
    fileName: f.fileName
  }));

  return [...customOptions, ...BUILTIN_FONTS];
}
