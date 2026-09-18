import React, { useRef, useState, useEffect } from 'react';
import { TextConfig } from '../types';
import {
  CustomFontItem,
  FontOption,
  loadCustomFontsFromStorage,
  processFontFile,
  deleteCustomFontFromStorage,
  getAllFontOptions
} from '../engine/fontManager';
import { SliderControl } from './Controls/SliderControl';
import { ColorPickerPopover } from './Controls/ColorPickerPopover';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Upload,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface TextEditorProps {
  config: TextConfig;
  onChange: (updated: Partial<TextConfig>) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({ config, onChange }) => {
  const [customFonts, setCustomFonts] = useState<CustomFontItem[]>([]);
  const [isUploadingFont, setIsUploadingFont] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isFontDragOver, setIsFontDragOver] = useState(false);
  const fontFileInputRef = useRef<HTMLInputElement>(null);

  // Load custom fonts on mount
  useEffect(() => {
    let mounted = true;
    loadCustomFontsFromStorage()
      .then((fonts) => {
        if (mounted) setCustomFonts(fonts);
      })
      .catch((err) => {
        console.warn('Could not load custom fonts from storage:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleFontFileSelected = async (file: File) => {
    setIsUploadingFont(true);
    setStatusMessage(null);

    try {
      const newFont = await processFontFile(file);
      setCustomFonts((prev) => [...prev.filter((f) => f.id !== newFont.id), newFont]);
      // Immediately switch to the newly uploaded font!
      onChange({ fontFamily: newFont.family });
      setStatusMessage({
        text: `Font "${newFont.name}" loaded successfully!`,
        type: 'success'
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Font upload error:', err);
      setStatusMessage({
        text: err?.message || 'Could not load font. Please ensure it is a valid .ttf, .otf, or .woff file.',
        type: 'error'
      });
    } finally {
      setIsUploadingFont(false);
    }
  };

  const handleDeleteCustomFont = async (e: React.MouseEvent, fontId: string, fontLabel: string) => {
    e.stopPropagation();
    if (!window.confirm(`Remove custom font "${fontLabel}"?`)) return;

    await deleteCustomFontFromStorage(fontId);
    setCustomFonts((prev) => prev.filter((f) => f.id !== fontId));

    // If currently active font was deleted, fallback to default font
    const deletedFont = customFonts.find((f) => f.id === fontId);
    if (deletedFont && config.fontFamily === deletedFont.family) {
      onChange({ fontFamily: "'Alfa Slab One', cursive" });
    }
  };

  const handleFontDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsFontDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFontFileSelected(file);
    }
  };

  const allFontOptions: FontOption[] = getAllFontOptions(customFonts);
  const customFontOptions = allFontOptions.filter((f) => f.isCustom);
  const builtinFontOptions = allFontOptions.filter((f) => !f.isCustom);

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

      {/* Font Family Selector & Custom Font Uploader */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Font Family & Style
          </label>

          {/* Upload Own Font Button */}
          <button
            type="button"
            onClick={() => fontFileInputRef.current?.click()}
            disabled={isUploadingFont}
            className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#22222a] border border-white/15 text-[11px] font-medium text-white hover:bg-[#2c2c36] hover:border-white/30 transition-all cursor-pointer shadow-sm group"
            title="Upload custom font file (.ttf, .otf, .woff, .woff2)"
          >
            <Upload size={11} className="text-neutral-300 group-hover:text-white transition-colors" />
            <span>{isUploadingFont ? 'Loading Font...' : 'Upload Font'}</span>
          </button>

          <input
            ref={fontFileInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2,font/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFontFileSelected(file);
              // Reset input value so re-selecting same file triggers onChange
              e.target.value = '';
            }}
          />
        </div>

        {/* Upload Status Notification */}
        {statusMessage && (
          <div
            className={`flex items-center space-x-1.5 p-2 rounded-lg text-[11px] font-medium border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle size={13} className="shrink-0 text-rose-400" />
            )}
            <span className="truncate">{statusMessage.text}</span>
          </div>
        )}

        {/* Font List Container with Drag & Drop */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsFontDragOver(true);
          }}
          onDragLeave={() => setIsFontDragOver(false)}
          onDrop={handleFontDrop}
          className={`space-y-2 rounded-xl p-1.5 border transition-all ${
            isFontDragOver
              ? 'border-white bg-[#1e1e28]'
              : 'border-white/[0.06] bg-[#0f0f13]'
          }`}
        >
          {/* Drag & drop hint overlay if dragging */}
          {isFontDragOver && (
            <div className="p-3 text-center text-xs font-semibold text-white bg-[#22222e] rounded-lg border border-white/20">
              Drop your .ttf or .otf font here to install!
            </div>
          )}

          {/* Section 1: Custom Uploaded Fonts */}
          {customFontOptions.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                <Sparkles size={10} className="text-amber-400" />
                <span>Your Uploaded Fonts ({customFontOptions.length})</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {customFontOptions.map((f) => {
                  const isSelected = config.fontFamily === f.family;
                  return (
                    <div
                      key={f.id || f.name}
                      onClick={() => onChange({ fontFamily: f.family })}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#262633] border-white/30 text-white shadow-sm'
                          : 'bg-[#141418] border-white/[0.06] text-neutral-300 hover:text-white hover:border-white/15 hover:bg-[#1a1a22]'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-semibold">
                          Custom
                        </span>
                        <span className="text-[12px] font-semibold tracking-tight truncate">
                          {f.label}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span
                          className="text-base truncate max-w-[110px]"
                          style={{ fontFamily: f.family }}
                        >
                          Embroidery
                        </span>
                        {f.id && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomFont(e, f.id!, f.label)}
                            className="text-neutral-500 hover:text-rose-400 p-1 rounded hover:bg-white/[0.05] transition-colors"
                            title="Delete custom font"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Built-in Studio Fonts */}
          <div className="space-y-1">
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-neutral-500">
              Studio Embroidery Fonts
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
              {builtinFontOptions.map((f) => {
                const isSelected = config.fontFamily === f.family;
                return (
                  <button
                    type="button"
                    key={f.name}
                    onClick={() => onChange({ fontFamily: f.family })}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-[#22222a] border-white/25 text-white shadow-sm'
                        : 'bg-[#121215]/80 border-white/[0.05] text-neutral-400 hover:text-neutral-200 hover:border-white/10 hover:bg-[#18181d]'
                    }`}
                  >
                    <span className="text-[12px] font-medium tracking-tight truncate pr-2">
                      {f.label}
                    </span>
                    <span
                      className="text-sm truncate max-w-[120px] shrink-0"
                      style={{ fontFamily: f.family }}
                    >
                      Embroidery
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
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
              type="button"
              key={align}
              onClick={() => onChange({ textAlign: align })}
              className={`flex items-center justify-center py-1.5 rounded-md transition-all ${
                config.textAlign === align
                  ? 'bg-[#27272f] text-white shadow-sm font-semibold'
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
