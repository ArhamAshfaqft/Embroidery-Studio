import React from 'react';
import { RotateCcw } from 'lucide-react';

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  onChange: (value: number) => void;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step = 0.1,
  defaultValue,
  unit = '',
  onChange
}) => {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className="py-2 border-b border-neutral-800/40 last:border-0 group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-medium text-neutral-300 group-hover:text-neutral-200 transition-colors tracking-tight">
          {label}
        </span>
        <div className="flex items-center space-x-1.5">
          {defaultValue !== undefined && Math.abs(value - defaultValue) > 0.001 && (
            <button
              onClick={() => onChange(defaultValue)}
              title="Reset to default"
              className="text-neutral-500 hover:text-neutral-300 p-0.5 rounded transition-colors"
            >
              <RotateCcw size={11} />
            </button>
          )}
          <div className="relative flex items-center">
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={Number.isInteger(value) ? value : parseFloat(value.toFixed(2))}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  onChange(Math.max(min, Math.min(max, val)));
                }
              }}
              className="w-13 bg-[#121215] border border-neutral-800 rounded px-1.5 py-0.5 text-[11px] font-mono text-neutral-200 text-right focus:outline-none focus:border-neutral-500 transition-colors"
            />
            {unit && (
              <span className="text-[10px] text-neutral-500 font-mono ml-1 select-none">
                {unit}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Slider Track with Dynamic Fill */}
      <div className="relative flex items-center h-4">
        <div className="absolute left-0 right-0 h-1 bg-neutral-800/80 rounded-full overflow-hidden pointer-events-none">
          <div
            className="h-full bg-neutral-300 rounded-full transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full relative z-10 cursor-pointer opacity-0 h-4"
        />
        {/* Custom Visual Thumb */}
        <div
          className="absolute h-3 w-3 rounded-full bg-white border border-neutral-900 shadow-md pointer-events-none transform -translate-x-1/2 transition-transform duration-75 group-hover:scale-110"
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
