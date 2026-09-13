/**
 * Gumroad License Verification & 14-Day Free Trial Engine
 * Product ID: eR3zHFxrqIi3e8k3QCgGRQ==
 */

export const GUMROAD_PRODUCT_ID = 'eR3zHFxrqIi3e8k3QCgGRQ==';
export const GUMROAD_PURCHASE_URL = 'https://theravenlabs.gumroad.com/l/byptuf?wanted=true';
export const TRIAL_DURATION_DAYS = 14;
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;

export const STORAGE_KEY_LICENSE = 'embroidery_studio_license_v1';
export const STORAGE_KEY_TRIAL = 'embroidery_studio_trial_v1';

export type LicenseStatusType = 'trial_active' | 'trial_expired' | 'licensed' | 'license_invalid';

export interface LicenseState {
  key: string;
  activatedAt: number;
  email?: string;
  purchaseId?: string;
  productName?: string;
  isSubscription?: boolean;
  isSubscriptionCancelled?: boolean;
  isSubscriptionFailed?: boolean;
  lastVerifiedAt: number;
}

export interface TrialState {
  startDate: number;
  lastSeenDate: number;
  deviceFingerprint: string;
  signature: string;
}

export interface AccessStatus {
  status: LicenseStatusType;
  isLocked: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  percentUsed: number;
  license?: LicenseState | null;
  trialStartDate?: number;
}

function getFingerprint(): string {
  if (typeof window === 'undefined') return 'server';
  const nav = window.navigator;
  const screen = window.screen;
  const raw = [
    nav.userAgent || '',
    nav.language || '',
    screen.colorDepth || '',
    screen.width || '',
    screen.height || ''
  ].join('###');

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function generateSignature(startDate: number, fp: string): string {
  const salt = 'embroidery_studio_gumroad_trial_salt_2026';
  const str = startDate + '_' + fp + '_' + salt;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function getLicenseState(): LicenseState | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LICENSE);
    if (!raw) return null;
    return JSON.parse(raw) as LicenseState;
  } catch {
    return null;
  }
}

export function saveLicenseState(state: LicenseState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save license state', err);
  }
}

export function clearLicenseState(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(STORAGE_KEY_LICENSE);
  } catch (err) {
    console.error('Failed to clear license state', err);
  }
}

export function getTrialState(): TrialState {
  const now = Date.now();
  const fp = getFingerprint();

  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      startDate: now,
      lastSeenDate: now,
      deviceFingerprint: fp,
      signature: generateSignature(now, fp)
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRIAL);
    if (raw) {
      const parsed = JSON.parse(raw) as TrialState;
      const expectedSig = generateSignature(parsed.startDate, parsed.deviceFingerprint || fp);

      // Tamper detection: if signature is invalid
      if (parsed.signature !== expectedSig) {
        console.warn('Tampered trial detected, expiring trial');
        const expired = {
          startDate: now - TRIAL_DURATION_MS - 1000,
          lastSeenDate: now,
          deviceFingerprint: fp,
          signature: generateSignature(now - TRIAL_DURATION_MS - 1000, fp)
        };
        localStorage.setItem(STORAGE_KEY_TRIAL, JSON.stringify(expired));
        return expired;
      }

      // Check clock manipulation
      if (parsed.lastSeenDate && now < parsed.lastSeenDate - 86400000) {
        console.warn('Clock rollback detected');
      }

      // Update last seen date
      parsed.lastSeenDate = Math.max(parsed.lastSeenDate || now, now);
      localStorage.setItem(STORAGE_KEY_TRIAL, JSON.stringify(parsed));
      return parsed;
    }
  } catch {
    // If parse fails, create new
  }

  // First time launch: Initialize 14-day free trial!
  const newTrial: TrialState = {
    startDate: now,
    lastSeenDate: now,
    deviceFingerprint: fp,
    signature: generateSignature(now, fp)
  };

  try {
    localStorage.setItem(STORAGE_KEY_TRIAL, JSON.stringify(newTrial));
  } catch (err) {
    console.error('Failed to save trial state', err);
  }

  return newTrial;
}

