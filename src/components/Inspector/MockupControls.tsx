import React, { useRef, useState } from 'react';
import { MockupTemplate, MockupTransform, SourceAsset } from '../../types';
import { MOCKUP_TEMPLATES } from '../../engine/mockupRenderer';
import { DEFAULT_FABRIC_BLEND } from '../../engine/fabricIntegration';
import { SliderControl } from '../Controls/SliderControl';
import {
  Upload,
  RotateCcw,
  MoveHorizontal,
  MoveVertical,
  Crosshair,
  Maximize2,
  FolderOpen,
  RefreshCw,
  Save,
  ChevronUp,
  Type,
  Edit3
} from 'lucide-react';

interface MockupControlsProps {
  currentMockup: MockupTemplate;
  transform: MockupTransform;
  templates?: MockupTemplate[];
  sourceAsset?: SourceAsset;
  onNavigateToSource?: () => void;
  onSelectMockup: (mockup: MockupTemplate) => void;
  onUpdateTransform: (updated: Partial<MockupTransform>) => void;
  onUploadCustomMockup: (template: MockupTemplate) => void;
  onOpenMockupsFolder?: () => void;
  onRefreshMockups?: () => void;
  isRefreshing?: boolean;
  onSaveSettingsAsDefault?: (target?: 'all' | 'embroidery' | 'mockup') => void;
  onResetSettings?: () => void;
  saveStatusText?: string;
}

