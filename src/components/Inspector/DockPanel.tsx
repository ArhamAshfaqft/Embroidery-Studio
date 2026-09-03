import React, { useState } from 'react';
import { EmbroiderySettings, HistoryStep } from '../../types';
import { THREAD_PALETTES } from '../../engine/colorPalettes';
import { PresetPicker } from './PresetPicker';
import { StitchControls } from './StitchControls';
import { BorderControls } from './BorderControls';
import { LightingControls } from './LightingControls';
import { ColorControls } from './ColorControls';
import {
  Sliders,
  Sparkles,
  Palette,
  History,
  Shield,
  Sun,
  ChevronDown,
  ChevronRight,
  Search,
  Wand2
} from 'lucide-react';

interface DockPanelProps {
  settings: EmbroiderySettings;
  onUpdateSettings: (updated: Partial<EmbroiderySettings>) => void;
  isRendering: boolean;
  history: HistoryStep[];
  currentHistoryIndex: number;
  onRevertHistory: (index: number) => void;
  onTriggerSmartOptimize?: () => void;
}

type DockTab = 'parameters' | 'presets' | 'threads' | 'history';
type AccordionSection = 'stitch' | 'border' | 'lighting' | 'color';

export const DockPanel: React.FC<DockPanelProps> = React.memo(({
  settings,
  onUpdateSettings,
  isRendering,
  history,
  currentHistoryIndex,
  onRevertHistory,
  onTriggerSmartOptimize
}) => {
  const [activeTab, setActiveTab] = useState<DockTab>('parameters');
  const [threadSearch, setThreadSearch] = useState('');
  const [selectedPaletteId, setSelectedPaletteId] = useState('madeira_classic');

  const [openSections, setOpenSections] = useState<Record<AccordionSection, boolean>>({
    stitch: true,
    border: true,
    lighting: true,
    color: false
  });

  const toggleSection = (section: AccordionSection) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const activePalette = THREAD_PALETTES.find((p) => p.id === selectedPaletteId) || THREAD_PALETTES[0];
  const filteredThreads = activePalette.colors.filter(
    (c) =>
      c.name.toLowerCase().includes(threadSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(threadSearch.toLowerCase()) ||
      c.category.toLowerCase().includes(threadSearch.toLowerCase())
  );

  return (
    <div className="w-86 border-l border-white/[0.08] flex flex-col bg-[#111115] shrink-0 select-none">
      {/* Adobe Panel Tabs Strip */}
      <div className="flex items-center bg-[#16161b] border-b border-white/[0.08] px-1 py-1 text-xs">
        <button
          onClick={() => setActiveTab('parameters')}
          className={`flex-1 py-1 px-1.5 rounded text-center font-medium text-[11px] transition-all ${
            activeTab === 'parameters'
              ? 'bg-[#27272f] text-white shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Parameters
        </button>
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-1 px-1.5 rounded text-center font-medium text-[11px] transition-all ${
            activeTab === 'presets'
              ? 'bg-[#27272f] text-white shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Presets
        </button>
        <button
          onClick={() => setActiveTab('threads')}
          className={`flex-1 py-1 px-1.5 rounded text-center font-medium text-[11px] transition-all ${
            activeTab === 'threads'
              ? 'bg-[#27272f] text-white shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Threads
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-1 px-1.5 rounded text-center font-medium text-[11px] transition-all ${
            activeTab === 'history'
              ? 'bg-[#27272f] text-white shadow-sm font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          History
        </button>
      </div>

      {/* Tab 1: Parameters */}
      {activeTab === 'parameters' && (
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
          {/* Rendering Engine Style */}
          <div className="p-3 bg-[#15151c]/60">
            <div className="mb-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-200">
                Rendering Style
              </div>
              <div className="text-[9px] text-neutral-500 mt-0.5">
                Choose the thread character for preview, mockup, and export
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ renderStyle: 'classic' })}
                className={`rounded-lg border px-2.5 py-2 text-left transition-all ${
                  settings.renderStyle !== 'natural'
                    ? 'border-white/35 bg-white text-neutral-950 shadow-sm'
                    : 'border-white/10 bg-[#1b1b22] text-neutral-300 hover:border-white/25'
                }`}
              >
                <div className="text-[10px] font-bold">Classic Stitch</div>
                <div className={`text-[8px] mt-0.5 ${settings.renderStyle !== 'natural' ? 'text-neutral-600' : 'text-neutral-500'}`}>
                  Clean, defined threads
                </div>
              </button>
              <button
                onClick={() => onUpdateSettings({ renderStyle: 'natural' })}
                className={`rounded-lg border px-2.5 py-2 text-left transition-all ${
                  settings.renderStyle === 'natural'
                    ? 'border-emerald-300/60 bg-emerald-300 text-emerald-950 shadow-sm'
                    : 'border-white/10 bg-[#1b1b22] text-neutral-300 hover:border-white/25'
                }`}
              >
                <div className="text-[10px] font-bold">Natural Thread</div>
                <div className={`text-[8px] mt-0.5 ${settings.renderStyle === 'natural' ? 'text-emerald-900/70' : 'text-neutral-500'}`}>
                  Organic, fibrous texture
                </div>
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[10px] font-semibold text-neutral-300">Stitch Construction</div>
                  <div className="text-[8px] text-neutral-500 mt-0.5">Choose how stitches are calculated</div>
                </div>
                {settings.stitchPlanningMode === 'object-aware' && (
                  <span className="text-[8px] font-bold uppercase tracking-wider text-cyan-300 border border-cyan-300/25 bg-cyan-300/10 rounded px-1.5 py-0.5">
                    Beta
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdateSettings({ stitchPlanningMode: 'surface' })}
                  className={`rounded-lg border px-2.5 py-2 text-left transition-all ${
                    settings.stitchPlanningMode !== 'object-aware'
                      ? 'border-white/30 bg-[#292931] text-white'
                      : 'border-white/10 bg-[#1b1b22] text-neutral-400 hover:border-white/25'
                  }`}
                >
                  <div className="text-[9px] font-bold">Surface Engine</div>
                  <div className="text-[8px] text-neutral-500 mt-0.5">Original proven result</div>
                </button>
                <button
                  onClick={() => onUpdateSettings({ stitchPlanningMode: 'object-aware' })}
                  className={`rounded-lg border px-2.5 py-2 text-left transition-all ${
                    settings.stitchPlanningMode === 'object-aware'
                      ? 'border-cyan-300/60 bg-cyan-300 text-cyan-950'
                      : 'border-white/10 bg-[#1b1b22] text-neutral-400 hover:border-white/25'
                  }`}
                >
                  <div className="text-[9px] font-bold">AI Object-Aware</div>
                  <div className={`text-[8px] mt-0.5 ${settings.stitchPlanningMode === 'object-aware' ? 'text-cyan-900/70' : 'text-neutral-500'}`}>
                    Local MobileSAM • automatic
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Smart Auto-Tune Trigger Banner */}
          {onTriggerSmartOptimize && (
            <div className="p-3 bg-[#15151c]/60">
              <button
                onClick={onTriggerSmartOptimize}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-[#1f1f2a] to-[#171720] border border-white/15 hover:border-white/30 text-white transition-all shadow-sm group"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-white text-neutral-950 flex items-center justify-center shadow">
                    <Wand2 size={12} className="group-hover:rotate-12 transition-transform" />
                  </div>
                  <div className="text-left">
                    <div className="text-[11px] font-bold tracking-tight">Smart Auto-Optimize</div>
                    <div className="text-[9px] text-neutral-400 font-mono">Calculate ideal stitch & depth</div>
                  </div>
                </div>
                <Sparkles size={12} className="text-neutral-400 group-hover:text-white transition-colors" />
              </button>
            </div>
          )}

          {/* Stitch Architecture */}
          <div className="p-3">
            <button
              onClick={() => toggleSection('stitch')}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center space-x-2">
                <Sliders size={12} className="text-neutral-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-200">
                  Stitch Architecture
                </span>
              </div>
              {openSections.stitch ? (
                <ChevronDown size={13} className="text-neutral-500" />
              ) : (
                <ChevronRight size={13} className="text-neutral-500" />
              )}
            </button>
            {openSections.stitch && (
              <div className="mt-2">
                <StitchControls settings={settings} onChange={onUpdateSettings} />
              </div>
            )}
          </div>

          {/* Border & Perimeter */}
          <div className="p-3">
            <button
              onClick={() => toggleSection('border')}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center space-x-2">
                <Shield size={12} className="text-neutral-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-200">
                  Border & Outline
                </span>
              </div>
              {openSections.border ? (
                <ChevronDown size={13} className="text-neutral-500" />
              ) : (
                <ChevronRight size={13} className="text-neutral-500" />
              )}
            </button>
            {openSections.border && (
              <div className="mt-2">
                <BorderControls settings={settings} onChange={onUpdateSettings} />
              </div>
            )}
          </div>

          {/* 3D Depth & Lighting */}
          <div className="p-3">
            <button
              onClick={() => toggleSection('lighting')}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center space-x-2">
                <Sun size={12} className="text-neutral-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-200">
                  3D Depth & Lighting
                </span>
              </div>
              {openSections.lighting ? (
                <ChevronDown size={13} className="text-neutral-500" />
              ) : (
                <ChevronRight size={13} className="text-neutral-500" />
              )}
            </button>
            {openSections.lighting && (
              <div className="mt-2">
                <LightingControls settings={settings} onChange={onUpdateSettings} />
              </div>
            )}
          </div>

          {/* Color & Thread Mode */}
          <div className="p-3">
            <button
              onClick={() => toggleSection('color')}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center space-x-2">
                <Palette size={12} className="text-neutral-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-200">
                  Color & Palette
                </span>
              </div>
              {openSections.color ? (
                <ChevronDown size={13} className="text-neutral-500" />
              ) : (
                <ChevronRight size={13} className="text-neutral-500" />
              )}
            </button>
            {openSections.color && (
              <div className="mt-2">
                <ColorControls settings={settings} onChange={onUpdateSettings} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Presets */}
      {activeTab === 'presets' && (
        <div className="flex-1 overflow-y-auto p-3">
          <PresetPicker
            currentPresetId={settings.presetId}
            onSelectPreset={(presetSettings) => onUpdateSettings(presetSettings)}
          />
        </div>
      )}

      {/* Tab 3: Thread Catalog */}
      {activeTab === 'threads' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <select
            value={selectedPaletteId}
            onChange={(e) => setSelectedPaletteId(e.target.value)}
            className="w-full bg-[#16161c] border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-400"
          >
            {THREAD_PALETTES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              placeholder="Search thread name or #code..."
              className="w-full bg-[#16161c] border border-white/[0.08] rounded-md pl-7 pr-2.5 py-1.5 text-[11px] font-mono text-neutral-200 focus:outline-none focus:border-neutral-400"
            />
          </div>

          <div className="space-y-1">
            {filteredThreads.map((thread) => {
              const isSelected = settings.monochromeColor.toLowerCase() === thread.hex.toLowerCase();
              return (
                <button
                  key={thread.code}
                  onClick={() =>
                    onUpdateSettings({
                      colorMode: 'monochrome',
                      monochromeColor: thread.hex
                    })
                  }
                  className={`w-full flex items-center justify-between p-1.5 rounded-md text-left transition-all ${
                    isSelected
                      ? 'bg-[#27272f] border border-white/20 text-white'
                      : 'hover:bg-white/[0.04] text-neutral-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded-full border border-neutral-700 shadow-sm shrink-0"
                      style={{ backgroundColor: thread.hex }}
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium truncate">{thread.name}</div>
                      <div className="text-[9px] font-mono text-neutral-500">#{thread.code}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">{thread.hex}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: History Stack */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 px-2 py-1">
            Undo / Redo History
          </div>
          {history.map((step, idx) => {
            const isCurrent = idx === currentHistoryIndex;
            return (
              <button
                key={`${step.timestamp}-${idx}`}
                onClick={() => onRevertHistory(idx)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-all text-[11px] ${
                  isCurrent
                    ? 'bg-[#27272f] text-white font-semibold shadow-sm'
                    : idx < currentHistoryIndex
                    ? 'text-neutral-300 hover:bg-white/[0.04]'
                    : 'text-neutral-600 hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <History size={11} className={isCurrent ? 'text-white' : 'text-neutral-500'} />
                  <span className="truncate">{step.description}</span>
                </div>
                <span className="text-[9px] font-mono text-neutral-500">Step {idx + 1}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
