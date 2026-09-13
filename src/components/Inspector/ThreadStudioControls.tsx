import React from 'react';
import { EmbroiderySettings, ThreadStudioConfig, ThreadStudioPresetId } from '../../types';
import { SliderControl } from '../Controls/SliderControl';
import { DEFAULT_THREAD_STUDIO_CONFIG, THREAD_STUDIO_PRESETS } from '../../engine/presets';
import { Sparkles, Layers, Sliders, Feather } from 'lucide-react';

interface ThreadStudioControlsProps {
  settings: EmbroiderySettings;
  onChange: (updated: Partial<EmbroiderySettings>) => void;
}

const PRESET_DESCRIPTIONS: Record<ThreadStudioPresetId, { label: string; desc: string }> = {
  cleanLogo: { label: 'Clean Logo', desc: 'Crisp shape-aware Tatami fill' },
  realistic: { label: 'Realistic', desc: 'Detailed threads, outline & fuzz' },
  satin: { label: 'Dense Satin', desc: 'Smooth lustrous satin columns' },
  puff: { label: 'Raised / Puff', desc: 'Heavy 3D relief with deep shadows' }
};

export const ThreadStudioControls: React.FC<ThreadStudioControlsProps> = ({
  settings,
  onChange
}) => {
  const config: ThreadStudioConfig = {
    ...DEFAULT_THREAD_STUDIO_CONFIG,
    ...(settings.threadStudio?.preset ? THREAD_STUDIO_PRESETS[settings.threadStudio.preset] : {}),
    ...(settings.threadStudio || {})
  };

  const activePreset = config.preset;
  const currentPresetDefaults = activePreset ? THREAD_STUDIO_PRESETS[activePreset] : DEFAULT_THREAD_STUDIO_CONFIG;

  const update = (changes: Partial<ThreadStudioConfig>) => {
    onChange({
      presetId: undefined,
      threadStudio: {
        ...config,
        ...changes,
        preset: undefined
      }
    });
  };

  const setPreset = (preset: ThreadStudioPresetId) => {
    const presetIdMap: Record<ThreadStudioPresetId, string> = {
      cleanLogo: 'tatami_standard',
      realistic: 'realistic',
      satin: 'satin_crest',
      puff: 'puff_cap_3d'
    };

    onChange({
      presetId: presetIdMap[preset],
      threadStudio: {
        ...THREAD_STUDIO_PRESETS[preset]
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Presets Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-300">
            Thread Studio Presets
          </span>
          <span className="text-[9px] text-neutral-500 font-mono">
            {activePreset ? PRESET_DESCRIPTIONS[activePreset]?.label : 'Custom'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(THREAD_STUDIO_PRESETS) as ThreadStudioPresetId[]).map((presetId) => {
            const isSelected = activePreset === presetId;
            const meta = PRESET_DESCRIPTIONS[presetId];
            return (
              <button
                key={presetId}
                onClick={() => setPreset(presetId)}
                className={`p-2 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-amber-400/60 bg-amber-400/10 text-white shadow-sm'
                    : 'border-white/[0.08] bg-[#17171d] text-neutral-400 hover:text-neutral-200 hover:border-white/20'
                }`}
              >
                <div className={`text-[10px] font-bold ${isSelected ? 'text-amber-300' : 'text-neutral-200'}`}>
                  {meta.label}
                </div>
                <div className="text-[8px] text-neutral-500 mt-0.5 line-clamp-1">
                  {meta.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="space-y-1.5 pt-1 border-t border-white/[0.08]">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-300 mb-1">
          Feature Passes
        </div>
        
        <label className="flex items-center justify-between p-1.5 rounded-lg bg-[#16161c] border border-white/[0.06] hover:border-white/15 cursor-pointer transition-colors">
          <span className="text-[11px] text-neutral-300">Satin Detail Stitches</span>
          <input
            type="checkbox"
            checked={config.drawEdge}
            onChange={(e) => update({ drawEdge: e.target.checked })}
            className="w-4 h-4 rounded bg-[#101014] border-neutral-700 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between p-1.5 rounded-lg bg-[#16161c] border border-white/[0.06] hover:border-white/15 cursor-pointer transition-colors">
          <span className="text-[11px] text-neutral-300">Running Stitch Outline</span>
          <input
            type="checkbox"
            checked={config.drawOutline}
            onChange={(e) => update({ drawOutline: e.target.checked })}
            className="w-4 h-4 rounded bg-[#101014] border-neutral-700 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between p-1.5 rounded-lg bg-[#16161c] border border-white/[0.06] hover:border-white/15 cursor-pointer transition-colors">
          <span className="text-[11px] text-neutral-300">Micro Edge Fibers</span>
          <input
            type="checkbox"
            checked={config.drawFuzz}
            onChange={(e) => update({ drawFuzz: e.target.checked })}
            className="w-4 h-4 rounded bg-[#101014] border-neutral-700 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
        </label>
      </div>

      {/* Dynamic 3D Lighting (v2 Engine) */}
      <div className="space-y-1 pt-1 border-t border-white/[0.08]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-300">
            3D Directional Lighting
          </span>
          <span className="text-[9px] text-amber-400 font-mono">
            Ray-Marched
          </span>
        </div>

        <SliderControl
          label="Light Direction"
          value={config.lightAngle ?? 225}
          min={0}
          max={360}
          step={1}
          defaultValue={currentPresetDefaults.lightAngle ?? 225}
          unit="°"
          onChange={(lightAngle) => update({ lightAngle })}
        />

        <SliderControl
          label="Light Elevation"
          value={config.lightHeight ?? 48}
          min={20}
          max={85}
          step={1}
          defaultValue={currentPresetDefaults.lightHeight ?? 48}
          unit="°"
          onChange={(lightHeight) => update({ lightHeight })}
        />
      </div>

      {/* Dedicated Thread Studio Sliders */}
      <div className="space-y-1 pt-1 border-t border-white/[0.08]">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-300 mb-1">
          Thread & Stitch Parameters
        </div>

        <SliderControl
          label="Thread Width"
          value={config.threadWidth}
          min={1.1}
          max={6.5}
          step={0.1}
          defaultValue={currentPresetDefaults.threadWidth}
          unit="px"
          onChange={(threadWidth) => update({ threadWidth })}
        />

        <SliderControl
          label="Stitch Spacing"
          value={config.spacing}
          min={1.5}
          max={9.5}
          step={0.1}
          defaultValue={currentPresetDefaults.spacing}
          unit="px"
          onChange={(spacing) => update({ spacing })}
        />

        <SliderControl
          label="Stitch Length"
          value={config.stitchLen}
          min={4.0}
          max={30.0}
          step={0.5}
          defaultValue={currentPresetDefaults.stitchLen}
          unit="px"
          onChange={(stitchLen) => update({ stitchLen })}
        />

        <SliderControl
          label="Fill Angle"
          value={config.fillAngle}
          min={-90}
          max={90}
          step={1}
          defaultValue={currentPresetDefaults.fillAngle}
          unit="°"
          onChange={(fillAngle) => update({ fillAngle })}
        />

        <SliderControl
          label="Satin Detail Reach"
          value={config.edgeWidth}
          min={0.0}
          max={14.0}
          step={0.5}
          defaultValue={currentPresetDefaults.edgeWidth}
          unit="px"
          onChange={(edgeWidth) => update({ edgeWidth })}
        />

        <SliderControl
          label="Satin Fullness"
          value={config.edgeDensity}
          min={25}
          max={100}
          step={1}
          defaultValue={currentPresetDefaults.edgeDensity}
          unit="%"
          onChange={(edgeDensity) => update({ edgeDensity })}
        />

        <SliderControl
          label="Thread Shine"
          value={config.shine}
          min={0}
          max={100}
          step={1}
          defaultValue={currentPresetDefaults.shine}
          unit="%"
          onChange={(shine) => update({ shine })}
        />

        <SliderControl
          label="Surface Roughness"
          value={config.roughness}
          min={0}
          max={100}
          step={1}
          defaultValue={currentPresetDefaults.roughness}
          unit="%"
          onChange={(roughness) => update({ roughness })}
        />
      </div>
    </div>
  );
};
