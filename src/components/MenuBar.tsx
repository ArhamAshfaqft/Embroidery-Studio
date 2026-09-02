import React, { useState, useRef, useEffect } from 'react';
import { AppScreen } from '../types';
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
  Check
} from 'lucide-react';

interface MenuBarProps {
  activeScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  onOpenUpload: () => void;
  onOpenExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onResetSettings: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onResetZoom: () => void;
  showComparison: boolean;
  onToggleComparison: () => void;
  showCheckerboard: boolean;
  onToggleCheckerboard: () => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  onApplyPreset: (presetId: string) => void;
  onSelectMockupCategory: (category: 'shirt' | 'sweatshirt' | 'hat' | 'tote') => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  activeScreen,
  onNavigate,
  onOpenUpload,
  onOpenExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onResetSettings,
  zoom,
  onZoomChange,
  onResetZoom,
  showComparison,
  onToggleComparison,
  showCheckerboard,
  onToggleCheckerboard,
  showRulers,
  onToggleRulers,
  onApplyPreset,
  onSelectMockupCategory
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
      <div className="flex items-center space-x-0.5">
        {/* App Emblem */}
        <div className="flex items-center space-x-1.5 px-2 py-0.5 mr-1">
          <div className="w-3.5 h-3.5 rounded bg-white text-black font-bold flex items-center justify-center text-[9px] tracking-tighter shadow-sm">
            R
          </div>
          <span className="text-[11px] font-semibold tracking-wider text-neutral-100 uppercase">
            Raven
          </span>
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
            <div className="absolute top-full left-0 mt-0.5 w-56 bg-[#18181e] border border-white/[0.12] rounded-lg shadow-2xl py-1 text-neutral-200 z-50 text-[11px]">
              <button
                onClick={() => {
                  onNavigate('create');
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>New Project / Source</span>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl+N</span>
              </button>
              <button
                onClick={() => {
                  onOpenUpload();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Open / Import Artwork...</span>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl+O</span>
              </button>
              <div className="h-[1px] bg-white/[0.08] my-1" />
              <button
                onClick={() => {
                  onOpenExport();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Export Standalone Graphic...</span>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl+E</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('mockup');
                  onOpenExport();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Export Apparel Mockup...</span>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl+Shift+E</span>
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
            <div className="absolute top-full left-0 mt-0.5 w-52 bg-[#18181e] border border-white/[0.12] rounded-lg shadow-2xl py-1 text-neutral-200 z-50 text-[11px]">
              <button
                disabled={!canUndo}
                onClick={() => {
                  onUndo();
                  closeMenu();
                }}
                className={`w-full px-3 py-1.5 text-left flex items-center justify-between ${
                  canUndo ? 'hover:bg-[#27272f] hover:text-white' : 'opacity-40 cursor-not-allowed text-neutral-600'
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
                  canRedo ? 'hover:bg-[#27272f] hover:text-white' : 'opacity-40 cursor-not-allowed text-neutral-600'
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
            <div className="absolute top-full left-0 mt-0.5 w-56 bg-[#18181e] border border-white/[0.12] rounded-lg shadow-2xl py-1 text-neutral-200 z-50 text-[11px]">
              <button
                onClick={() => {
                  onZoomChange(Math.min(3.0, zoom + 0.2));
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Zoom In</span>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl++</span>
              </button>
              <button
                onClick={() => {
                  onZoomChange(Math.max(0.2, zoom - 0.2));
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Zoom Out</span>
                <span className="text-[10px] font-mono text-neutral-500">Ctrl+-</span>
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
                  onToggleComparison();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Split Comparison View</span>
                {showComparison && <Check size={12} className="text-white" />}
              </button>
              <button
                onClick={() => {
                  onToggleCheckerboard();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Transparency Grid</span>
                {showCheckerboard && <Check size={12} className="text-white" />}
              </button>
              <button
                onClick={() => {
                  onToggleRulers();
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#27272f] hover:text-white"
              >
                <span>Studio Pixel Rulers</span>
                {showRulers && <Check size={12} className="text-white" />}
              </button>
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
            <div className="absolute top-full left-0 mt-0.5 w-60 bg-[#18181e] border border-white/[0.12] rounded-lg shadow-2xl py-1 text-neutral-200 z-50 text-[11px]">
              <button
                onClick={() => {
                  onApplyPreset('tatami_standard');
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#27272f] hover:text-white"
              >
                Standard Tatami Weave
              </button>
              <button
                onClick={() => {
                  onApplyPreset('satin_crest');
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#27272f] hover:text-white"
              >
                Heavy Satin Crest
              </button>
              <button
                onClick={() => {
                  onApplyPreset('puff_cap_3d');
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#27272f] hover:text-white"
              >
                3D Puff Cap Relief
              </button>
              <button
                onClick={() => {
                  onApplyPreset('gold_metallic');
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#27272f] hover:text-white"
              >
                Metallic Gold Foil Thread
              </button>
              <button
                onClick={() => {
                  onApplyPreset('heavy_merrowed');
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#27272f] hover:text-white"
              >
                Military Merrowed Border Patch
              </button>
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
            <div className="absolute top-full left-0 mt-0.5 w-56 bg-[#18181e] border border-white/[0.12] rounded-lg shadow-2xl py-1 text-neutral-200 z-50 text-[11px]">
              <button
                onClick={() => {
                  onSelectMockupCategory('shirt');
                  onNavigate('mockup');
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#27272f] hover:text-white"
              >
                Crewneck T-Shirt (Black)
              </button>
              <button
                onClick={() => {
                  onSelectMockupCategory('sweatshirt');
                  onNavigate('mockup');
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#27272f] hover:text-white"
              >
                Heavyweight Hoodie (Heather Grey)
              </button>
              <button
                onClick={() => {
                  onSelectMockupCategory('hat');
                  onNavigate('mockup');
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#27272f] hover:text-white"
              >
                Structured Snapback Cap (Navy)
              </button>
              <button
                onClick={() => {
                  onSelectMockupCategory('tote');
                  onNavigate('mockup');
                  closeMenu();
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#27272f] hover:text-white"
              >
                Heavy Canvas Tote
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right System Info */}
      <div className="flex items-center space-x-3 text-[10px] font-mono text-neutral-400">
        <span className="hidden sm:inline">Color Engine: sRGB PBR</span>
        <span className="text-neutral-600 hidden sm:inline">•</span>
        <span>GPU Shader Acceleration</span>
      </div>
    </div>
  );
};
