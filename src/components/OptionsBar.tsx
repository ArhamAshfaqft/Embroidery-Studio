import React from 'react';
import { ToolType, EmbroiderySettings } from '../types';
import {
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Plus,
  Minus
} from 'lucide-react';

interface OptionsBarProps {
  activeTool: ToolType;
  settings: EmbroiderySettings;
  onUpdateSettings: (updated: Partial<EmbroiderySettings>) => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  zoomMode: 'in' | 'out';
  onSetZoomMode: (mode: 'in' | 'out') => void;
}

export const OptionsBar: React.FC<OptionsBarProps> = ({
  activeTool,
  settings,
  onUpdateSettings,
  zoom,
  onZoomChange,
  onResetZoom,
  onFitToScreen,
  zoomMode,
  onSetZoomMode
}) => {
  return (
    <div className="h-8 bg-[#18181c] border-b border-white/[0.07] px-3 flex items-center space-x-4 text-xs select-none text-neutral-300 font-sans z-30 shrink-0">
      {/* Active Tool Identifier */}
      <div className="flex items-center space-x-1.5 text-neutral-400 font-medium text-[11px] pr-2 border-r border-white/[0.08]">
        {activeTool === 'hand' && <Hand size={12} className="text-white" />}
        {activeTool === 'zoom' && <ZoomIn size={12} className="text-white" />}
        <span className="uppercase tracking-wider font-semibold text-neutral-200">
          {activeTool === 'hand' ? 'Hand Tool (H)' : 'Zoom Tool (Z)'}
        </span>
      </div>

      {/* Tool-specific contextual helpers */}
      {activeTool === 'zoom' && (
        <div className="flex items-center space-x-2 text-[11px]">
          {/* Zoom In / Out Mode Buttons */}
          <div className="flex items-center bg-[#101014] rounded border border-white/[0.08] p-0.5 space-x-0.5">
            <button
              onClick={() => onSetZoomMode('in')}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                zoomMode === 'in' ? 'bg-[#27272f] text-white shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
              title="Zoom In Mode"
            >
              <Plus size={11} />
              <span>Zoom In</span>
            </button>
            <button
              onClick={() => onSetZoomMode('out')}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                zoomMode === 'out' ? 'bg-[#27272f] text-white shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
              title="Zoom Out Mode"
            >
              <Minus size={11} />
              <span>Zoom Out</span>
            </button>
          </div>

          <div className="h-3 w-[1px] bg-white/[0.08] mx-1" />

          {/* Preset Buttons */}
          <button
            onClick={onFitToScreen}
            className="px-2 py-0.5 rounded bg-[#101014] border border-white/[0.08] text-[11px] text-neutral-300 hover:text-white hover:border-white/20 transition-all"
            title="Fit Entire Artwork to Screen (Ctrl+0)"
          >
            Fit on Screen
          </button>
          <button
            onClick={onResetZoom}
            className="px-2 py-0.5 rounded bg-[#101014] border border-white/[0.08] text-[11px] text-neutral-300 hover:text-white hover:border-white/20 transition-all"
            title="Actual Size 100% (Ctrl+1)"
          >
            100% Size
          </button>

          {/* Direct Percentage Buttons */}
          <div className="flex items-center space-x-1 text-[10px] font-mono text-neutral-400">
            {[0.25, 0.5, 1.0, 2.0].map((z) => (
              <button
                key={z}
                onClick={() => onZoomChange(z)}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  Math.abs(zoom - z) < 0.05
                    ? 'bg-white/20 border-white/30 text-white font-bold'
                    : 'bg-[#101014] border-white/[0.06] text-neutral-400 hover:text-white'
                }`}
              >
                {Math.round(z * 100)}%
              </button>
            ))}
          </div>

          <span className="text-neutral-500 font-mono pl-2">
            (Wheel: Zoom • Click: Step)
          </span>
        </div>
      )}

      {activeTool === 'hand' && (
        <div className="flex items-center space-x-3 text-[11px] text-neutral-400">
          <span>Click and drag anywhere on viewport to pan camera</span>
          <span className="text-neutral-600">•</span>
          <span className="text-neutral-300 font-medium">Tip: You can hold Space from any screen to pan instantly</span>
        </div>
      )}
    </div>
  );
};
