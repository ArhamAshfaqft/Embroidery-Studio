import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  MockupTemplate,
  MockupTransform,
  EmbroiderySettings,
  SourceAsset,
  ToolType
} from '../types';
import { BackgroundRenderer, isRenderCancelled } from '../engine/backgroundRenderer';
import { getMockupRenderScale } from '../engine/renderSizing';
import { loadSourceImage } from '../engine/sourceImages';
import { MockupRenderer } from '../engine/mockupRenderer';
import { getMockupEmbroiderySettings } from '../engine/mockupSettings';
import { MockupControls } from './Inspector/MockupControls';
import { Ruler } from './Controls/Ruler';
import {
  Shirt,
  Download,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Eye,
  EyeOff
} from 'lucide-react';

const PREVIEW_SUPERSAMPLE = 2;
const HIGH_QUALITY_SETTLE_MS = 140;

interface MockupStudioProps {
  sourceAsset: SourceAsset;
  settings: EmbroiderySettings;
  mockupTemplate: MockupTemplate;
  transform: MockupTransform;
  templates?: MockupTemplate[];
  onSelectMockup: (mockup: MockupTemplate) => void;
  onUpdateTransform: (updated: Partial<MockupTransform>) => void;
  onUploadCustomMockup: (template: MockupTemplate) => void;
  onOpenMockupsFolder?: () => void;
  onRefreshMockups?: () => void;
  isRefreshingMockups?: boolean;
  activeTool: ToolType;
  zoomMode?: 'in' | 'out';
  zoom: number;
  onZoomChange: (z: number) => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  showRulers: boolean;
  isPreviewMode: boolean;
  onTogglePreviewMode: () => void;
  onOpenExport: () => void;
  onSaveSettingsAsDefault?: (target?: 'all' | 'embroidery' | 'mockup') => void;
  onResetSettings?: () => void;
  saveStatusText?: string;
}

