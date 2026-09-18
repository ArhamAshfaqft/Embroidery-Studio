import React, { useState, useRef, useEffect } from 'react';
import { ExportOptions, EmbroiderySettings, MockupTemplate, MockupTransform, SourceAsset } from '../types';
import { ExportEngine } from '../engine/exportEngine';
import { isRenderCancelled } from '../engine/backgroundRenderer';
import { MAX_RENDER_PIXELS } from '../engine/renderSizing';
import { X, Download, CheckCircle2, Loader2, Sparkles, Layers, Image as ImageIcon } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceAsset?: SourceAsset | null;
  sourceImage: HTMLImageElement | HTMLCanvasElement | null;
  mockupTemplate: MockupTemplate;
  mockupImage: HTMLImageElement | null;
  settings: EmbroiderySettings;
  transform: MockupTransform;
  activeScreen: 'embroidery' | 'mockup' | 'create';
  defaultIncludeMockup?: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  sourceAsset,
  sourceImage,
  mockupTemplate,
  mockupImage,
  settings,
  transform,
  activeScreen,
  defaultIncludeMockup
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'png',
    resolutionMultiplier: 2,
    transparentBackground: true,
    quality: 0.95,
    includeMockup: defaultIncludeMockup !== undefined ? defaultIncludeMockup : activeScreen === 'mockup',
    fileName: 'embroidery-design'
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const exportRevision = useRef(0);
  const engineRef = useRef<ExportEngine | null>(null);
  if (!engineRef.current) engineRef.current = new ExportEngine(message => setExportStatus(message));
  useEffect(() => {
    if (isOpen) {
      setExportStatus(''); setExportedSuccess(false);
      setOptions(current => ({
        ...current,
        includeMockup: defaultIncludeMockup !== undefined ? defaultIncludeMockup : activeScreen === 'mockup',
        resolutionMultiplier: sourceImage && sourceImage.width * sourceImage.height * 4 > MAX_RENDER_PIXELS ? 1 : current.resolutionMultiplier
      }));
    }
    return () => { ++exportRevision.current; engineRef.current?.cancel(); setIsExporting(false); };
  }, [isOpen, defaultIncludeMockup, activeScreen, sourceImage]);

  if (!isOpen || !sourceImage) return null;

  const exportEngine = engineRef.current;

  const baseWidth = options.includeMockup ? (mockupImage?.naturalWidth || 1200) : sourceImage.width;
  const baseHeight = options.includeMockup ? (mockupImage?.naturalHeight || 1200) : sourceImage.height;
  const targetW = baseWidth * options.resolutionMultiplier;
  const targetH = baseHeight * options.resolutionMultiplier;

  const handleExport = async () => {
    const revision = ++exportRevision.current;
    setIsExporting(true);
    setExportedSuccess(false);
    setExportStatus('Preparing full-resolution export…');

    try {
      if (options.includeMockup && mockupImage) {
        const result = await exportEngine.exportFinishedMockup(
          mockupImage,
          sourceImage,
          settings,
          transform,
          options,
          sourceAsset || undefined
        );
        const ext = options.format === 'jpeg' ? 'jpg' : options.format;
        if (revision === exportRevision.current) exportEngine.downloadFile(result.blob, `${options.fileName}-mockup.${ext}`);
      } else {
        const result = await exportEngine.exportStandaloneEmbroidery(
          sourceImage,
          settings,
          options
        );
        const ext = options.format === 'jpeg' ? 'jpg' : options.format;
        if (revision === exportRevision.current) exportEngine.downloadFile(result.blob, `${options.fileName}-standalone.${ext}`);
      }
      if (revision !== exportRevision.current) return;
      setExportedSuccess(true);
      setExportStatus('Export complete');
      setIsExporting(false);
    } catch (err) {
      if (revision === exportRevision.current) {
        if (!isRenderCancelled(err)) setExportStatus(err instanceof Error ? err.message : 'Export failed');
        setIsExporting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#121217] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#16161c]">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-md bg-white text-neutral-950 flex items-center justify-center">
              <Download size={11} strokeWidth={2.5} />
            </div>
            <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider">
              Export Graphic Production
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {exportStatus && <p role="status" className="text-xs text-neutral-300">{exportStatus}</p>}
          {isExporting && <button className="text-xs text-red-300" onClick={() => {
            ++exportRevision.current; exportEngine.cancel(); setIsExporting(false); setExportStatus('Export cancelled; original artwork unchanged.');
          }}>Cancel export</button>}
          {/* Export Type Switcher */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Export Target
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOptions({ ...options, includeMockup: false, format: 'png' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  !options.includeMockup
                    ? 'bg-[#22222a] border-white/25 text-white shadow-md'
                    : 'bg-[#141418] border-white/[0.05] text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-xs font-semibold">
                  <Layers size={13} />
                  <span>Standalone PNG</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 leading-tight">
                  Transparent alpha background
                </div>
              </button>

              <button
                onClick={() => setOptions({ ...options, includeMockup: true })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  options.includeMockup
                    ? 'bg-[#22222a] border-white/25 text-white shadow-md'
                    : 'bg-[#141418] border-white/[0.05] text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center space-x-1.5 text-xs font-semibold">
                  <ImageIcon size={13} />
                  <span>Apparel Mockup</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 leading-tight">
                  Finished ecommerce listing
                </div>
              </button>
            </div>
          </div>

          {/* File Format */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Format Standard
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['png', 'jpeg', 'webp'] as const).map((fmt) => {
                const disabled = !options.includeMockup && fmt === 'jpeg';
                return (
                  <button
                    key={fmt}
                    disabled={disabled}
                    onClick={() => setOptions({ ...options, format: fmt })}
                    className={`py-2 px-3 rounded-lg border text-center uppercase font-mono text-xs transition-all ${
                      disabled
                        ? 'opacity-30 cursor-not-allowed bg-black/40 border-transparent text-neutral-600'
                        : options.format === fmt
                        ? 'bg-[#27272f] border-white/20 text-white font-bold shadow-sm'
                        : 'bg-[#141418] border-white/[0.06] text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {fmt === 'jpeg' ? 'JPG' : fmt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resolution Multiplier */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Resolution Scale
              </label>
              <span className="text-[11px] font-mono text-neutral-300 bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.06]">
                {targetW} × {targetH} px
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {([1, 2, 3, 4] as const).map((scale) => (
                <button
                  key={scale}
                  disabled={isExporting || Math.max(baseWidth * baseHeight, sourceImage.width * sourceImage.height) * scale * scale > MAX_RENDER_PIXELS}
                  title={sourceImage.width * sourceImage.height * scale * scale > MAX_RENDER_PIXELS ? 'Exceeds safe canvas size. Original artwork is unchanged.' : undefined}
                  onClick={() => setOptions({ ...options, resolutionMultiplier: scale })}
                  className={`py-2 rounded-lg border text-center text-xs font-mono transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    options.resolutionMultiplier === scale
                      ? 'bg-[#27272f] border-white/20 text-white font-bold shadow-sm'
                      : 'bg-[#141418] border-white/[0.06] text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {scale}× {scale === 4 ? '(300 DPI)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Output Filename */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Output Filename
            </label>
            <input
              type="text"
              value={options.fileName}
              onChange={(e) => setOptions({ ...options, fileName: e.target.value })}
              className="w-full bg-[#0d0d10] border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-neutral-400 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0d0d11] border-t border-white/[0.08]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="pro-btn flex items-center space-x-2 px-5 py-2.5 rounded-xl text-neutral-950 text-xs font-bold transition-all shadow-xl disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Computing Render...</span>
              </>
            ) : exportedSuccess ? (
              <>
                <CheckCircle2 size={13} className="text-emerald-700" />
                <span>Export Complete</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span>Download {options.format.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
