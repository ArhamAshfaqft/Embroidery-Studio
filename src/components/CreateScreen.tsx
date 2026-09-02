import React, { useRef, useState, useMemo, useEffect } from 'react';
import { SourceAsset, TextConfig } from '../types';
import { TextEditor } from './TextEditor';
import { renderTextToCanvas, DEFAULT_TEXT_CONFIG } from '../engine/textRenderer';
import { removePlainBackground, hasSolidBackgroundBorders } from '../engine/imageUtils';
import {
  Upload,
  Type,
  ArrowRight,
  FileImage,
  Clipboard,
  CheckCircle2,
  ImagePlus,
  Trash2,
  Wand2,
  Sparkles
} from 'lucide-react';

interface CreateScreenProps {
  currentAsset: SourceAsset | null;
  onSelectAsset: (asset: SourceAsset | null) => void;
  onProceedToEmbroidery: () => void;
}

export const CreateScreen: React.FC<CreateScreenProps> = ({
  currentAsset,
  onSelectAsset,
  onProceedToEmbroidery
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>(
    currentAsset?.type === 'text' ? 'text' : 'upload'
  );

  // Independent state for uploaded graphic vs custom typography
  const [uploadedGraphic, setUploadedGraphic] = useState<SourceAsset | null>(
    currentAsset?.type === 'image' ? currentAsset : null
  );

  const [textConfig, setTextConfig] = useState<TextConfig>(
    currentAsset?.textConfig || DEFAULT_TEXT_CONFIG
  );

  const [hasSolidBg, setHasSolidBg] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Compute live vector text asset on the fly
  const currentTextAsset = useMemo<SourceAsset>(() => {
    const { dataUrl, canvas } = renderTextToCanvas(textConfig, 1000, 600);
    return {
      id: 'text_custom',
      type: 'text',
      name: `Text: ${textConfig.text.slice(0, 16)}`,
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      textConfig
    };
  }, [textConfig]);

  // Active asset currently in view based on the active tab
  const activeDisplayAsset = activeTab === 'text' ? currentTextAsset : uploadedGraphic;

  // Sync active asset to parent only when tab or asset changes
  useEffect(() => {
    if (activeTab === 'text') {
      onSelectAsset(currentTextAsset);
    } else {
      onSelectAsset(uploadedGraphic);
    }
  }, [activeTab, currentTextAsset, uploadedGraphic]);

  // Check for solid background in uploaded graphic
  useEffect(() => {
    if (uploadedGraphic?.dataUrl) {
      const img = new Image();
      img.onload = () => {
        setHasSolidBg(hasSolidBackgroundBorders(img));
      };
      img.src = uploadedGraphic.dataUrl;
    } else {
      setHasSolidBg(false);
    }
  }, [uploadedGraphic?.dataUrl]);

  const handleFileUpload = (file: File) => {
    if (!file.type.match(/image\/(png|jpeg|jpg|webp)/i)) {
      alert('Please upload a valid image file (PNG, JPG, JPEG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const newAsset: SourceAsset = {
          id: `upload_${Date.now()}`,
          type: 'image',
          name: file.name.replace(/\.[^/.]+$/, ''),
          dataUrl,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height
        };
        setUploadedGraphic(newAsset);
        setActiveTab('upload');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // 1-Click Background Knockout
  const handleRemoveBackground = () => {
    if (!uploadedGraphic?.dataUrl) return;
    setIsRemovingBg(true);

    const img = new Image();
    img.onload = () => {
      const result = removePlainBackground(img, 32);
      setUploadedGraphic({
        ...uploadedGraphic,
        dataUrl: result.dataUrl,
        name: `${uploadedGraphic.name}_transparent`
      });
      setHasSolidBg(false);
      setIsRemovingBg(false);
    };
    img.src = uploadedGraphic.dataUrl;
  };

  // Clipboard Paste (Ctrl+V) listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileUpload(file);
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleProceed = () => {
    if (activeTab === 'upload' && uploadedGraphic) {
      onSelectAsset(uploadedGraphic);
      onProceedToEmbroidery();
    } else if (activeTab === 'text' && currentTextAsset) {
      onSelectAsset(currentTextAsset);
      onProceedToEmbroidery();
    }
  };

  const canProceed = activeTab === 'text' ? Boolean(currentTextAsset?.dataUrl) : Boolean(uploadedGraphic?.dataUrl);

  return (
    <div className="flex-1 flex overflow-hidden bg-[#09090b]">
      {/* Left Ingestion & Tools Sidebar */}
      <div className="w-86 border-r border-white/[0.08] flex flex-col bg-[#0d0d11] shrink-0">
        {/* Source Mode Selector */}
        <div className="p-3 border-b border-white/[0.08] bg-[#121216]/50">
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#141418] rounded-lg border border-white/[0.06]">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center justify-center space-x-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-[#27272f] text-white shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Upload size={13} />
              <span>Import Graphic</span>
            </button>

            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center justify-center space-x-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'text'
                  ? 'bg-[#27272f] text-white shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Type size={13} />
              <span>Embroidery Text</span>
            </button>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Modern Import Card */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                  dragOver
                    ? 'border-white bg-[#1a1a24]'
                    : 'border-white/[0.1] hover:border-white/30 bg-[#141418] hover:bg-[#181820]'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-[#22222a] border border-white/[0.08] flex items-center justify-center mb-3 shadow-inner">
                  <Upload size={18} className="text-white" />
                </div>
                <div className="text-xs font-semibold text-neutral-200 tracking-tight">
                  Click to Browse or Drag Image
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">
                  Supports transparent PNG, JPG, JPEG, WebP
                </div>
                <div className="mt-3 flex items-center space-x-1.5 text-[10px] font-mono text-neutral-400 bg-black/40 px-2.5 py-1 rounded-md border border-white/[0.06]">
                  <Clipboard size={10} className="text-neutral-500" />
                  <span>Press Ctrl+V to paste from clipboard</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  }}
                  className="hidden"
                />
              </div>

              {/* Active Uploaded Asset Summary */}
              {uploadedGraphic && (
                <div className="p-3 bg-[#141418] rounded-xl border border-white/[0.06] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span className="text-xs font-semibold text-neutral-200">Uploaded Graphic</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedGraphic(null);
                      }}
                      className="text-neutral-500 hover:text-red-400 p-1 rounded transition-colors"
                      title="Remove graphic"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="text-[11px] text-neutral-300 font-mono truncate">
                    {uploadedGraphic.name}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">
                    {uploadedGraphic.width} × {uploadedGraphic.height} px
                  </div>

                  {/* 1-Click Magic Background Removal */}
                  <button
                    onClick={handleRemoveBackground}
                    disabled={isRemovingBg}
                    className={`w-full flex items-center justify-center space-x-2 py-1.5 px-3 rounded-lg text-xs font-medium border transition-all ${
                      hasSolidBg
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25 animate-pulse'
                        : 'bg-[#1e1e24] border-white/[0.08] text-neutral-300 hover:bg-[#282832] hover:text-white'
                    }`}
                  >
                    <Wand2 size={12} className={isRemovingBg ? 'animate-spin' : ''} />
                    <span>{isRemovingBg ? 'Removing Background...' : 'Remove Background (Knockout)'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <TextEditor
              config={textConfig}
              onChange={(updated) => setTextConfig({ ...textConfig, ...updated })}
            />
          )}
        </div>
      </div>

      {/* Main Viewport Stage */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-[#09090c] canvas-grid select-none">
        {/* Top Viewport Header */}
        <div className="h-10 border-b border-white/[0.06] bg-[#0c0c10]/80 backdrop-blur-md flex items-center justify-between px-4 z-10">
          <div className="flex items-center space-x-2 text-xs">
            <FileImage size={13} className="text-neutral-400" />
            <span className="text-neutral-200 font-semibold truncate max-w-sm">
              {activeDisplayAsset?.name || 'Empty Document'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {activeDisplayAsset && (
              <span className="text-[11px] font-mono text-neutral-400 bg-white/[0.04] px-2.5 py-0.5 rounded border border-white/[0.06]">
                {activeDisplayAsset.width} × {activeDisplayAsset.height} px
              </span>
            )}
          </div>
        </div>

        {/* Clean Viewport Artwork Stage */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative">
          {activeDisplayAsset?.dataUrl ? (
            <img
              src={activeDisplayAsset.dataUrl}
              alt={activeDisplayAsset.name}
              className="max-w-[560px] max-h-[560px] object-contain drop-shadow-2xl select-none pointer-events-none transition-transform duration-150"
            />
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3 text-neutral-500 max-w-sm text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#141418] border border-white/[0.08] flex items-center justify-center shadow-inner">
                <ImagePlus size={24} className="text-neutral-400" />
              </div>
              <div className="text-sm font-semibold text-neutral-200">No Graphic Uploaded</div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Import an image (PNG, JPG, WebP) or press <kbd className="px-1.5 py-0.5 bg-[#1e1e24] text-neutral-300 rounded border border-white/[0.08] font-mono text-[10px]">Ctrl+V</kbd> to paste from clipboard.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Primary Action Bar */}
        <div className="h-14 border-t border-white/[0.08] bg-[#0c0c10]/95 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center space-x-3 text-xs text-neutral-400 font-mono">
            {activeDisplayAsset ? (
              <>
                <span className="text-neutral-200 font-semibold">{activeDisplayAsset.name}</span>
                <span className="text-neutral-700">•</span>
                <span>{activeDisplayAsset.width} × {activeDisplayAsset.height} px</span>
                <span className="text-neutral-700">•</span>
                <span>Format: {activeDisplayAsset.type === 'text' ? 'Vector Text' : 'Graphic Image'}</span>
              </>
            ) : (
              <span className="text-neutral-500">Awaiting source artwork...</span>
            )}
          </div>

          <button
            onClick={handleProceed}
            disabled={!canProceed}
            className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-bold transition-all shadow-xl ${
              canProceed
                ? 'pro-btn text-neutral-950 hover:scale-[1.02] cursor-pointer'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-50'
            }`}
          >
            <span>Open Embroidery Engine</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
