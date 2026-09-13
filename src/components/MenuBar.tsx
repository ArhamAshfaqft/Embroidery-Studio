import React, { useState, useRef, useEffect } from 'react';
import { AppScreen, MockupTemplate, FabricSubstrateType } from '../types';
import { FABRIC_SUBSTRATE_DEFINITIONS } from '../engine/fabricSubstrateEngine';
import {
  FileCode,
  FolderOpen,
  Save,
  Download,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Columns,
  Grid,
  Sparkles,
  Shirt,
  Info,
  Sliders,
  Check,
  Key
} from 'lucide-react';

interface MenuBarProps {
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  onNewProject: () => void;
  onOpenImport: () => void;
  onOpenExport: (mode?: 'standalone' | 'mockup') => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onResetSettings: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  showComparison: boolean;
  onToggleComparison: () => void;
  showCheckerboard: boolean;
  onToggleCheckerboard: () => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  onApplyPreset: (presetId: string) => void;
  onSelectMockupCategory: (category: 'shirt' | 'sweatshirt' | 'hat' | string) => void;
  hasSourceAsset: boolean;
  activeMockupCategory?: string;
  activeMockupId?: string;
  mockupTemplates?: MockupTemplate[];
  onSelectMockup?: (template: MockupTemplate) => void;
  activePresetId?: string;
  activeFabricSubstrate?: string;
  onSelectFabricSubstrate?: (fabric: FabricSubstrateType) => void;
  onOpenLicenseModal?: () => void;
  onOpenAboutModal?: () => void;
  onSaveSettingsAsDefault?: () => void;
  saveStatusText?: string;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  activeScreen,
  onNavigate,
  onNewProject,
  onOpenImport,
  onOpenExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onResetSettings,
  zoom,
  onZoomChange,
  onResetZoom,
  onFitToScreen,
  showComparison,
  onToggleComparison,
  showCheckerboard,
  onToggleCheckerboard,
  showRulers,
  onToggleRulers,
  onApplyPreset,
  onSelectMockupCategory,
  hasSourceAsset,
  activeMockupCategory,
  activeMockupId,
  mockupTemplates,
  onSelectMockup,
  activePresetId,
  activeFabricSubstrate,
  onSelectFabricSubstrate,
  onOpenLicenseModal,
  onOpenAboutModal,
  onSaveSettingsAsDefault,
  saveStatusText
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleMenuHover = (menuName: string) => {
    if (activeMenu !== null) {
      setActiveMenu(menuName);
    }
  };

  const closeMenu = () => setActiveMenu(null);

