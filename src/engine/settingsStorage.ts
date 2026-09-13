import { EmbroiderySettings, MockupTransform, ThreadStudioConfig } from '../types';
import { DEFAULT_EMBROIDERY_SETTINGS, DEFAULT_THREAD_STUDIO_CONFIG } from './presets';
import { MOCKUP_TEMPLATES } from './mockupRenderer';

export const STORAGE_KEY_SETTINGS = 'embroidery_studio_user_settings_v1';

export interface ViewportPreferences {
  showCheckerboard?: boolean;
  showRulers?: boolean;
}

export interface SavedUserSettings {
  version: number;
  lastSavedAt: number;
  settings: EmbroiderySettings;
  transform: MockupTransform;
  selectedMockupId?: string;
  viewport?: ViewportPreferences;
}

export interface LoadSettingsResult {
  settings: EmbroiderySettings;
  transform: MockupTransform;
  selectedMockupId?: string;
  viewport?: ViewportPreferences;
  hasSavedSettings: boolean;
  lastSavedAt: number;
}

// In-memory fallback for non-browser or test environments
const memoryStore: Record<string, string> = {};

function getStorageItem(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return memoryStore[key] ?? null;
}

function setStorageItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore quota errors
    }
  }
  memoryStore[key] = value;
}

function removeStorageItem(key: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  }
  delete memoryStore[key];
}

/**
 * Deep merge saved settings with default settings to guarantee all fields exist.
 */
function mergeWithDefaults(
  savedSettings?: Partial<EmbroiderySettings>
): EmbroiderySettings {
  if (!savedSettings || typeof savedSettings !== 'object') {
    return { ...DEFAULT_EMBROIDERY_SETTINGS };
  }

  const mergedThreadStudio: ThreadStudioConfig = {
    ...DEFAULT_THREAD_STUDIO_CONFIG,
    ...(savedSettings.threadStudio || {})
  };

  return {
    ...DEFAULT_EMBROIDERY_SETTINGS,
    ...savedSettings,
    threadStudio: mergedThreadStudio
  };
}

/**
 * Deep merge saved transform with default transform.
 */
function mergeTransformWithDefaults(
  savedTransform?: Partial<MockupTransform>
): MockupTransform {
  const defaultTransform = MOCKUP_TEMPLATES[0].defaultTransform;
  if (!savedTransform || typeof savedTransform !== 'object') {
    return { ...defaultTransform };
  }

  return {
    ...defaultTransform,
    ...savedTransform,
    // Ensure realistic wrap properties are numeric and safely defaulted
    displacementStrength: typeof savedTransform.displacementStrength === 'number'
      ? savedTransform.displacementStrength
      : defaultTransform.displacementStrength,
    fabricTextureStrength: typeof savedTransform.fabricTextureStrength === 'number'
      ? savedTransform.fabricTextureStrength
      : (defaultTransform.fabricTextureStrength ?? 2),
    creviceShadowStrength: typeof savedTransform.creviceShadowStrength === 'number'
      ? savedTransform.creviceShadowStrength
      : (defaultTransform.creviceShadowStrength ?? 2.5),
    shadowIntensity: typeof savedTransform.shadowIntensity === 'number'
      ? savedTransform.shadowIntensity
      : defaultTransform.shadowIntensity
  };
}

/**
 * Synchronously load saved user settings from localStorage (with deep defaults fallback)
 */