export const MockupStudio: React.FC<MockupStudioProps> = ({
  sourceAsset,
  settings,
  mockupTemplate,
  transform,
  templates,
  onSelectMockup,
  onUpdateTransform,
  onUploadCustomMockup,
  onOpenMockupsFolder,
  onRefreshMockups,
  isRefreshingMockups = false,
  activeTool,
  zoomMode = 'in',
  zoom,
  onZoomChange,
  onResetZoom,
  onFitToScreen,
  showRulers,
  isPreviewMode,
  onTogglePreviewMode,
  onOpenExport,
  onSaveSettingsAsDefault,
  onResetSettings,
  saveStatusText
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mockupCanvasRef = useRef<HTMLCanvasElement>(null);
  const mockupImgRef = useRef<HTMLImageElement | null>(null);
  const sourceImgRef = useRef<HTMLImageElement | null>(null);
  const embroideryCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const settledRenderTimerRef = useRef<number | null>(null);
  const transformRef = useRef<MockupTransform>(transform);
  transformRef.current = transform;

  const embroideryRenderer = useRef<BackgroundRenderer | null>(null);
  const compositionRenderer = useRef<BackgroundRenderer | null>(null);
  if (!embroideryRenderer.current) embroideryRenderer.current = new BackgroundRenderer();
  if (!compositionRenderer.current) compositionRenderer.current = new BackgroundRenderer();
  const mockupRenderer = useRef(new MockupRenderer());
  const embroideryScaleRef = useRef(PREVIEW_SUPERSAMPLE);
  const [loadedSource, setLoadedSource] = useState('');
  const [renderStatus, setRenderStatus] = useState('Preparing artwork…');
  const composeGenerationRef = useRef(0);
  // Match the placed footprint, with a bounded editing raster for oversized inputs.
  // Full-resolution export does not use this preview bound.
  const sourceRenderScale = Math.min(
    4096 / Math.max(sourceAsset.width, sourceAsset.height),
    Math.ceil(getMockupRenderScale(sourceAsset.width, sourceAsset.height, transform.scale, PREVIEW_SUPERSAMPLE) * 4) / 4
  );

  // Pan & Hold Space State
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  type InteractionMode = 'none' | 'drag' | 'resize' | 'rotate';
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('none');
  const interactionModeRef = useRef<InteractionMode>('none');
  interactionModeRef.current = interactionMode;
  const cursorRafRef = useRef<number | null>(null);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [initialTransform, setInitialTransform] = useState<MockupTransform>(transform);

  const [cursorCoord, setCursorCoord] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 800, height: 600 });

  const [mockupDimensions, setMockupDimensions] = useState<{ width: number; height: number }>({
    width: mockupTemplate.width || 1200,
    height: mockupTemplate.height || 1200
  });

  useEffect(() => {
    setMockupDimensions({
      width: mockupTemplate.width || 1200,
      height: mockupTemplate.height || 1200
    });
    setPan({ x: 0, y: 0 });
  }, [mockupTemplate.id, mockupTemplate.width, mockupTemplate.height]);

  const layoutWidth = mockupDimensions.width || 1200;
  const layoutHeight = mockupDimensions.height || 1200;

  // Space Bar Hold Listener for Hand Pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }
      if (e.code === 'Space' && !e.repeat) {
        setIsSpaceHeld(true);
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceHeld(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!sourceAsset.dataUrl) return;
    let cancelled = false;
    sourceImgRef.current = null;
    embroideryCanvasRef.current = null;
    setLoadedSource('');
    void loadSourceImage(sourceAsset.dataUrl).then(img => {
      if (cancelled) return;
      sourceImgRef.current = img;
      setLoadedSource(sourceAsset.dataUrl || '');
    }).catch(() => { if (!cancelled) setRenderStatus('Could not load artwork'); });
    return () => {
      cancelled = true;
    };
  }, [sourceAsset.dataUrl]);

  useEffect(() => {
    if (!sourceImgRef.current || loadedSource !== sourceAsset.dataUrl) return;
    let cancelled = false;
    const source = sourceImgRef.current;
    const timer = window.setTimeout(async () => {
      setRenderStatus('Preparing detailed mockup artwork…');
      try {
        const result = await embroideryRenderer.current!.renderEmbroideryAsync(source, getMockupEmbroiderySettings(settings), sourceRenderScale,
          message => { if (!cancelled) setRenderStatus(message); });
        if (cancelled) return;
        embroideryCanvasRef.current = result.canvas;
        embroideryScaleRef.current = result.width / source.width;
        renderCompositeMockup();
      } catch (error) {
        if (!cancelled && !isRenderCancelled(error)) setRenderStatus(error instanceof Error ? error.message : 'Render failed');
      }
    }, 120);
    return () => { cancelled = true; clearTimeout(timer); embroideryRenderer.current?.cancel(); };
  }, [loadedSource, sourceAsset.dataUrl, settings, sourceRenderScale]);

  useEffect(() => {
    let cancelled = false;
    mockupImgRef.current = null;
    compositionRenderer.current?.cancel();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      mockupImgRef.current = img;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setMockupDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      }
      renderCompositeMockup();
    };
    img.onerror = () => { if (!cancelled) setRenderStatus('Could not load garment'); };
    img.src = mockupTemplate.imageUrl;
    return () => { cancelled = true; };
  }, [mockupTemplate.imageUrl]);

  const renderCompositeMockup = useCallback(async (renderScale: number = PREVIEW_SUPERSAMPLE, skipDisplacement: boolean = false) => {
    if (!mockupImgRef.current || !embroideryCanvasRef.current || !mockupCanvasRef.current) return;

    const naturalW = mockupImgRef.current.naturalWidth || mockupDimensions.width || 1200;
    const naturalH = mockupImgRef.current.naturalHeight || mockupDimensions.height || 1200;

    const currentLayoutW = naturalW;
    const currentLayoutH = naturalH;

    // Fast, supersampled preview bounded safely to 4K max dimension
    const maxDim = Math.max(naturalW, naturalH);
    const maxPreviewDim = 3840;
    const effectiveScale = maxDim * renderScale > maxPreviewDim ? maxPreviewDim / maxDim : renderScale;

    const renderWidth = Math.max(50, Math.round(currentLayoutW * effectiveScale));
    const renderHeight = Math.max(50, Math.round(currentLayoutH * effectiveScale));

    const generation = ++composeGenerationRef.current;
    compositionRenderer.current?.cancel();
    try {
      const options = {
        embroideryRenderScale: embroideryScaleRef.current,
        layoutWidth: currentLayoutW,
        layoutHeight: currentLayoutH,
        skipDisplacement
      };
      // The interactive pass is only a bounded canvas blit. Full displacement
      // is settled in a worker, never inside pointer events or slider handlers.
      const composed = skipDisplacement
        ? mockupRenderer.current.composeMockup(mockupImgRef.current, embroideryCanvasRef.current,
            transformRef.current, renderWidth, renderHeight, options)
        : (await compositionRenderer.current!.compose(mockupImgRef.current, embroideryCanvasRef.current,
            transformRef.current, renderWidth, renderHeight, options)).canvas;
      if (generation !== composeGenerationRef.current || !mockupCanvasRef.current) return;

      const canvas = mockupCanvasRef.current;
      if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
        canvas.width = renderWidth;
        canvas.height = renderHeight;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, renderWidth, renderHeight);
      ctx.drawImage(composed, 0, 0, renderWidth, renderHeight);
      setRenderStatus(skipDisplacement ? 'Editing • full detail after release' : 'Full-detail mockup');
    } catch (error) {
      if (generation === composeGenerationRef.current && !isRenderCancelled(error)) setRenderStatus(error instanceof Error ? error.message : 'Mockup failed');
    }
  }, [mockupDimensions.width, mockupDimensions.height]);

  useEffect(() => {
    // When actively dragging, rotating, or scaling the gizmo, skip heavy displacement
    // to keep placement responsive. As soon as interaction settles, compute the
    // full 2x supersampled displacement composite.
    const frame = requestAnimationFrame(() => renderCompositeMockup(1, true));

    if (settledRenderTimerRef.current !== null) {
      window.clearTimeout(settledRenderTimerRef.current);
    }
    settledRenderTimerRef.current = window.setTimeout(() => {
      renderCompositeMockup(PREVIEW_SUPERSAMPLE, false);
      settledRenderTimerRef.current = null;
    }, HIGH_QUALITY_SETTLE_MS);

    return () => {
      cancelAnimationFrame(frame);
      if (settledRenderTimerRef.current !== null) {
        window.clearTimeout(settledRenderTimerRef.current);
        settledRenderTimerRef.current = null;
      }
    };
  }, [transform, renderCompositeMockup]);

  useEffect(() => () => {
    ++composeGenerationRef.current;
    embroideryRenderer.current?.dispose();
    compositionRenderer.current?.dispose();
  }, []);

  const posX = (transform.x / 100) * layoutWidth;
  const posY = (transform.y / 100) * layoutHeight;
  const boxW = sourceAsset.width * transform.scale;
  const boxH = sourceAsset.height * transform.scale;

  // Wheel Zoom
  useEffect(() => {
    const viewport = containerRef.current;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const newZoom = Math.max(0.1, Math.min(4, zoom * (e.deltaY < 0 ? 1.15 : 0.85)));
      onZoomChange(parseFloat(newZoom.toFixed(3)));
    };
    viewport?.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport?.removeEventListener('wheel', handleWheel);
  }, [zoom, onZoomChange]);

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (isSpaceHeld || activeTool === 'hand' || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (activeTool === 'zoom') {
      const isZoomOut = zoomMode === 'out' || e.altKey || e.button === 2;
      if (isZoomOut) {
        onZoomChange(Math.max(0.05, parseFloat((zoom * 0.75).toFixed(2))));
      } else {
        onZoomChange(Math.min(5.0, parseFloat((zoom * 1.3).toFixed(2))));
      }
    }
  };

  const startDrag = (e: React.MouseEvent, mode: InteractionMode, handle?: string) => {
    if (isSpaceHeld || isPreviewMode) return;
    e.stopPropagation();
    e.preventDefault();
    setInteractionMode(mode);
    setActiveHandle(handle || null);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setInitialTransform({ ...transform });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (showRulers && !isPreviewMode && containerRef.current) {
        if (cursorRafRef.current === null) {
          cursorRafRef.current = requestAnimationFrame(() => {
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              setCursorCoord({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }
            cursorRafRef.current = null;
          });
        }
      }

      if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        return;
      }

      if (interactionMode === 'none' || !containerRef.current) return;

      const canvasRect = mockupCanvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      if (interactionMode === 'drag') {
        const dx = e.clientX - dragStartPos.x;
        const dy = e.clientY - dragStartPos.y;
        const deltaXPercent = (dx / canvasRect.width) * 100;
        const deltaYPercent = (dy / canvasRect.height) * 100;
        onUpdateTransform({
          x: Math.max(5, Math.min(95, parseFloat((initialTransform.x + deltaXPercent).toFixed(1)))),
          y: Math.max(5, Math.min(95, parseFloat((initialTransform.y + deltaYPercent).toFixed(1))))
        });
      } else if (interactionMode === 'resize') {
        const centerX = canvasRect.left + (initialTransform.x / 100) * canvasRect.width;
        const centerY = canvasRect.top + (initialTransform.y / 100) * canvasRect.height;
        const initialDist = Math.hypot(dragStartPos.x - centerX, dragStartPos.y - centerY);
        const currentDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        if (initialDist > 10) {
          const scaleRatio = currentDist / initialDist;
          const newScale = Math.max(0.1, Math.min(2.5, initialTransform.scale * scaleRatio));
          onUpdateTransform({ scale: parseFloat(newScale.toFixed(2)) });
        }
      } else if (interactionMode === 'rotate') {
        const centerX = canvasRect.left + (transform.x / 100) * canvasRect.width;
        const centerY = canvasRect.top + (transform.y / 100) * canvasRect.height;
        const startAngle = Math.atan2(dragStartPos.y - centerY, dragStartPos.x - centerX);
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const deltaAngleDeg = ((currentAngle - startAngle) * 180) / Math.PI;
        let newRot = Math.round(initialTransform.rotation + deltaAngleDeg);
        while (newRot > 180) newRot -= 360;
        while (newRot < -180) newRot += 360;
        onUpdateTransform({ rotation: newRot });
      }
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      setInteractionMode('none');
      setActiveHandle(null);
      if (interactionMode === 'none') return;

      // Immediately trigger high-quality displacement composite
      if (settledRenderTimerRef.current !== null) {
        window.clearTimeout(settledRenderTimerRef.current);
      }
      settledRenderTimerRef.current = window.setTimeout(() => {
        renderCompositeMockup(PREVIEW_SUPERSAMPLE, false);
        settledRenderTimerRef.current = null;
      }, 50);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (cursorRafRef.current !== null) {
        cancelAnimationFrame(cursorRafRef.current);
        cursorRafRef.current = null;
      }
    };
  }, [isPanning, panStart, interactionMode, dragStartPos, initialTransform, zoom, transform, onUpdateTransform]);

  const containerCursor =
    isSpaceHeld || activeTool === 'hand'
      ? isPanning
        ? 'cursor-grabbing'
        : 'cursor-grab'
      : activeTool === 'zoom'
      ? zoomMode === 'out'
        ? 'cursor-zoom-out'
        : 'cursor-zoom-in'
      : 'cursor-default';

  return (
    <div className="flex-1 flex overflow-hidden bg-[#09090b]">
      {/* Central Mockup Viewport */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Pixel Ruler */}
        {showRulers && !isPreviewMode && (
          <div className="pl-4">
            <Ruler
              orientation="horizontal"
              length={containerSize.width}
              zoom={zoom}
              offset={containerSize.width / 2 + pan.x}
              cursorPos={cursorCoord.x}
            />
          </div>
        )}

        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Pixel Ruler */}
          {showRulers && !isPreviewMode && (
            <Ruler
              orientation="vertical"
              length={containerSize.height}
              zoom={zoom}
              offset={containerSize.height / 2 + pan.y}
              cursorPos={cursorCoord.y}
            />
          )}

          <div
            ref={containerRef}
            onMouseDown={handleContainerMouseDown}
            className={`flex-1 relative overflow-hidden flex items-center justify-center select-none bg-[#09090c] canvas-grid ${containerCursor}`}
          >
            {/* Canvas & Gizmo Wrapper */}
            <div
              className="relative shadow-2xl flex items-center justify-center pointer-events-none will-change-transform"
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                transformOrigin: 'center center'
              }}
            >
              <canvas
                ref={mockupCanvasRef}
                width={layoutWidth}
                height={layoutHeight}
                className="rounded-none shadow-2xl border border-white/10 max-w-none"
                style={{ width: `${layoutWidth}px`, height: `${layoutHeight}px` }}
              />

              {/* Interactive Bounding Box Gizmo (Hidden in Preview Mode) */}
              {!isPreviewMode && (
                <div
                  className={`absolute border-2 border-white/90 rounded-lg shadow-2xl transition-shadow ${
                    isSpaceHeld ? 'pointer-events-none' : 'pointer-events-auto'
                  } ${interactionMode === 'drag' ? 'border-white shadow-[0_0_25px_rgba(255,255,255,0.4)]' : 'hover:border-white'}`}
                  style={{
                    left: `${posX - boxW / 2}px`,
                    top: `${posY - boxH / 2}px`,
                    width: `${boxW}px`,
                    height: `${boxH}px`,
                    transform: `rotate(${transform.rotation}deg)`,
                    transformOrigin: 'center center',
                    cursor: interactionMode === 'drag' ? 'grabbing' : 'grab'
                  }}
                  onMouseDown={(e) => startDrag(e, 'drag')}
                >
                  {/* Center crosshair */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-2.5 h-2.5 rounded-full bg-white shadow-lg border border-black/40" />
                  </div>

                  {/* Top Rotation Stem & Handle */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div
                      onMouseDown={(e) => startDrag(e, 'rotate')}
                      className="w-7 h-7 rounded-full bg-white text-neutral-950 border-2 border-neutral-950 shadow-2xl cursor-grab flex items-center justify-center hover:scale-125 transition-transform active:cursor-grabbing pointer-events-auto"
                      title="Drag to Rotate embroidery"
                    >
                      <RotateCw size={13} className="text-neutral-950" />
                    </div>
                    <div className="w-[1.5px] h-3.5 bg-white/80 pointer-events-none" />
                  </div>

                  {/* Corner Resize Handles */}
                  <div
                    onMouseDown={(e) => startDrag(e, 'resize', 'nw')}
                    className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-neutral-950 rounded-md cursor-nwse-resize shadow-xl hover:scale-125 transition-transform pointer-events-auto"
                    title="Drag to Resize"
                  />
                  <div
                    onMouseDown={(e) => startDrag(e, 'resize', 'ne')}
                    className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-neutral-950 rounded-md cursor-nesw-resize shadow-xl hover:scale-125 transition-transform pointer-events-auto"
                    title="Drag to Resize"
                  />
                  <div
                    onMouseDown={(e) => startDrag(e, 'resize', 'sw')}
                    className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-neutral-950 rounded-md cursor-nesw-resize shadow-xl hover:scale-125 transition-transform pointer-events-auto"
                    title="Drag to Resize"
                  />
                  <div
                    onMouseDown={(e) => startDrag(e, 'resize', 'se')}
                    className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-neutral-950 rounded-md cursor-nwse-resize shadow-xl hover:scale-125 transition-transform pointer-events-auto"
                    title="Drag to Resize"
                  />

                  {/* Floating Transform Badge */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#121216]/95 border border-white/[0.1] rounded-full px-2.5 py-0.5 text-[10px] font-mono text-neutral-200 shadow-xl whitespace-nowrap pointer-events-none">
                    {Math.round(transform.scale * 100)}% • {Math.round(transform.rotation)}°
                  </div>
                </div>
              )}
            </div>

            {/* Floating Clean Preview Badge */}
            {isPreviewMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-2 bg-black/80 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 text-xs text-white shadow-2xl animate-in fade-in duration-200 pointer-events-auto">
                <Eye size={13} className="text-emerald-400" />
                <span className="font-semibold">Clean Preview Mode</span>
                <span className="text-neutral-500">•</span>
                <button
                  onClick={onTogglePreviewMode}
                  className="text-neutral-300 hover:text-white underline text-[11px]"
                >
                  Press W to Edit
                </button>
              </div>
            )}

            {/* Viewport Floating HUD */}
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute top-3 right-3 z-20 flex items-center bg-[#121216]/90 backdrop-blur-md border border-white/[0.08] rounded-lg p-1 space-x-1 shadow-xl pointer-events-auto"
            >
              <button
                onClick={() => onZoomChange(Math.max(0.1, parseFloat((zoom * 0.8).toFixed(2))))}
                className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={12} />
              </button>
              <span className="px-1.5 text-[11px] font-mono text-neutral-300 min-w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => onZoomChange(Math.min(4.0, parseFloat((zoom * 1.25).toFixed(2))))}
                className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={12} />
              </button>
              <div className="w-[1px] h-3.5 bg-white/[0.08] mx-0.5" />
              <button
                onClick={() => {
                  setPan({ x: 0, y: 0 });
                  onFitToScreen();
                }}
                className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
                title="Fit to Window (Ctrl+0)"
              >
                <Maximize2 size={12} />
              </button>
              <button
                onClick={onResetZoom}
                className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
                title="Reset View 100% (Ctrl+1)"
              >
                <RotateCcw size={12} />
              </button>
              <div className="w-[1px] h-3.5 bg-white/[0.08] mx-0.5" />
              <button
                onClick={onTogglePreviewMode}
                className={`p-1 rounded transition-colors ${
                  isPreviewMode ? 'bg-emerald-500/20 text-emerald-300' : 'text-neutral-400 hover:text-white'
                }`}
                title="Toggle Clean Preview Mode (W)"
              >
                {isPreviewMode ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>

            {/* Viewport Footer */}
            <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
              <div className="flex items-center space-x-3 bg-[#121216]/90 backdrop-blur-md border border-white/[0.08] rounded-full px-4 py-1.5 text-[11px] font-mono text-neutral-400 pointer-events-auto shadow-xl">
                <span className="text-neutral-200 font-semibold">{mockupTemplate.name}</span>
                <span className="text-neutral-700">•</span>
                <span>Position: ({Math.round(transform.x)}%, {Math.round(transform.y)}%)</span>
                <span className="text-neutral-700">•</span>
                <span>Scale: {Math.round(transform.scale * 100)}%</span>
                <span role="status">{renderStatus}</span>
                <span className="text-neutral-700">•</span>
                <span className="text-neutral-400">(Hold Space to Pan)</span>
              </div>

              <button
                onClick={onOpenExport}
                className="pro-btn flex items-center space-x-2 px-5 py-2.5 rounded-xl text-neutral-950 text-xs font-bold transition-all shadow-2xl pointer-events-auto"
              >
                <Download size={14} />
                <span>Export Listing Image</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Inspector Panel */}
      <div className="w-86 border-l border-white/[0.08] flex flex-col bg-[#0d0d11] shrink-0">
        <div className="p-3.5 border-b border-white/[0.08] flex items-center justify-between bg-[#121216]/40">
          <div className="flex items-center space-x-2">
            <Shirt size={13} className="text-neutral-400" />
            <span className="text-[11px] font-bold tracking-wider text-neutral-200 uppercase">
              Apparel Inspector
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5">
          <MockupControls
            currentMockup={mockupTemplate}
            transform={transform}
            templates={templates}
            onSelectMockup={onSelectMockup}
            onUpdateTransform={onUpdateTransform}
            onUploadCustomMockup={onUploadCustomMockup}
            onOpenMockupsFolder={onOpenMockupsFolder}
            onRefreshMockups={onRefreshMockups}
            isRefreshing={isRefreshingMockups}
            onSaveSettingsAsDefault={onSaveSettingsAsDefault}
            onResetSettings={onResetSettings}
            saveStatusText={saveStatusText}
          />
        </div>
      </div>
    </div>
  );
};
