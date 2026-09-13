import React, { useState, useEffect } from 'react';
import { EmbroiderySettings, HistoryStep } from '../../types';
import { THREAD_PALETTES } from '../../engine/colorPalettes';
import { PresetPicker } from './PresetPicker';
import { StitchControls } from './StitchControls';
import { ThreadStudioControls } from './ThreadStudioControls';
import { BorderControls } from './BorderControls';
import { LightingControls } from './LightingControls';
import { ColorControls } from './ColorControls';
import { FABRIC_SUBSTRATE_DEFINITIONS } from '../../engine/fabricSubstrateEngine';
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
  Wand2,
  Layers,
  Save,
  Check,
  ChevronUp
} from 'lucide-react';
import { flushPendingSave } from '../../engine/settingsStorage';

interface DockPanelProps {
  settings: EmbroiderySettings;
  onUpdateSettings: (updated: Partial<EmbroiderySettings>) => void;
  isRendering: boolean;
  history: HistoryStep[];
  currentHistoryIndex: number;
  onRevertHistory: (index: number) => void;
  onTriggerSmartOptimize?: () => void;
  onSaveSettingsAsDefault?: (target?: 'all' | 'embroidery' | 'mockup') => void;
  onResetSettingsToDefault?: () => void;
  saveStatusText?: string;
}

type DockTab = 'parameters' | 'presets' | 'threads' | 'history';
type AccordionSection = 'stitch' | 'border' | 'fabric' | 'lighting' | 'color';

