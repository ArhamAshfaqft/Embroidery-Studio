import React, { useState } from 'react';
import {
  AccessStatus,
  verifyGumroadLicense,
  clearLicenseState,
  checkAccessStatus,
  devResetTrial,
  devExpireTrial,
  GUMROAD_PRODUCT_ID,
  GUMROAD_PURCHASE_URL
} from '../engine/licenseEngine';
import {
  ShieldCheck,
  Sparkles,
  Lock,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  RotateCcw,
  Zap
} from 'lucide-react';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessStatus: AccessStatus;
  onStatusChange: (status: AccessStatus) => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onClose,
  accessStatus,
  onStatusChange
}) => {
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isLocked = accessStatus.isLocked;
  const isLicensed = accessStatus.status === 'licensed';
  const isTrialActive = accessStatus.status === 'trial_active';
  const isTrialExpired = accessStatus.status === 'trial_expired';

  const handleActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!licenseKeyInput.trim()) {
      setErrorMessage('Please enter your Gumroad license key.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await verifyGumroadLicense(licenseKeyInput.trim());
    setIsVerifying(false);

    if (result.success && result.license) {
      setSuccessMessage('License successfully verified and activated! Full Pro access granted.');
      setLicenseKeyInput('');
      const updated = checkAccessStatus();
      onStatusChange(updated);
    } else {
      setErrorMessage(result.message || 'Verification failed. Please check the license key and try again.');
    }
  };

  const handleDeactivate = () => {
    if (window.confirm('Are you sure you want to deactivate and remove this license from this computer?')) {
      clearLicenseState();
      const updated = checkAccessStatus();
      onStatusChange(updated);
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  };

  const handleDevReset = () => {
    devResetTrial();
    const updated = checkAccessStatus();
    onStatusChange(updated);
    setErrorMessage(null);
    setSuccessMessage('Trial reset back to 14 days!');
  };

  const handleDevExpire = () => {
    devExpireTrial();
    const updated = checkAccessStatus();
    onStatusChange(updated);
    setSuccessMessage(null);
    setErrorMessage('Simulated 14-day trial expiration (Paywall Active).');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#141418] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-[#171720] to-[#121216]">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                isLicensed
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isTrialExpired
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
              }`}
            >
              {isLicensed ? (
                <ShieldCheck size={22} />
              ) : isTrialExpired ? (
                <Lock size={20} />
              ) : (
                <Sparkles size={20} />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
                <span>
                  {isLicensed
                    ? 'Pro License Active'
                    : isTrialExpired
                    ? '14-Day Free Trial Ended'
                    : '14-Day Free Trial'}
                </span>
                {isLicensed && (
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Pro Unlocked
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {isLicensed
                  ? 'Your software is licensed with unrestricted access.'
                  : isTrialExpired
                  ? 'Your 14 days of free usage have concluded.'
                  : 'Full access to all 3D Thread Studio features & exports.'}
              </p>
            </div>
          </div>

          {!isLocked && (
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Status Notification Box */}
          {isTrialActive && (
            <div className="p-4 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Clock size={16} className="text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Trial in Progress
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {accessStatus.daysRemaining} days, {accessStatus.hoursRemaining}h remaining
                </span>
              </div>
              <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden mb-2 border border-white/10">
                <div
                  className="bg-gradient-to-r from-amber-400 to-amber-300 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(4, 100 - accessStatus.percentUsed)}%` }}
                />
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Enjoy your 14-day free trial! You can generate realistic 3D stitches, preview apparel mockups, and export high-res files without limitations.
              </p>
            </div>
          )}

          {isTrialExpired && (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 space-y-2">
              <div className="flex items-center space-x-2">
                <Lock size={16} className="text-rose-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                  Trial Expired
                </span>
              </div>
              <p className="text-[11px] text-neutral-200 leading-relaxed">
                We hope you enjoyed testing <strong>Embroidery Studio</strong>! Your 14-day trial has completed. To continue using the software and exporting production designs, please enter your Gumroad license key below.
              </p>
            </div>
          )}

          {isLicensed && accessStatus.license && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    Licensed & Verified
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-400">
                  Gumroad Verified
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono">Product</div>
                  <div className="text-neutral-200 font-semibold truncate">{accessStatus.license.productName}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono">Registered Email</div>
                  <div className="text-neutral-200 truncate">{accessStatus.license.email || 'Verified Customer'}</div>
                </div>
              </div>
              <div className="pt-1">
                <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono">License Key</div>
                <div className="font-mono text-xs text-neutral-300 bg-black/40 px-2 py-1 rounded border border-white/10 truncate">
                  ••••-••••-••••-{accessStatus.license.key.slice(-8)}
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleDeactivate}
                  className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors font-mono"
                >
                  Deactivate License on This Device
                </button>
              </div>
            </div>
          )}

          {/* Feedback alerts */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Activation Form (Only when not licensed) */}
          {!isLicensed && (
            <form onSubmit={handleActivate} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                  Gumroad License Key
                </label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    placeholder="e.g. 6F0E4C97-B72A4E69-A11BF6C4-AF6517E7"
                    className="w-full bg-[#181820] border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-400/70 focus:ring-1 focus:ring-amber-400/40 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="submit"
                  disabled={isVerifying || !licenseKeyInput.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-xs shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isVerifying ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                      <span>Verifying with Gumroad...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      <span>Activate Pro License</span>
                    </>
                  )}
                </button>

                <a
                  href={GUMROAD_PURCHASE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-[#1d1d26] border border-white/15 hover:bg-[#252532] text-neutral-200 text-xs font-medium transition-all flex items-center space-x-1.5 shrink-0"
                >
                  <span>Buy on Gumroad</span>
                  <ExternalLink size={12} className="text-neutral-400" />
                </a>
              </div>
            </form>
          )}

          {/* Dev Mode Only Shortcuts (Completely hidden in production builds) */}
          {import.meta.env.DEV && (
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-neutral-500">
              <span className="font-mono uppercase tracking-wider">Dev Mode Only:</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDevReset}
                  className="hover:text-amber-400 transition-colors flex items-center space-x-1"
                  title="Reset trial timer to full 14 days"
                >
                  <RotateCcw size={10} />
                  <span>Reset 14d Trial</span>
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleDevExpire}
                  className="hover:text-rose-400 transition-colors flex items-center space-x-1"
                  title="Fast-forward trial to expired (test paywall screen)"
                >
                  <Lock size={10} />
                  <span>Simulate Expired</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
