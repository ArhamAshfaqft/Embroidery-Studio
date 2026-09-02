import React from 'react';
import { AppScreen } from '../types';
import {
  Layers,
  Sparkles,
  Shirt,
  ZoomIn,
  ZoomOut,
  Columns,
  Download,
  Grid,
  FileImage,
  Wand2,
  Eye,
  EyeOff
} from 'lucide-react';

interface HeaderProps {
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onResetZoom: () => void;
  showComparison: boolean;
  onToggleComparison: () => void;
  showCheckerboard: boolean;
  onToggleCheckerboard: () => void;
  isPreviewMode: boolean;
  onTogglePreviewMode: () => void;
  onOpenExport: () => void;
  onTriggerSmartOptimize: () => void;
  sourceName: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeScreen,
  onNavigate,
  zoom,
  onZoomChange,
  onResetZoom,
  showComparison,
  onToggleComparison,
  showCheckerboard,
  onToggleCheckerboard,
  isPreviewMode,
  onTogglePreviewMode,
  onOpenExport,
  onTriggerSmartOptimize,
  sourceName
}) => {
  return (
    <header className="h-13 border-b border-white/[0.08] bg-[#09090b]/95 backdrop-blur-md flex items-center justify-between px-4 select-none z-30 shrink-0">
      {/* Left: Studio Branding & Active Asset */}
      <div className="flex items-center space-x-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-b from-white to-neutral-300 flex items-center justify-center shadow-md">
            <span className="text-[12px] font-bold text-neutral-950 tracking-tighter">R</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5">
              <span className="text-[13px] font-semibold tracking-tight text-white">
                Raven Studio
              </span>
              <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400 bg-white/[0.06] px-1.5 py-0.2 rounded border border-white/[0.08]">
                v2.4 Pro
              </span>
            </div>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-white/[0.08]" />

        <div className="flex items-center space-x-1.5 text-xs text-neutral-400 max-w-[200px]">
          <FileImage size={12} className="text-neutral-500 shrink-0" />
          <span className="font-mono text-[11px] text-neutral-300 truncate tracking-tight">
            {sourceName}
          </span>
        </div>
      </div>

      {/* Center: Main Screen Workflow Tabs */}
      <div className="flex items-center bg-[#141418] p-0.5 rounded-lg border border-white/[0.06] shadow-inner">
        <button
          onClick={() => onNavigate('create')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeScreen === 'create'
              ? 'bg-[#27272f] text-white shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Layers size={13} className={activeScreen === 'create' ? 'text-white' : 'text-neutral-500'} />
          <span>Source & Text</span>
          <span className="text-[9px] font-mono text-neutral-500 bg-black/30 px-1 py-0.2 rounded">1</span>
        </button>

        <button
          onClick={() => onNavigate('embroidery')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeScreen === 'embroidery'
              ? 'bg-[#27272f] text-white shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sparkles size={13} className={activeScreen === 'embroidery' ? 'text-white' : 'text-neutral-500'} />
          <span>Embroidery Engine</span>
          <span className="text-[9px] font-mono text-neutral-500 bg-black/30 px-1 py-0.2 rounded">2</span>
        </button>

        <button
          onClick={() => onNavigate('mockup')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeScreen === 'mockup'
              ? 'bg-[#27272f] text-white shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Shirt size={13} className={activeScreen === 'mockup' ? 'text-white' : 'text-neutral-500'} />
          <span>Apparel Mockup</span>
          <span className="text-[9px] font-mono text-neutral-500 bg-black/30 px-1 py-0.2 rounded">3</span>
        </button>
      </div>

      {/* Right: Smart Auto-Optimize & Viewport Controls & Export */}
      <div className="flex items-center space-x-2">
        {/* Smart Auto-Optimize Button */}
        <button
          onClick={onTriggerSmartOptimize}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-[#1e1e26] border border-white/20 text-white text-xs font-medium hover:bg-[#282834] hover:border-white/40 transition-all shadow-sm group"
          title="Smart Auto-Optimize: Analyzes artwork strokes and colors to apply optimal embroidery settings"
        >
          <Wand2 size={12} className="text-white group-hover:rotate-12 transition-transform" />
          <span>Smart Auto-Tune</span>
        </button>

        <div className="h-4 w-[1px] bg-white/[0.08]" />

        {/* Zoom Controls */}
        {activeScreen !== 'create' && (
          <div className="flex items-center bg-[#141418] rounded-md border border-white/[0.06] p-0.5 space-x-0.5 shadow-sm">
            <button
              onClick={() => onZoomChange(Math.max(0.05, zoom * 0.8))}
              className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={12} />
            </button>
            <button
              onClick={onResetZoom}
              className="px-1.5 text-[11px] font-mono text-neutral-300 hover:text-white"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => onZoomChange(Math.min(5.0, zoom * 1.25))}
              className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={12} />
            </button>
          </div>
        )}

        {/* Split Comparison toggle */}
        {activeScreen === 'embroidery' && (
          <button
            onClick={onToggleComparison}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all ${
              showComparison
                ? 'bg-[#27272f] border-white/20 text-white shadow-sm'
                : 'bg-[#141418] border-white/[0.06] text-neutral-400 hover:text-neutral-200'
            }`}
            title="Toggle Split Comparison View (Tab)"
          >
            <Columns size={12} className={showComparison ? 'text-white' : 'text-neutral-500'} />
            <span className="hidden sm:inline">Split View</span>
          </button>
        )}

        {/* Checkerboard toggle */}
        {activeScreen === 'embroidery' && (
          <button
            onClick={onToggleCheckerboard}
            className={`p-1.5 rounded-md border text-xs transition-all ${
              showCheckerboard
                ? 'bg-[#27272f] border-white/20 text-white shadow-sm'
                : 'bg-[#141418] border-white/[0.06] text-neutral-400 hover:text-neutral-200'
            }`}
            title="Toggle Transparency Checkerboard (Ctrl+G)"
          >
            <Grid size={12} />
          </button>
        )}

        {/* Clean Preview Mode Button */}
        {activeScreen !== 'create' && (
          <button
            onClick={onTogglePreviewMode}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all ${
              isPreviewMode
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 shadow-sm'
                : 'bg-[#141418] border-white/[0.06] text-neutral-400 hover:text-neutral-200'
            }`}
            title="Toggle Clean Preview Mode (W or Ctrl+H)"
          >
            {isPreviewMode ? <EyeOff size={12} /> : <Eye size={12} />}
            <span className="hidden sm:inline">{isPreviewMode ? 'Exit Preview' : 'Preview'}</span>
          </button>
        )}

        {/* Primary Export Button */}
        <button
          onClick={onOpenExport}
          className="pro-btn flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-neutral-950 text-xs font-semibold transition-all"
        >
          <Download size={13} />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