export const DockPanel: React.FC<DockPanelProps> = React.memo(({
  settings,
  onUpdateSettings,
  isRendering,
  history,
  currentHistoryIndex,
  onRevertHistory,
  onTriggerSmartOptimize,
  onSaveSettingsAsDefault,
  onResetSettingsToDefault,
  saveStatusText
}) => {
  const [activeTab, setActiveTab] = useState<DockTab>('parameters');
  const [threadSearch, setThreadSearch] = useState('');
  const [selectedPaletteId, setSelectedPaletteId] = useState('madeira_classic');
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);

  const [openSections, setOpenSections] = useState<Record<AccordionSection, boolean>>({
    stitch: true,
    border: true,
    fabric: true,
    lighting: true,
    color: false
  });

  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const onSaved = () => {
      setJustSaved(true);
      const timer = setTimeout(() => setJustSaved(false), 2200);
      return () => clearTimeout(timer);
    };
    window.addEventListener('embroidery-settings-saved', onSaved);
    return () => window.removeEventListener('embroidery-settings-saved', onSaved);
  }, []);

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
          {/* Stitch Construction (Primary Selector) */}
          <div className="p-3 bg-[#15151c]/60">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-200">
                  Stitch Construction
                </div>
                <div className="text-[9px] text-neutral-500 mt-0.5">
                  Choose how stitches are calculated
                </div>
              </div>
              {settings.stitchPlanningMode === 'thread-studio' && (
                <span className="text-[8px] font-bold uppercase tracking-wider text-amber-400 border border-amber-400/30 bg-amber-400/10 rounded px-1.5 py-0.5">
                  Studio Default
                </span>
              )}
              {settings.stitchPlanningMode === 'object-aware' && (
                <span className="text-[8px] font-bold uppercase tracking-wider text-cyan-300 border border-cyan-300/25 bg-cyan-300/10 rounded px-1.5 py-0.5">
                  Beta
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onUpdateSettings({ stitchPlanningMode: 'thread-studio' })}
                className={`rounded-lg border px-2 py-2 text-left transition-all ${
                  settings.stitchPlanningMode === 'thread-studio'
                    ? 'border-amber-400/60 bg-amber-400/15 text-white shadow-sm ring-1 ring-amber-400/30'
                    : 'border-white/10 bg-[#1b1b22] text-neutral-400 hover:border-white/25 hover:text-neutral-200'
                }`}
              >
                <div className={`text-[9px] font-bold ${settings.stitchPlanningMode === 'thread-studio' ? 'text-amber-300' : ''}`}>
                  Thread Studio
                </div>
                <div className="text-[7.5px] text-neutral-500 mt-0.5 leading-tight">
                  Clean 3-ply gradient
                </div>
              </button>
              <button
                onClick={() => onUpdateSettings({ stitchPlanningMode: 'object-aware' })}
                className={`rounded-lg border px-2 py-2 text-left transition-all ${
                  settings.stitchPlanningMode === 'object-aware'
                    ? 'border-cyan-300/60 bg-cyan-300/15 text-white shadow-sm ring-1 ring-cyan-300/30'
                    : 'border-white/10 bg-[#1b1b22] text-neutral-400 hover:border-white/25 hover:text-neutral-200'
                }`}
              >
                <div className={`text-[9px] font-bold ${settings.stitchPlanningMode === 'object-aware' ? 'text-cyan-300' : ''}`}>
                  AI Object
                </div>
                <div className="text-[7.5px] text-neutral-500 mt-0.5 leading-tight">
                  MobileSAM flow
                </div>
              </button>
              <button
                onClick={() => onUpdateSettings({ stitchPlanningMode: 'surface' })}
                className={`rounded-lg border px-2 py-2 text-left transition-all ${
                  settings.stitchPlanningMode === 'surface'
                    ? 'border-white/30 bg-[#292931] text-white shadow-sm ring-1 ring-white/20'
                    : 'border-white/10 bg-[#1b1b22] text-neutral-400 hover:border-white/25 hover:text-neutral-200'
                }`}
              >
                <div className="text-[9px] font-bold">Surface</div>
                <div className="text-[7.5px] text-neutral-500 mt-0.5 leading-tight">
                  Classic shader
                </div>
              </button>
            </div>

            {/* Rendering Engine Style (Only for Surface & Object-Aware modes) */}
            {settings.stitchPlanningMode !== 'thread-studio' && (
              <div className="mt-3 pt-3 border-t border-white/[0.08]">
                <div className="mb-2">
                  <div className="text-[10px] font-semibold text-neutral-300">
                    Rendering Style
                  </div>
                  <div className="text-[8px] text-neutral-500 mt-0.5">
                    Choose the thread character for preview, mockup, and export
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onUpdateSettings({ renderStyle: 'classic' })}
                    className={`rounded-lg border px-2.5 py-2 text-left transition-all ${
                      settings.renderStyle === 'classic'
                        ? 'border-white/35 bg-white text-neutral-950 shadow-sm'
                        : 'border-white/10 bg-[#1b1b22] text-neutral-300 hover:border-white/25'
                    }`}
                  >
                    <div className="text-[10px] font-bold">Classic Stitch</div>
                    <div className={`text-[8px] mt-0.5 ${settings.renderStyle === 'classic' ? 'text-neutral-600' : 'text-neutral-500'}`}>
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
              </div>
            )}
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
                  {settings.stitchPlanningMode === 'thread-studio' ? 'Thread Studio Controls' : 'Stitch Architecture'}
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
                {settings.stitchPlanningMode === 'thread-studio' ? (
                  <ThreadStudioControls settings={settings} onChange={onUpdateSettings} />
                ) : (
                  <StitchControls settings={settings} onChange={onUpdateSettings} />
                )}
              </div>
            )}
          </div>

          {/* Border & Perimeter (Only for Surface & Object-Aware modes) */}
          {settings.stitchPlanningMode !== 'thread-studio' && (
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
          )}

          {/* Fabric Substrate & Backing */}
          <div className="p-3">
            <button
              onClick={() => toggleSection('fabric')}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center space-x-2">
                <Layers size={12} className="text-neutral-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-200">
                  Fabric Substrate & Backing
                </span>
              </div>
              {openSections.fabric ? (
                <ChevronDown size={13} className="text-neutral-500" />
              ) : (
                <ChevronRight size={13} className="text-neutral-500" />
              )}
            </button>
            {openSections.fabric && (
              <div className="mt-2.5 space-y-2">
                <div className="text-[9px] text-neutral-400">
                  Stitch directly on physical materials with authentic needle punctures & contact shadows.
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {FABRIC_SUBSTRATE_DEFINITIONS.map((fab) => {
                    const isSelected = (settings.fabricSubstrate || 'none') === fab.id;
                    return (
                      <button
                        key={fab.id}
                        onClick={() => onUpdateSettings({ fabricSubstrate: fab.id })}
                        className={`p-2 rounded-lg border text-left transition-all flex items-center space-x-2 ${
                          isSelected
                            ? 'bg-[#22222a] border-white/35 text-white shadow-md'
                            : 'bg-[#141418] border-white/[0.06] text-neutral-400 hover:text-neutral-200 hover:border-white/15'
                        }`}
                      >
                        <div
                          className="w-5 h-5 rounded border border-white/20 shrink-0 shadow-inner"
                          style={{ backgroundColor: fab.thumbnailColor }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-semibold truncate tracking-tight">
                            {fab.name}
                          </div>
                          <div className="text-[8px] text-neutral-500 uppercase font-mono">
                            {fab.category}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3D Depth & Lighting (Only for Surface & Object-Aware modes) */}
          {settings.stitchPlanningMode !== 'thread-studio' && (
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
          )}

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

      {/* Bottom Save Settings as Default Bar */}
      <div className="h-9 bg-[#15151c] border-t border-white/[0.08] px-3 flex items-center justify-between text-[10px] text-neutral-400 shrink-0">
        <span className="text-[10px] text-neutral-400">
          {saveStatusText || 'Custom defaults'}
        </span>
        <div className="flex items-center space-x-1.5">
          {onResetSettingsToDefault && (
            <button
              onClick={onResetSettingsToDefault}
              className="px-2 py-0.5 rounded bg-[#1c1c24] border border-white/10 hover:border-white/20 text-neutral-400 hover:text-neutral-200 text-[10px] transition-all cursor-pointer"
              title="Reset parameters back to factory defaults (Alt+R)"
            >
              Reset
            </button>
          )}
          {onSaveSettingsAsDefault && (
            <div className="relative inline-flex items-center rounded bg-[#1f1f28] border border-emerald-500/30 hover:border-emerald-500/60 transition-all shadow-sm">
              <button
                onClick={() => onSaveSettingsAsDefault('all')}
                className="px-2 py-1 text-emerald-300 hover:text-emerald-200 text-[10px] font-medium transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Save all parameters and garment placement as default (Ctrl+S)"
              >
                <Save size={11} className="text-emerald-400" />
                <span>Save as Default</span>
              </button>
              <button
                onClick={() => setIsSaveMenuOpen((prev) => !prev)}
                className="px-1.5 py-1 text-emerald-400/80 hover:text-emerald-300 border-l border-emerald-500/30 hover:bg-emerald-500/15 transition-all cursor-pointer flex items-center justify-center"
                title="Save options: All, Embroidery Engine, or Mockup Placement"
              >
                <ChevronUp size={11} className={`transition-transform duration-150 ${isSaveMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSaveMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSaveMenuOpen(false)}
                  />
                  <div className="absolute bottom-full right-0 mb-1.5 w-60 rounded-lg bg-[#181820] border border-white/15 shadow-2xl py-1 z-50 text-[11px] text-neutral-200 backdrop-blur-md">
                    <div className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-neutral-400 border-b border-white/[0.08]">
                      Save Default Options
                    </div>
                    <button
                      onClick={() => {
                        setIsSaveMenuOpen(false);
                        onSaveSettingsAsDefault('all');
                      }}
                      className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-emerald-500/15 hover:text-emerald-300 transition-colors group cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-[11px] text-emerald-300">Save All as Default</span>
                        <span className="text-[9px] text-neutral-400">Embroidery engine + garment placement</span>
                      </div>
                      <span className="text-[9px] text-neutral-500 font-mono">Ctrl+S</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsSaveMenuOpen(false);
                        onSaveSettingsAsDefault('embroidery');
                      }}
                      className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-white/[0.08] hover:text-neutral-100 transition-colors group cursor-pointer border-t border-white/[0.05]"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-[11px]">Save Embroidery Engine Only</span>
                        <span className="text-[9px] text-neutral-400">Stitch density, angles, pull comp & lighting</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setIsSaveMenuOpen(false);
                        onSaveSettingsAsDefault('mockup');
                      }}
                      className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-white/[0.08] hover:text-neutral-100 transition-colors group cursor-pointer border-t border-white/[0.05]"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-[11px]">Save Mockup Placement Only</span>
                        <span className="text-[9px] text-neutral-400">Garment coordinates, wrap & fabric grain</span>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