export const MockupControls: React.FC<MockupControlsProps> = ({
  currentMockup,
  transform,
  templates = MOCKUP_TEMPLATES,
  sourceAsset,
  onNavigateToSource,
  onSelectMockup,
  onUpdateTransform,
  onUploadCustomMockup,
  onOpenMockupsFolder,
  onRefreshMockups,
  isRefreshing = false,
  onSaveSettingsAsDefault,
  onResetSettings,
  saveStatusText
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const customTemplate: MockupTemplate = {
          id: `custom_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          category: 'shirt',
          imageUrl: dataUrl,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          defaultTransform: {
            x: 50,
            y: 50,
            scale: 0.38,
            rotation: 0,
            opacity: 1,
            blendMode: 'normal',
            displacementStrength: 4.0,
            shadowIntensity: 1.5,
            fabricTextureStrength: 2.0,
            creviceShadowStrength: 2.5
          },
          isCustom: true
        };
        onUploadCustomMockup(customTemplate);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const allTemplates = templates && templates.length > 0 ? templates : MOCKUP_TEMPLATES;

  return (
    <div className="space-y-4">
      {/* Active Artwork & Font Quick Access */}
      {sourceAsset && (
        <div className="p-3 bg-[#131318] rounded-xl border border-white/[0.08] flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <div className="w-7 h-7 rounded-lg bg-[#20202a] border border-white/10 flex items-center justify-center shrink-0">
              <Type size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-neutral-200 truncate">
                {sourceAsset.type === 'text'
                  ? `Text: "${sourceAsset.textConfig?.text || 'Embroidery'}"`
                  : sourceAsset.name}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono truncate">
                {sourceAsset.type === 'text' ? 'Custom Typography & Font' : 'Imported Artwork'}
              </div>
            </div>
          </div>
          {onNavigateToSource && (
            <button
              type="button"
              onClick={onNavigateToSource}
              className="shrink-0 flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#22222c] border border-white/15 text-[11px] font-semibold text-white hover:bg-[#2c2c38] hover:border-white/30 transition-all shadow-sm cursor-pointer"
              title="Edit text, font family, curved arch, and colors"
            >
              <Edit3 size={11} className="text-neutral-300" />
              <span>{sourceAsset.type === 'text' ? 'Edit Text & Font' : 'Edit Artwork'}</span>
            </button>
          )}
        </div>
      )}

      {/* Apparel Template Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Apparel Template
            </label>
            {onRefreshMockups && (
              <button
                onClick={onRefreshMockups}
                className="p-1 rounded text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors"
                title="Scan public/mockups folder for newly added files"
              >
                <RefreshCw size={11} className={isRefreshing ? "animate-spin text-emerald-400" : ""} />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1.5">
            {onOpenMockupsFolder && (
              <button
                onClick={onOpenMockupsFolder}
                className="flex items-center space-x-1 text-xs text-neutral-300 hover:text-white px-2 py-1 rounded bg-[#18181c] border border-white/[0.08] hover:border-white/20 transition-all shadow-sm"
                title="Open e:\Embroidery Studio\public\mockups\ in Windows Explorer to paste mockups"
              >
                <FolderOpen size={11} className="text-amber-400" />
                <span>Folder</span>
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1 text-xs text-neutral-300 hover:text-white px-2 py-1 rounded bg-[#18181c] border border-white/[0.08] hover:border-white/20 transition-all shadow-sm"
              title="Upload a mockup image from anywhere on your PC"
            >
              <Upload size={11} />
              <span>Upload</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            onChange={handleCustomUpload}
            className="hidden"
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5 max-h-[320px] overflow-y-auto pr-0.5">
          {allTemplates.map((tpl) => {
            const isSelected = currentMockup.id === tpl.id;
            return (
              <button
                key={tpl.id}
                onClick={() => onSelectMockup(tpl)}
                className={`flex items-center space-x-2 p-2 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-[#22222a] border-white/25 text-white shadow-md'
                    : 'bg-[#121215]/80 border-white/[0.05] text-neutral-400 hover:text-neutral-200 hover:border-white/10 hover:bg-[#18181d]'
                }`}
              >
                <div className="w-10 h-10 rounded bg-[#09090b] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={tpl.imageUrl}
                    alt={tpl.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-neutral-200 truncate tracking-tight" title={tpl.name}>
                    {tpl.name}
                  </div>
                  <div className="text-[9px] text-neutral-400 uppercase font-mono mt-0.5">
                    {tpl.category}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-[10px] text-neutral-500 flex items-center justify-between px-0.5 pt-0.5">
          <span>{allTemplates.length} templates available</span>
          <span className="text-neutral-600">Paste images into folder to auto-load</span>
        </div>
      </div>

      {/* Placement Presets */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Quick Placement
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onUpdateTransform({ x: 50, y: currentMockup.category === 'hat' ? 40 : 44, scale: 0.85, rotation: 0 })}
            className="py-1.5 px-2 rounded-md bg-[#141418] border border-white/[0.06] hover:border-white/20 text-[11px] text-neutral-300 hover:text-white transition-all text-center"
          >
            Center Front
          </button>
          <button
            onClick={() => onUpdateTransform({ x: 62, y: 38, scale: 0.48, rotation: 0 })}
            className="py-1.5 px-2 rounded-md bg-[#141418] border border-white/[0.06] hover:border-white/20 text-[11px] text-neutral-300 hover:text-white transition-all text-center"
          >
            Left Chest Pocket
          </button>
          <button
            onClick={() => onUpdateTransform({ x: 50, y: 50, scale: 1.25, rotation: 0 })}
            className="py-1.5 px-2 rounded-md bg-[#141418] border border-white/[0.06] hover:border-white/20 text-[11px] text-neutral-300 hover:text-white transition-all text-center"
          >
            Oversized Graphic
          </button>
          <button
            onClick={() => onUpdateTransform({ ...currentMockup.defaultTransform })}
            className="py-1.5 px-2 rounded-md bg-[#141418] border border-white/[0.06] hover:border-white/20 text-[11px] text-neutral-300 hover:text-white transition-all text-center flex items-center justify-center space-x-1"
          >
            <RotateCcw size={10} />
            <span>Reset Default</span>
          </button>
        </div>
      </div>

      {/* Placement Coordinates & Scale */}
      <div className="space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Transform Controls
        </span>

        <SliderControl
          label="Horizontal (X Position)"
          value={Math.round(transform.x)}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(x: number) => onUpdateTransform({ x })}
        />

        <SliderControl
          label="Vertical (Y Position)"
          value={Math.round(transform.y)}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(y: number) => onUpdateTransform({ y })}
        />

        <SliderControl
          label="Embroidery Scale"
          value={transform.scale}
          min={0.1}
          max={2.5}
          step={0.05}
          defaultValue={1.0}
          onChange={(scale: number) => onUpdateTransform({ scale })}
        />

        <SliderControl
          label="Rotation Angle"
          value={Math.round(transform.rotation)}
          min={-180}
          max={180}
          step={1}
          defaultValue={0}
          unit="°"
          onChange={(rotation: number) => onUpdateTransform({ rotation })}
        />

        <SliderControl
          label="Opacity"
          value={transform.opacity}
          min={0.1}
          max={1.0}
          step={0.05}
          defaultValue={1.0}
          onChange={(opacity: number) => onUpdateTransform({ opacity })}
        />
      </div>

      {/* Garment Conformance & Realistic Wrap */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Fabric Blending & Wrinkle Wrap
        </span>

        <button
          type="button"
          onClick={() => onUpdateTransform({
            blendMode: 'normal', opacity: 1,
            fabricBlendStrength: DEFAULT_FABRIC_BLEND,
            displacementStrength: currentMockup.category === 'hat' ? 3 : 4.5,
            fabricTextureStrength: 1.5, creviceShadowStrength: 4, shadowIntensity: 1.5
          })}
          className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-neutral-100 hover:bg-white/10 transition-colors"
        >
          Apply natural fabric blend
        </button>
        <p className="text-[11px] leading-relaxed text-neutral-500">
          Matches photo lighting, texture and edge softness, even on smooth fabric. Wrinkle wrap follows visible folds. Wait for Full-detail mockup after placing your design.
        </p>

        <SliderControl
          label="Automatic Fabric Blend"
          value={transform.fabricBlendStrength ?? DEFAULT_FABRIC_BLEND}
          min={0}
          max={10}
          step={0.5}
          defaultValue={DEFAULT_FABRIC_BLEND}
          onChange={(fabricBlendStrength: number) => onUpdateTransform({ fabricBlendStrength })}
        />

        <SliderControl
          label="Fabric Wrinkle Warp"
          value={transform.displacementStrength}
          min={0}
          max={10}
          step={0.5}
          defaultValue={4.5}
          onChange={(displacementStrength: number) => onUpdateTransform({ displacementStrength })}
        />

        <SliderControl
          label="Cloth Weave Grain"
          value={transform.fabricTextureStrength ?? 2}
          min={0}
          max={10}
          step={0.5}
          defaultValue={2}
          onChange={(fabricTextureStrength: number) => onUpdateTransform({ fabricTextureStrength })}
        />

        <SliderControl
          label="Fold Shadow Depth"
          value={transform.creviceShadowStrength ?? 3}
          min={0}
          max={10}
          step={0.5}
          defaultValue={3}
          onChange={(creviceShadowStrength: number) => onUpdateTransform({ creviceShadowStrength })}
        />

        <SliderControl
          label="Fabric Contact Occlusion"
          value={transform.shadowIntensity}
          min={0}
          max={10}
          step={0.5}
          defaultValue={0.6}
          onChange={(shadowIntensity: number) => onUpdateTransform({ shadowIntensity })}
        />

        <div className="py-2 border-b border-neutral-800/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-neutral-300">Fabric Blend Mode</span>
          </div>
          <select
            value={transform.blendMode}
            onChange={(e) => onUpdateTransform({ blendMode: e.target.value as any })}
            className="w-full bg-[#1c1c22] border border-neutral-700/80 rounded-md px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-400"
          >
            <option value="normal">Normal (Preserve Thread Colours)</option>
            <option value="multiply">Multiply (Darken Colours)</option>
            <option value="overlay">Overlay (Fabric Grain Wash)</option>
            <option value="hard-light">Hard Light (High Contrast)</option>
          </select>
        </div>
      </div>

      {/* Explicit Save Defaults Action */}
      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px] text-neutral-400">
          {saveStatusText || 'Apparel defaults'}
        </span>
        <div className="flex items-center space-x-1.5">
          {onResetSettings && (
            <button
              onClick={onResetSettings}
              className="px-2 py-1 rounded bg-[#1a1a20] border border-white/10 hover:border-white/20 text-neutral-400 hover:text-neutral-200 text-[10px] transition-all cursor-pointer"
              title="Reset garment placement and wrap parameters back to factory defaults (Alt+R)"
            >
              Reset
            </button>
          )}
          {onSaveSettingsAsDefault && (
            <div className="relative inline-flex items-center rounded bg-[#1a221d] border border-emerald-500/40 hover:border-emerald-500/70 transition-all shadow-sm">
              <button
                onClick={() => onSaveSettingsAsDefault('all')}
                className="px-2.5 py-1 text-emerald-300 hover:text-emerald-200 text-[10px] font-medium transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Save current parameters and placement as default for next session (Ctrl+S)"
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
};
