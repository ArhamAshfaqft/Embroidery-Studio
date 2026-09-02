import React from 'react';
import { TextConfig } from '../types';
import { FONT_OPTIONS } from '../engine/textRenderer';
import { SliderControl } from './Controls/SliderControl';
import { ColorPickerPopover } from './Controls/ColorPickerPopover';
import { AlignLeft, AlignCenter, AlignRight, Type } from 'lucide-react';

interface TextEditorProps {
  config: TextConfig;
  onChange: (updated: Partial<TextConfig>) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({ config, onChange }) => {
  return (
    <div className="space-y-4">
      {/* Multi-line Text Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Embroidery Typography
          </label>
          <button
            onClick={() => onChange({ uppercase: !config.uppercase })}
            className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
              config.uppercase
                ? 'bg-[#27272f] border-white/20 text-white font-semibold'
                : 'bg-[#121215] border-white/[0.06] text-neutral-500 hover:text-neutral-300'
            }`}
          >
            ALL CAPS
          </button>
        </div>
        <textarea
          rows={3}
          value={config.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Enter text to embroider..."
          className="w-full bg-[#121215] border border-white/[0.08] rounded-lg p-2.5 text-xs text-neutral-100 font-mono focus:outline-none focus:border-neutral-500 resize-none transition-colors"
        />
      </div>

      {/* Font Family Selector */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Font Family
        </label>
        <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
          {FONT_OPTIONS.map((f) => {
            const isSelected = config.fontFamily === f.family;
            return (
              <button
                key={f.name}
                onClick={() => onChange({ fontFamily: f.family })}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-[#22222a] border-white/25 text-white shadow-sm'
                    : 'bg-[#121215]/80 border-white/[0.05] text-neutral-400 hover:text-neutral-200 hover:border-white/10 hover:bg-[#18181d]'
                }`}
              >
                <span className="text-[12px] font-medium tracking-tight">{f.label}</span>
                <span
                  className="text-sm truncate max-w-[120px]"
                  style={{ fontFamily: f.family }}
                >
                  Embroidery
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Text Alignment */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Alignment
        </label>
        <div className="grid grid-cols-3 gap-1 p-0.5 bg-[#121215] rounded-lg border border-white/[0.06]">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => onChange({ textAlign: align })}
              className={`flex items-center justify-center py-1.5 rounded-md transition-all ${
                config.textAlign === align
                  ? 'bg-[#27272f] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {align === 'left' && <AlignLeft size={13} />}
              {align === 'center' && <AlignCenter size={13} />}
              {align === 'right' && <AlignRight size={13} />}
            </button>
          ))}
        </div>
      </div>

      {/* Curved / Arched Text Control */}
      <div className="space-y-1 bg-[#141418] p-3 rounded-lg border border-white/[0.06]">
        <div className="flex items-center space-x-1.5 mb-1">
          <Type size={13} className="text-neutral-400" />
          <span className="text-xs font-semibold text-neutral-200">Curved & Arched Text</span>
        </div>
        <SliderControl
          label="Arc Curvature"
          value={config.archAngle}
          min={-180}
          max={180}
          step={2}
          defaultValue={0}
          unit="°"
          onChange={(archAngle: number) => onChange({ archAngle })}
        />
      </div>

      {/* Typography Sliders */}
      <div className="space-y-1">
        <SliderControl
          label="Font Size"
          value={config.fontSize}
          min={24}
          max={180}
          step={2}
          defaultValue={80}
          unit="px"
          onChange={(fontSize: number) => onChange({ fontSize })}
        />

        <SliderControl
          label="Letter Spacing"
          value={config.letterSpacing}
          min={-5}
          max={40}
          step={1}
          defaultValue={4}
          unit="px"
          onChange={(letterSpacing: number) => onChange({ letterSpacing })}
        />

        <SliderControl
          label="Line Height"
          value={config.lineHeight}
          min={0.8}
          max={2.2}
          step={0.05}
          defaultValue={1.1}
          onChange={(lineHeight: number) => onChange({ lineHeight })}
        />
      </div>

      {/* Text Thread Color */}
      <ColorPickerPopover
        label="Thread Color"
        color={config.color}
        onChange={(color: string) => onChange({ color })}
      />
    </div>
  );
};
