import React from 'react';
import { SmartAnalysisResult } from '../engine/smartOptimizer';
import { Sparkles, CheckCircle2, X, Wand2, Shield, Compass, Sun, Palette } from 'lucide-react';

interface SmartAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: SmartAnalysisResult | null;
  onApply: () => void;
}

export const SmartAnalysisModal: React.FC<SmartAnalysisModalProps> = ({
  isOpen,
  onClose,
  result,
  onApply
}) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#121217] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#16161c]">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-white to-neutral-300 text-neutral-950 flex items-center justify-center shadow-md">
              <Wand2 size={13} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider">
                Smart Embroidery Analysis
              </h3>
              <p className="text-[10px] text-neutral-400 font-mono">
                Computer Vision Optimization Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Classification Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#1c1c24] to-[#16161d] border border-white/[0.08] flex items-center justify-between shadow-inner">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">
                Detected Design Classification
              </span>
              <span className="text-sm font-bold text-white mt-0.5 tracking-tight">
                {result.designTypeLabel}
              </span>
            </div>
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-[11px] font-mono text-white">
              <CheckCircle2 size={12} className="text-white" />
              <span>{result.confidence}% Confidence</span>
            </div>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg bg-[#16161b] border border-white/[0.06]">
              <div className="text-[10px] text-neutral-400 uppercase font-mono">Avg Stroke</div>
              <div className="text-xs font-mono font-bold text-neutral-200 mt-0.5">
                {result.averageStrokeWidth} px
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#16161b] border border-white/[0.06]">
              <div className="text-[10px] text-neutral-400 uppercase font-mono">Coverage</div>
              <div className="text-xs font-mono font-bold text-neutral-200 mt-0.5">
                {Math.round(result.fillCoverageRatio * 100)}%
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#16161b] border border-white/[0.06]">
              <div className="text-[10px] text-neutral-400 uppercase font-mono">Color Gamut</div>
              <div className="text-xs font-mono font-bold text-neutral-200 mt-0.5 truncate">
                {result.dominantHue}
              </div>
            </div>
          </div>

          {/* Key Optimization Decisions */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
              Calculated Settings & Decisions
            </span>
            <div className="space-y-1.5 bg-[#0e0e12] p-3 rounded-xl border border-white/[0.06]">
              {result.keyDecisions.map((dec, i) => (
                <div key={i} className="flex items-start space-x-2 text-[11px] text-neutral-300 leading-relaxed">
                  <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                  <span>{dec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0d0d11] border-t border-white/[0.08]">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onApply();
              onClose();
            }}
            className="pro-btn flex items-center space-x-2 px-5 py-2.5 rounded-xl text-neutral-950 text-xs font-bold transition-all shadow-xl"
          >
            <Sparkles size={13} />
            <span>Apply Optimal Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
