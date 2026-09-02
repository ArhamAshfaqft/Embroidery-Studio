import React from 'react';
import { EMBROIDERY_PRESETS } from '../../engine/presets';
import { EmbroiderySettings } from '../../types';
import { Check } from 'lucide-react';

interface PresetPickerProps {
  currentPresetId?: string;
  onSelectPreset: (presetSettings: Partial<EmbroiderySettings>) => void;
}

export const PresetPicker: React.FC<PresetPickerProps> = ({
  currentPresetId,
  onSelectPreset
}) => {
  return (
    <div className="grid grid-cols-1 gap-1.5 p-0.5">
      {EMBROIDERY_PRESETS.map((preset) => {
        const isSelected = currentPresetId === preset.id;
        return (
          <button
            key={preset.id}
            onClick={() => onSelectPreset(preset.settings)}
            className={`flex flex-col text-left p-2.5 rounded-lg border transition-all relative ${
              isSelected
                ? 'bg-[#22222a] border-white/25 text-white shadow-md'
                : 'bg-[#121215]/80 border-white/[0.05] text-neutral-400 hover:text-neutral-200 hover:border-white/10 hover:bg-[#18181d]'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <span className="text-[12px] font-semibold tracking-tight text-neutral-100">
                  {preset.name}
                </span>
                {isSelected && (
                  <div className="w-3.5 h-3.5 rounded-full bg-white text-black flex items-center justify-center">
                    <Check size={9} strokeWidth={3} />
                  </div>
                )}
              </div>
              <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/40 text-neutral-400 border border-white/[0.06]">
                {preset.category}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
              {preset.description}
            </p>
          </button>
        );
      })}
    </div>
  );
};
