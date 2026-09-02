import React from 'react';
import { EmbroiderySettings, ColorMode } from '../../types';
import { THREAD_PALETTES } from '../../engine/colorPalettes';
import { SliderControl } from '../Controls/SliderControl';
import { ColorPickerPopover } from '../Controls/ColorPickerPopover';

interface ColorControlsProps {
  settings: EmbroiderySettings;
  onChange: (updated: Partial<EmbroiderySettings>) => void;
}

const COLOR_MODES: { id: ColorMode; label: string; description: string }[] = [
  { id: 'original', label: 'Artwork', description: 'Original colors' },
  { id: 'palette', label: 'Palette', description: 'Thread match' },
  { id: 'monochrome', label: 'Mono', description: 'Single thread' }
];

export const ColorControls: React.FC<ColorControlsProps> = ({
  settings,
  onChange
}) => {
  return (
    <div className="space-y-3">
      {/* Color Mode Tabs */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Color Processing
        </label>
        <div className="grid grid-cols-3 gap-1 p-0.5 bg-[#121215] rounded-lg border border-white/[0.06]">
          {COLOR_MODES.map((mode) => {
            const isSelected = settings.colorMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onChange({ colorMode: mode.id, presetId: undefined })}
                className={`py-1.5 px-2 rounded-md text-center text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#27272f] text-white shadow-sm font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Solid Thread Spool Quantization (Wilcom Mode) */}
      {settings.colorMode === 'original' && (
        <div className="p-3 bg-[#141418] rounded-xl border border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-neutral-200">Solid Thread Spool Mode</span>
              <span className="text-[10px] text-neutral-400">Quantize AI gradients into crisp thread blocks</span>
            </div>
            <input
              type="checkbox"
              checked={settings.quantizeColors !== false}
              onChange={(e) => onChange({ quantizeColors: e.target.checked })}
              className="w-4 h-4 rounded accent-white cursor-pointer"
            />
          </div>

          {settings.quantizeColors !== false && (
            <SliderControl
              label="Thread Spool Count"
              value={settings.maxColors || 16}
              min={4}
              max={32}
              step={2}
              defaultValue={16}
              onChange={(maxColors) => onChange({ maxColors })}
            />
          )}
        </div>
      )}

      {/* Palette Mode Selector */}
      {settings.colorMode === 'palette' && (
        <div className="space-y-2 bg-[#141418] p-3 rounded-lg border border-white/[0.06]">
          <label className="text-xs font-medium text-neutral-300">Commercial Thread Standard</label>
          <select
            value={settings.paletteId}
            onChange={(e) => onChange({ paletteId: e.target.value })}
            className="w-full bg-[#1c1c22] border border-neutral-700/80 rounded-md px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-400"
          >
            {THREAD_PALETTES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.colors.length} threads)
              </option>
            ))}
          </select>
          <p className="text-[11px] text-neutral-400 leading-tight">
            {THREAD_PALETTES.find((p) => p.id === settings.paletteId)?.description}
          </p>
        </div>
      )}

      {/* Monochrome Thread Selector */}
      {settings.colorMode === 'monochrome' && (
        <div className="bg-[#141418] p-3 rounded-lg border border-white/[0.06]">
          <ColorPickerPopover
            label="Monochrome Thread"
            color={settings.monochromeColor}
            onChange={(monochromeColor) => onChange({ monochromeColor })}
          />
        </div>
      )}

      {/* Fine-tuning Sliders */}
      <div className="pt-1 space-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Color Adjustments
        </span>
        <SliderControl
          label="Brightness"
          value={settings.brightness}
          min={-50}
          max={50}
          step={1}
          defaultValue={0}
          unit="%"
          onChange={(brightness) => onChange({ brightness })}
        />

        <SliderControl
          label="Contrast"
          value={settings.contrast}
          min={-50}
          max={50}
          step={1}
          defaultValue={5}
          unit="%"
          onChange={(contrast) => onChange({ contrast })}
        />

        <SliderControl
          label="Saturation"
          value={settings.saturation}
          min={-50}
          max={50}
          step={1}
          defaultValue={10}
          unit="%"
          onChange={(saturation) => onChange({ saturation })}
        />
      </div>
    </div>
  );
};
