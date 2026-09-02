import React from 'react';
import { THREAD_PALETTES } from '../../engine/colorPalettes';

interface ColorPickerPopoverProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
}

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  label,
  color,
  onChange
}) => {
  const quickColors = THREAD_PALETTES[0].colors.slice(0, 12);

  return (
    <div className="py-2 border-b border-neutral-800/40 last:border-0 group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-medium text-neutral-300 group-hover:text-neutral-200 transition-colors tracking-tight">
          {label}
        </span>
        <div className="flex items-center space-x-1.5">
          <div
            className="w-3.5 h-3.5 rounded-full border border-neutral-600 shadow-inner"
            style={{ backgroundColor: color }}
          />
          <input
            type="text"
            value={color.toUpperCase()}
            onChange={(e) => onChange(e.target.value)}
            className="w-20 bg-[#121215] border border-neutral-800 rounded px-1.5 py-0.5 text-[11px] font-mono text-neutral-200 text-center uppercase focus:outline-none focus:border-neutral-500 transition-colors"
          />
        </div>
      </div>

      {/* Swatches & Native Color Input */}
      <div className="flex items-center space-x-1.5 mt-2">
        <label className="relative cursor-pointer">
          <input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
          <div
            className="w-5 h-5 rounded-md border border-neutral-700 hover:border-neutral-400 flex items-center justify-center transition-colors shadow-sm"
            style={{ backgroundColor: color }}
            title="Choose custom thread color"
          />
        </label>

        <div className="h-4 w-[1px] bg-neutral-800 mx-1" />

        <div className="flex items-center space-x-1 flex-1 overflow-x-auto py-0.5 no-scrollbar">
          {quickColors.map((swatch) => {
            const isSelected = color.toLowerCase() === swatch.hex.toLowerCase();
            return (
              <button
                key={swatch.code}
                onClick={() => onChange(swatch.hex)}
                title={`${swatch.name} (#${swatch.code})`}
                className={`w-4 h-4 rounded-full border shrink-0 transition-transform ${
                  isSelected
                    ? 'border-white ring-2 ring-white/30 scale-110 shadow-sm'
                    : 'border-neutral-800 hover:border-neutral-500 hover:scale-105'
                }`}
                style={{ backgroundColor: swatch.hex }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