export function checkAccessStatus(): AccessStatus {
  // 1. Check if user has an activated Gumroad license
  const license = getLicenseState();
  if (license && license.key) {
    return {
      status: 'licensed',
      isLocked: false,
      daysRemaining: 9999,
      hoursRemaining: 9999,
      percentUsed: 0,
      license
    };
  }

  // 2. Check 14-day trial status
  const trial = getTrialState();
  const now = Date.now();
  // Clock rollback protection: effective time cannot move backward
  const effectiveNow = Math.max(now, trial.lastSeenDate || now);
  const elapsedMs = effectiveNow - trial.startDate;
  const remainingMs = TRIAL_DURATION_MS - elapsedMs;

  if (remainingMs <= 0) {
    return {
      status: 'trial_expired',
      isLocked: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      percentUsed: 100,
      trialStartDate: trial.startDate
    };
  }

  const daysRemaining = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.max(0, Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)));
  const percentUsed = Math.min(100, Math.max(0, Math.round((elapsedMs / TRIAL_DURATION_MS) * 100)));

  return {
    status: 'trial_active',
    isLocked: false,
    daysRemaining: Math.max(0, daysRemaining),
    hoursRemaining,
    percentUsed,
    trialStartDate: trial.startDate
  };
}

/**
 * Verify license key with Gumroad API
 */
export async function verifyGumroadLicense(
  licenseKey: string,
  incrementUses = false
): Promise<{ success: boolean; message?: string; license?: LicenseState }> {
  const cleanKey = licenseKey.trim();
  if (!cleanKey) {
    return { success: false, message: 'Please enter a valid license key.' };
  }

  try {
    const params = new URLSearchParams();
    params.append('product_id', GUMROAD_PRODUCT_ID);
    params.append('license_key', cleanKey);
    if (incrementUses) {
      params.append('increment_uses_count', 'true');
    }

    const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    const data = await res.json();

    if (data.success) {
      const purchase = data.purchase || {};
      if (purchase.refunded || purchase.chargebacked) {
        return {
          success: false,
          message: 'This license has been refunded or chargebacked.'
        };
      }

      if (purchase.subscription_cancelled_at || purchase.subscription_failed_at) {
        return {
          success: false,
          message: 'The subscription associated with this license is no longer active.'
        };
      }

      const license: LicenseState = {
        key: cleanKey,
        activatedAt: Date.now(),
        email: purchase.email || 'Customer',
        purchaseId: purchase.id,
        productName: purchase.product_name || 'Embroidery Studio',
        isSubscription: purchase.subscription_id !== undefined,
        lastVerifiedAt: Date.now()
      };

      saveLicenseState(license);
      return { success: true, license };
    } else {
      return {
        success: false,
        message: data.message || 'That license does not exist for the provided product.'
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Unable to connect to Gumroad license server. Check your internet connection.'
    };
  }
}

// Dev & Testing Utilities:
export function devResetTrial(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const now = Date.now();
  const fp = getFingerprint();
  const freshTrial: TrialState = {
    startDate: now,
    lastSeenDate: now,
    deviceFingerprint: fp,
    signature: generateSignature(now, fp)
  };
  localStorage.setItem(STORAGE_KEY_TRIAL, JSON.stringify(freshTrial));
}

export function devExpireTrial(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const now = Date.now();
  const fp = getFingerprint();
  const expiredDate = now - (TRIAL_DURATION_MS + 24 * 60 * 60 * 1000); // 15 days ago
  const expiredTrial: TrialState = {
    startDate: expiredDate,
    lastSeenDate: now,
    deviceFingerprint: fp,
    signature: generateSignature(expiredDate, fp)
  };
  localStorage.setItem(STORAGE_KEY_TRIAL, JSON.stringify(expiredTrial));
}
