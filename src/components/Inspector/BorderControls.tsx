import React from 'react';
import { EmbroiderySettings, BorderType } from '../../types';
import { SliderControl } from '../Controls/SliderControl';
import { ColorPickerPopover } from '../Controls/ColorPickerPopover';

interface BorderControlsProps {
  settings: EmbroiderySettings;
  onChange: (updated: Partial<EmbroiderySettings>) => void;
}

const BORDER_TYPES: { id: BorderType; label: string; description: string }[] = [
  { id: 'satin', label: 'Satin Stitch', description: 'Perpendicular edge contour' },
  { id: 'merrowed', label: 'Merrowed Edge', description: 'Heavy overlock patch trim' },
  { id: 'running', label: 'Running Stitch', description: 'Clean boundary contour' },
  { id: 'none', label: 'None', description: 'Raw interior fill without border' }
];

export const BorderControls: React.FC<BorderControlsProps> = ({
  settings,
  onChange
}) => {
  return (
    <div className="space-y-3">
      {/* Border Type Selector Grid */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Border Style
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {BORDER_TYPES.map((type) => {
            const isSelected = settings.borderType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => onChange({ borderType: type.id, presetId: undefined })}
                className={`p-2 rounded-lg text-left border transition-all ${
                  isSelected
                    ? 'bg-[#22222a] border-white/25 text-white shadow-sm font-medium'
                    : 'bg-[#121215]/80 border-white/[0.05] text-neutral-400 hover:text-neutral-200 hover:border-white/10'
                }`}
              >
                <div className="text-[12px] font-medium tracking-tight text-neutral-200">{type.label}</div>
                <div className="text-[10px] text-neutral-500 truncate mt-0.5">{type.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {settings.borderType !== 'none' && (
        <>
          <SliderControl
            label="Border Thickness"
            value={settings.borderThickness}
            min={1.0}
            max={20.0}
            step={0.5}
            defaultValue={5.0}
            unit="px"
            onChange={(borderThickness) => onChange({ borderThickness, presetId: undefined })}
          />

          {/* Border Color Override */}
          <div className="pt-1">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-[12px] font-medium text-neutral-300">Custom Border Color</span>
              <button
                onClick={() => onChange({ useCustomBorderColor: !settings.useCustomBorderColor })}
                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.useCustomBorderColor ? 'bg-white' : 'bg-neutral-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-neutral-950 shadow ring-0 transition duration-200 ease-in-out ${
                    settings.useCustomBorderColor ? 'translate-x-3' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {settings.useCustomBorderColor && (
              <ColorPickerPopover
                label="Border Thread Swatch"
                color={settings.borderColor}
                onChange={(borderColor) => onChange({ borderColor })}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};
