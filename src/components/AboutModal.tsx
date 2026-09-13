import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Info
} from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const email = 'arham.ashfaqft@gmail.com';
  const whatsappDisplay = '+92 309 6496878';
  const whatsappUrl = 'https://wa.me/923096496878';
  const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(
    'Custom Software / Website / Dashboard Inquiry'
  )}`;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#141418] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-neutral-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-[#171720] to-[#121216]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
              <img
                src="/EV-logo.png"
                alt="Embroidery Studio"
                className="w-6 h-6 rounded object-cover"
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Embroidery Studio</span>
                <span className="text-[10px] font-mono text-neutral-400 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/10">
                  v2.1
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Photorealistic Embroidery & Apparel Mockup Studio
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Custom Software / Agency Card */}
          <div className="p-4 rounded-xl bg-[#1a1a22] border border-white/10 space-y-3">
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-amber-400 font-bold mb-1">
                Custom Development
              </div>
              <h3 className="text-sm font-semibold text-white">
                Need a custom website, software, or dashboard?
              </h3>
              <p className="text-neutral-400 text-[11px] mt-1.5 leading-relaxed">
                I build custom websites, dashboards, and tailored workflow software for businesses and brands.
              </p>
            </div>

            <div className="text-[11px] text-neutral-300 font-medium">
              Created by <span className="text-white font-semibold">Arham Ashfaq</span>
            </div>

            {/* Direct Contact Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <MessageCircle size={14} className="text-emerald-400" />
                <span>WhatsApp</span>
                <ExternalLink size={11} className="text-neutral-500" />
              </a>

              <a
                href={mailtoUrl}
                className="py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Mail size={14} className="text-amber-400" />
                <span>Email</span>
                <ExternalLink size={11} className="text-neutral-500" />
              </a>
            </div>

            {/* Direct Details Row with Copy Buttons */}
            <div className="pt-2 border-t border-white/[0.08] space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Email:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-neutral-300">{email}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(email, 'email')}
                    className="text-neutral-400 hover:text-white transition-colors cursor-pointer p-0.5"
                    title="Copy Email"
                  >
                    {copied === 'email' ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500">WhatsApp:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-neutral-300">{whatsappDisplay}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('+923096496878', 'whatsapp')}
                    className="text-neutral-400 hover:text-white transition-colors cursor-pointer p-0.5"
                    title="Copy WhatsApp"
                  >
                    {copied === 'whatsapp' ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#101014] flex items-center justify-between text-[11px] text-neutral-500">
          <span>Embroidery Studio</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-neutral-200 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