  return (
    <div
      ref={menuBarRef}
      className="h-7 bg-[#16161a] border-b border-white/[0.07] px-2 flex items-center justify-between text-xs select-none text-neutral-300 font-sans z-40 shrink-0"
    >
      {/* Left Application Menu Items */}
      <div className="flex items-center space-x-1">
        {/* App Logo Emblem */}
        <div className="flex items-center pl-1 pr-1.5 py-0.5">
          <img
            src="/EV-logo.png"
            alt="Embroidery Visualizer"
            className="w-4 h-4 rounded-[4px] object-cover shadow-sm select-none pointer-events-none"
          />
        </div>

        {/* 1. File Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('file')}
            onMouseEnter={() => handleMenuHover('file')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeMenu === 'file' ? 'bg-[#27272f] text-white' : 'hover:bg-white/[0.06] text-neutral-300'
            }`}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div className="absolute top-full left-0 mt-0.5 w-60 bg-[#18181e] border border-white/[0.12] rounded-lg shadow-2xl py-1 text-neutral-200 z-50 text-[11px]">
              <button
                onClick={() => {
                  onNewProject();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>New Project / Source</span>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl+N</span>
              </button>
              <button
                onClick={() => {
                  onOpenImport();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Open / Import Artwork...</span>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl+O</span>
              </button>
              <div className="h-[1px] bg-white/[0.08] my-1" />
              <button
                disabled={!hasSourceAsset}
                onClick={() => {
                  if (!hasSourceAsset) return;
                  onOpenExport('standalone');
                  closeMenu();
                }}
                className={`w-full px-3 py-1.5 text-left flex items-center justify-between ${
                  hasSourceAsset ? 'hover:bg-[#27272f] hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed text-neutral-600'
                }`}
                title={hasSourceAsset ? 'Export transparent 3D embroidery graphic' : 'Open artwork to enable export'}
              >
                <span>Export Standalone Graphic...</span>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl+E</span>
              </button>
              <button
                disabled={!hasSourceAsset}
                onClick={() => {
                  if (!hasSourceAsset) return;
                  onOpenExport('mockup');
                  closeMenu();
                }}
                className={`w-full px-3 py-1.5 text-left flex items-center justify-between ${
                  hasSourceAsset ? 'hover:bg-[#27272f] hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed text-neutral-600'
                }`}
                title={hasSourceAsset ? 'Export finished apparel product mockup' : 'Open artwork to enable export'}
              >
                <span>Export Apparel Mockup...</span>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl+Shift+E</span>
              </button>
              <div className="h-[1px] bg-white/[0.08] my-1" />
              <button
                onClick={() => {
                  onSaveSettingsAsDefault?.();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
                title="Save current parameters and apparel placement as default for future sessions"
              >
                <div className="flex items-center space-x-1.5">
                  <Save size={12} className="text-emerald-400 shrink-0" />
                  <span>Save Settings as Default</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl+S</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Edit Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('edit')}
            onMouseEnter={() => handleMenuHover('edit')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeMenu === 'edit' ? 'bg-[#27272f] text-white' : 'hover:bg-white/[0.06] text-neutral-300'
            }`}
          >
            Edit
          </button>
          {activeMenu === 'edit' && (
            <div className="absolute top-full left-0 mt-0.5 w-56 bg-[#18181e] border border-white/[0.12] rounded-lg shadow-2xl py-1 text-neutral-200 z-50 text-[11px]">
              <button
                disabled={!canUndo}
                onClick={() => {
                  onUndo();
                  closeMenu();
                }}
                className={`w-full px-3 py-1.5 text-left flex items-center justify-between ${
                  canUndo ? 'hover:bg-[#27272f] hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed text-neutral-600'
                }`}
              >
                <span>Undo Parameter Change</span>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl+Z</span>
              </button>
              <button
                disabled={!canRedo}
                onClick={() => {
                  onRedo();
                  closeMenu();
                }}
                className={`w-full px-3 py-1.5 text-left flex items-center justify-between ${
                  canRedo ? 'hover:bg-[#27272f] hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed text-neutral-600'
                }`}
              >
                <span>Redo</span>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl+Shift+Z</span>
              </button>
              <div className="h-[1px] bg-white/[0.08] my-1" />
              <button
                onClick={() => {
                  onResetSettings();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Reset Settings to Default</span>
                <span className="text-[10px] font-mono text-neutral-500">Alt+R</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. View Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('view')}
            onMouseEnter={() => handleMenuHover('view')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeMenu === 'view' ? 'bg-[#27272f] text-white' : 'hover:bg-white/[0.06] text-neutral-300'
            }`}
          >
            View
          </button>
          {activeMenu === 'view' && (
            <div className="absolute top-full left-0 mt-0.5 w-60 bg-[#18181e] border border-white/[0.12] rounded-lg shadow-2xl py-1 text-neutral-200 z-50 text-[11px]">
              <button
                onClick={() => {
                  onZoomChange(Math.min(5.0, parseFloat((zoom * 1.25).toFixed(2))));
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Zoom In</span>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl++</span>
              </button>
              <button
                onClick={() => {
                  onZoomChange(Math.max(0.05, parseFloat((zoom * 0.8).toFixed(2))));
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Zoom Out</span>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl+-</span>
              </button>
              <button
                onClick={() => {
                  onFitToScreen();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Fit on Screen</span>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl+0</span>
              </button>
              <button
                onClick={() => {
                  onResetZoom();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Actual Size (100%)</span>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl+1</span>
              </button>
              <div className="h-[1px] bg-white/[0.08] my-1" />
              <button
                onClick={() => {
                  if (activeScreen !== 'embroidery' && hasSourceAsset) {
                    onNavigate('embroidery');
                  }
                  onToggleComparison();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Split Comparison View</span>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-neutral-500">Tab</span>
                  {showComparison && <Check size={12} className="text-white" />}
                </div>
              </button>
              <button
                onClick={() => {
                  onToggleCheckerboard();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Transparency Grid</span>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-neutral-500">Ctrl+G</span>
                  {showCheckerboard && <Check size={12} className="text-white" />}
                </div>
              </button>
              <button
                onClick={() => {
                  onToggleRulers();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Studio Pixel Rulers</span>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-neutral-500">Ctrl+R</span>
                  {showRulers && <Check size={12} className="text-white" />}
                </div>
              </button>
              <div className="h-[1px] bg-white/[0.08] my-1" />
              <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                Fabric Substrate
              </div>
              {FABRIC_SUBSTRATE_DEFINITIONS.map((fab) => {
                const isSelected = (activeFabricSubstrate || 'none') === fab.id;
                return (
                  <button
                    key={fab.id}
                    onClick={() => {
                      if (onSelectFabricSubstrate) onSelectFabricSubstrate(fab.id);
                      closeMenu();
                    }}
                    className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
                  >
                    <span className="truncate pr-2">{fab.name}</span>
                    {isSelected && <Check size={12} className="text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Stitch Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('stitch')}
            onMouseEnter={() => handleMenuHover('stitch')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeMenu === 'stitch' ? 'bg-[#27272f] text-white' : 'hover:bg-white/[0.06] text-neutral-300'
            }`}
          >
            Stitch
          </button>
          {activeMenu === 'stitch' && (
            <div className="absolute top-full left-0 mt-0.5 w-68 bg-[#18181e] border border-white/[0.12] rounded-lg shadow-2xl py-1 text-neutral-200 z-50 text-[11px] max-h-[360px] overflow-y-auto">
              {[
                { id: 'tatami_standard', label: 'Standard Tatami Weave' },
                { id: 'satin_crest', label: 'Heavy Satin Crest' },
                { id: 'puff_cap_3d', label: '3D Puff Cap Relief' },
                { id: 'gold_metallic', label: 'Metallic Gold Foil Thread' },
                { id: 'heavy_merrowed', label: 'Military Merrowed Border Patch' },
                { id: 'leather_biker_badge', label: 'Black Leather Biker Badge' },
                { id: 'denim_vintage_jacket', label: 'Vintage Indigo Denim' },
                { id: 'sweatshirt_fleece_holiday', label: 'Olive Sweatshirt Fleece' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onApplyPreset(p.id);
                    if (activeScreen === 'create' && hasSourceAsset) {
                      onNavigate('embroidery');
                    }
                    closeMenu();
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
                >
                  <span className="truncate pr-2">{p.label}</span>
                  {activePresetId === p.id && <Check size={12} className="text-white shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 5. Mockup Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('mockup')}
            onMouseEnter={() => handleMenuHover('mockup')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeMenu === 'mockup' ? 'bg-[#27272f] text-white' : 'hover:bg-white/[0.06] text-neutral-300'
            }`}
          >
            Mockup
          </button>
          {activeMenu === 'mockup' && (
            <div className="absolute top-full left-0 mt-0.5 w-68 bg-[#18181e] border border-white/[0.12] rounded-lg shadow-2xl py-1 text-neutral-200 z-50 text-[11px] max-h-[360px] overflow-y-auto">
              {mockupTemplates && mockupTemplates.length > 0 ? (
                mockupTemplates.map((m) => {
                  const isSelected = activeMockupId ? activeMockupId === m.id : activeMockupCategory === m.category;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        if (onSelectMockup) {
                          onSelectMockup(m);
                        } else {
                          onSelectMockupCategory(m.category);
                        }
                        if (hasSourceAsset) {
                          onNavigate('mockup');
                        }
                        closeMenu();
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
                    >
                      <span className="truncate pr-2">{m.name}</span>
                      {isSelected && <Check size={12} className="text-white shrink-0" />}
                    </button>
                  );
                })
              ) : (
                [
                  { category: 'shirt' as const, label: 'Crewneck T-Shirt (Black)' },
                  { category: 'sweatshirt' as const, label: 'Heavyweight Hoodie (Heather Grey)' },
                  { category: 'hat' as const, label: 'Structured Snapback Cap (Navy)' }
                ].map((m) => (
                  <button
                    key={m.category}
                    onClick={() => {
                      onSelectMockupCategory(m.category);
                      if (hasSourceAsset) {
                        onNavigate('mockup');
                      }
                      closeMenu();
                    }}
                    className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
                  >
                    <span>{m.label}</span>
                    {activeMockupCategory === m.category && <Check size={12} className="text-white shrink-0" />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* 6. Help Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('help')}
            onMouseEnter={() => handleMenuHover('help')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeMenu === 'help' ? 'bg-[#27272f] text-white' : 'hover:bg-white/[0.06] text-neutral-300'
            }`}
          >
            Help
          </button>
          {activeMenu === 'help' && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-[#16161c] border border-white/10 rounded-lg shadow-2xl py-1 text-xs z-50 text-neutral-200">
              <button
                onClick={() => {
                  onOpenLicenseModal?.();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-[#27272f] hover:text-white transition-colors cursor-pointer"
              >
                <Key size={13} className="text-amber-400 shrink-0" />
                <span>License & 14-Day Free Trial...</span>
              </button>
              <div className="h-[1px] bg-white/[0.08] my-1" />
              <button
                onClick={() => {
                  onOpenAboutModal?.();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-[#27272f] hover:text-white transition-colors cursor-pointer"
              >
                <Info size={13} className="text-neutral-400 shrink-0" />
                <span>About Embroidery Studio</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right System Info & Settings Retain Status */}
      <div className="flex items-center space-x-3 text-[10px] font-mono text-neutral-400">
        {saveStatusText && (
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/35 text-emerald-300 font-medium">
            <Check size={11} className="text-emerald-400" />
            <span>{saveStatusText}</span>
          </div>
        )}
        <span className="text-neutral-700 hidden sm:inline">•</span>
        <span className="hidden sm:inline">sRGB PBR</span>
        <span className="text-neutral-700 hidden sm:inline">•</span>
        <span>GPU Acceleration</span>
      </div>
    </div>
  );
};

