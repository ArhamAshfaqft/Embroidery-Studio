import React, { useRef } from 'react';
import { MockupTemplate, MockupTransform } from '../../types';
import { MOCKUP_TEMPLATES } from '../../engine/mockupRenderer';
import { SliderControl } from '../Controls/SliderControl';
import {
  Upload,
  RotateCcw,
  MoveHorizontal,
  MoveVertical,
  Crosshair,
  Maximize2
} from 'lucide-react';

interface MockupControlsProps {
  currentMockup: MockupTemplate;
  transform: MockupTransform;
  onSelectMockup: (mockup: MockupTemplate) => void;
  onUpdateTransform: (updated: Partial<MockupTransform>) => void;
  onUploadCustomMockup: (template: MockupTemplate) => void;
}

export const MockupControls: React.FC<MockupControlsProps> = ({
  currentMockup,
  transform,
  onSelectMockup,
  onUpdateTransform,
  onUploadCustomMockup
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          width: img.width,
          height: img.height,
          defaultTransform: {
            x: 50,
            y: 50,
            scale: 0.8,
            rotation: 0,
            opacity: 1,
            blendMode: 'normal',
            displacementStrength: 4,
            shadowIntensity: 6
          }
        };
        onUploadCustomMockup(customTemplate);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* Apparel Template Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Apparel Template
          </label>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1 text-xs text-neutral-300 hover:text-white px-2 py-1 rounded bg-[#18181c] border border-white/[0.08] hover:border-white/20 transition-all shadow-sm"
          >
            <Upload size={11} />
            <span>Upload Mockup</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleCustomUpload}
            className="hidden"
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {MOCKUP_TEMPLATES.map((tpl) => {
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
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-neutral-200 truncate tracking-tight">
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

      {/* Garment Integration */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Garment Shading & Shadow
        </span>

        <SliderControl
          label="Fabric Contact Shadow"
          value={transform.shadowIntensity}
          min={0}
          max={10}
          step={0.5}
          defaultValue={6}
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
            <option value="normal">Normal (Opaque 3D Stitches)</option>
            <option value="multiply">Multiply (Dark Fabric Integration)</option>
            <option value="overlay">Overlay (Fabric Grain Wash)</option>
            <option value="hard-light">Hard Light (High Contrast)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