export function loadSavedSettings(): LoadSettingsResult {
  try {
    const raw = getStorageItem(STORAGE_KEY_SETTINGS);
    if (!raw) {
      return {
        settings: { ...DEFAULT_EMBROIDERY_SETTINGS },
        transform: { ...MOCKUP_TEMPLATES[0].defaultTransform },
        selectedMockupId: MOCKUP_TEMPLATES[0].id,
        viewport: { showCheckerboard: true, showRulers: true },
        hasSavedSettings: false,
        lastSavedAt: 0
      };
    }

    const parsed = JSON.parse(raw) as Partial<SavedUserSettings>;
    const settings = mergeWithDefaults(parsed.settings);
    const transform = mergeTransformWithDefaults(parsed.transform);

    return {
      settings,
      transform,
      selectedMockupId: parsed.selectedMockupId || MOCKUP_TEMPLATES[0].id,
      viewport: parsed.viewport || { showCheckerboard: true, showRulers: true },
      hasSavedSettings: true,
      lastSavedAt: parsed.lastSavedAt || 0
    };
  } catch (err) {
    console.warn('Failed to load saved settings, using factory defaults:', err);
    return {
      settings: { ...DEFAULT_EMBROIDERY_SETTINGS },
      transform: { ...MOCKUP_TEMPLATES[0].defaultTransform },
      selectedMockupId: MOCKUP_TEMPLATES[0].id,
      viewport: { showCheckerboard: true, showRulers: true },
      hasSavedSettings: false,
      lastSavedAt: 0
    };
  }
}

/**
 * Save user settings immediately to local storage and Electron filesystem
 */
export function saveUserSettings(
  settings: EmbroiderySettings,
  transform: MockupTransform,
  selectedMockupId?: string,
  viewport?: ViewportPreferences
): SavedUserSettings {
  const payload: SavedUserSettings = {
    version: 1,
    lastSavedAt: Date.now(),
    settings,
    transform,
    selectedMockupId,
    viewport
  };

  try {
    const json = JSON.stringify(payload);
    setStorageItem(STORAGE_KEY_SETTINGS, json);

    // Save to Electron filesystem if running in Electron
    if (typeof window !== 'undefined' && window.electronAPI?.saveUserSettings) {
      void window.electronAPI.saveUserSettings(payload);
    }

    // Broadcast saved event for visual UI toast/indicators
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent('embroidery-settings-saved', {
          detail: { lastSavedAt: payload.lastSavedAt }
        })
      );
    }
  } catch (err) {
    console.warn('Failed to save user settings:', err);
  }

  return payload;
}

/**
 * Save partial user settings (e.g. only embroidery settings or only mockup placement)
 */
export function savePartialUserSettings(
  part: {
    settings?: EmbroiderySettings;
    transform?: MockupTransform;
    selectedMockupId?: string;
    viewport?: ViewportPreferences;
  }
): SavedUserSettings {
  const current = loadSavedSettings();
  return saveUserSettings(
    part.settings ?? current.settings,
    part.transform ?? current.transform,
    part.selectedMockupId ?? current.selectedMockupId,
    part.viewport ?? current.viewport
  );
}

// Debounce state for auto-saving during rapid slider changes
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave: {
  settings: EmbroiderySettings;
  transform: MockupTransform;
  selectedMockupId?: string;
  viewport?: ViewportPreferences;
} | null = null;

/**
 * Debounced auto-save to prevent thrashing storage on slider dragging
 */
export function scheduleSaveUserSettings(
  settings: EmbroiderySettings,
  transform: MockupTransform,
  selectedMockupId?: string,
  viewport?: ViewportPreferences,
  debounceMs: number = 300
): void {
  pendingSave = { settings, transform, selectedMockupId, viewport };

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    flushPendingSave();
  }, debounceMs);
}

/**
 * Flush any pending debounced save immediately
 */
export function flushPendingSave(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (pendingSave) {
    const { settings, transform, selectedMockupId, viewport } = pendingSave;
    pendingSave = null;
    saveUserSettings(settings, transform, selectedMockupId, viewport);
  }
}

// Hook into window beforeunload to ensure nothing is lost if app closes during debounce
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushPendingSave();
  });
}

/**
 * Reset saved user settings back to factory defaults
 */
export function resetUserSettings(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pendingSave = null;
  removeStorageItem(STORAGE_KEY_SETTINGS);

  if (typeof window !== 'undefined' && window.electronAPI?.saveUserSettings) {
    void window.electronAPI.saveUserSettings(null);
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent('embroidery-settings-reset', {
        detail: { timestamp: Date.now() }
      })
    );
  }
}
