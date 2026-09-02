import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EmbroiderySettings, SourceAsset, ToolType, HistoryStep } from '../types';
import { EmbroideryRenderer } from '../engine/embroideryRenderer';
import { DockPanel } from './Inspector/DockPanel';
import { Ruler } from './Controls/Ruler';
import {
  Shirt,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Columns,
  Grid,
  RotateCcw,
  Maximize2,
  Eye,
  EyeOff
} from 'lucide-react';

interface EmbroideryStudioProps {
  sourceAsset: SourceAsset;
  settings: EmbroiderySettings;
  onUpdateSettings: (updated: Partial<EmbroiderySettings>) => void;
  activeTool: ToolType;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  zoomMode: 'in' | 'out';
  showComparison: boolean;
  onToggleComparison: () => void;
  showCheckerboard: boolean;
  onToggleCheckerboard: () => void;
  showRulers: boolean;
  isPreviewMode?: boolean;
  onTogglePreviewMode?: () => void;
  onProceedToMockup: () => void;
  onTriggerSmartOptimize?: () => void;
  history: HistoryStep[];
  currentHistoryIndex: number;
  onRevertHistory: (index: number) => void;
}

export const EmbroideryStudio: React.FC<EmbroideryStudioProps> = ({
  sourceAsset,
  settings,
  onUpdateSettings,
  activeTool,
  zoom,
  onZoomChange,
  onResetZoom,
  onFitToScreen,
  zoomMode,
  showComparison,
  onToggleComparison,
  showCheckerboard,
  onToggleCheckerboard,
  showRulers,
  isPreviewMode = false,
  onTogglePreviewMode,
  onProceedToMockup,
  onTriggerSmartOptimize,
  history,
  currentHistoryIndex,
  onRevertHistory
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImgRef = useRef<HTMLImageElement | null>(null);
  const cachedEmbroideryCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<EmbroideryRenderer>(new EmbroideryRenderer());

  const [renderStats, setRenderStats] = useState<{ timeMs: number; width: number; height: number }>({
    timeMs: 0,
    width: 0,
    height: 0
  });

  const [isRendering, setIsRendering] = useState(false);
  const [splitPos, setSplitPos] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  // Pan & Hold Space State
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [cursorCoord, setCursorCoord] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 800, height: 600 });

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

  // Fast GPU Blit Compositor
  const drawCompositeFrame = useCallback(() => {
    if (!canvasRef.current || !sourceImgRef.current || !cachedEmbroideryCanvasRef.current) return;

    const embCanvas = cachedEmbroideryCanvasRef.current;
    const targetCanvas = canvasRef.current;
    if (targetCanvas.width !== embCanvas.width || targetCanvas.height !== embCanvas.height) {
      targetCanvas.width = embCanvas.width;
      targetCanvas.height = embCanvas.height;
    }

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

    if (showComparison && !isPreviewMode) {
      const splitX = (splitPos / 100) * targetCanvas.width;

      // Source on left
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, targetCanvas.height);
      ctx.clip();
      ctx.drawImage(sourceImgRef.current, 0, 0, targetCanvas.width, targetCanvas.height);
      ctx.restore();

      // 3D embroidery on right
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, targetCanvas.width - splitX, targetCanvas.height);
      ctx.clip();
      ctx.drawImage(embCanvas, 0, 0);
      ctx.restore();

      // High-contrast Divider Line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, targetCanvas.height);
      ctx.stroke();
    } else {
      ctx.drawImage(embCanvas, 0, 0);
    }
  }, [showComparison, splitPos, isPreviewMode]);

  // Compute 3D Simulation ONLY when settings change
  const recomputeEmbroideryEffect = useCallback(() => {
    if (!sourceImgRef.current) return;
    setIsRendering(true);

    requestAnimationFrame(() => {
      if (!sourceImgRef.current) return;
      const result = rendererRef.current.renderEmbroidery(sourceImgRef.current, settings, 1);
      cachedEmbroideryCanvasRef.current = result.canvas;

      setRenderStats({
        timeMs: Math.round(result.renderTimeMs),
        width: result.width,
        height: result.height
      });
      setIsRendering(false);
      drawCompositeFrame();
    });
  }, [settings, drawCompositeFrame]);

  // Load Source Image & Auto-Fit
  useEffect(() => {
    if (!sourceAsset.dataUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      sourceImgRef.current = img;

      if (containerRef.current) {
        const availableW = containerRef.current.clientWidth - 80;
        const availableH = containerRef.current.clientHeight - 80;
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;

        if (imgW > availableW || imgH > availableH) {
          const fitRatio = Math.min(availableW / imgW, availableH / imgH, 1.0);
          onZoomChange(parseFloat(fitRatio.toFixed(2)));
        }
      }

      recomputeEmbroideryEffect();
    };
    img.src = sourceAsset.dataUrl;
  }, [sourceAsset.dataUrl, recomputeEmbroideryEffect, onZoomChange]);

  useEffect(() => {
    recomputeEmbroideryEffect();
  }, [settings, recomputeEmbroideryEffect]);

  useEffect(() => {
    drawCompositeFrame();
  }, [splitPos, showComparison, isPreviewMode, drawCompositeFrame]);

  // Smooth Mouse Wheel Zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(0.05, Math.min(5.0, zoom * zoomFactor));
    onZoomChange(parseFloat(newZoom.toFixed(3)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isSpaceHeld || activeTool === 'hand' || e.button === 1) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (activeTool === 'zoom') {
      const isZoomOut = zoomMode === 'out' || e.altKey || e.button === 2;
      if (isZoomOut) {
        onZoomChange(Math.max(0.05, parseFloat((zoom * 0.75).toFixed(2))));
      } else {
        onZoomChange(Math.min(5.0, parseFloat((zoom * 1.3).toFixed(2))));
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCursorCoord({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    if (isPanning) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else if (isDraggingSplit && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const percentage = Math.max(5, Math.min(95, (relativeX / rect.width) * 100));
      setSplitPos(percentage);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingSplit(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDraggingSplit(false);
    };
    if (isDraggingSplit) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDraggingSplit]);

  const cursorClass =
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
      {/* Central Viewport with Optional Rulers */}
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

          {/* Viewport Canvas Area */}
          <div
            ref={containerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={(e) => {
              if (activeTool === 'zoom') {
                e.preventDefault();
              }
            }}
            className={`flex-1 relative overflow-hidden flex items-center justify-center select-none ${cursorClass} ${
              showCheckerboard ? 'canvas-checkerboard' : 'bg-[#0a0a0d] canvas-grid'
            }`}
          >
            {/* Canvas Render Container */}
            <div
              className="relative transition-transform duration-75 shadow-2xl flex items-center justify-center pointer-events-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center'
              }}
            >
              <canvas
                ref={canvasRef}
                className="max-w-none rounded-lg shadow-2xl"
                style={{ imageRendering: 'auto' }}
              />

              {/* Split Slider Handle */}
              {showComparison && !isPreviewMode && (
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDraggingSplit(true);
                  }}
                  className="absolute top-0 bottom-0 cursor-ew-resize z-20 flex items-center justify-center pointer-events-auto"
                  style={{ left: `${splitPos}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="w-7 h-7 rounded-full bg-white text-neutral-950 shadow-2xl border-2 border-neutral-900 flex items-center justify-center text-[10px] font-bold hover:scale-110 transition-transform">
                    ↔
                  </div>
                </div>
              )}
            </div>

            {/* Floating Top Left Split View Tag */}
            {showComparison && !isPreviewMode && (
              <div className="absolute top-3 left-3 z-20 flex items-center space-x-2 bg-[#121216]/90 backdrop-blur-md border border-white/[0.08] rounded-full px-3 py-1 text-[11px] text-neutral-300 font-mono shadow-xl">
                <span className="text-neutral-400">Flat Artwork</span>
                <span className="text-neutral-600">•</span>
                <span className="text-white font-semibold">3D Simulation</span>
              </div>
            )}

            {/* Viewport Floating HUD Pill */}
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute top-3 right-3 z-20 flex items-center bg-[#121216]/90 backdrop-blur-md border border-white/[0.08] rounded-lg p-1 space-x-1 shadow-xl pointer-events-auto"
            >
              <button
                onClick={() => onZoomChange(Math.max(0.05, parseFloat((zoom * 0.8).toFixed(2))))}
                className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={12} />
              </button>
              <span className="px-1.5 text-[11px] font-mono text-neutral-300 min-w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => onZoomChange(Math.min(5.0, parseFloat((zoom * 1.25).toFixed(2))))}
                className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={12} />
              </button>
              <div className="w-[1px] h-3.5 bg-white/[0.08] mx-0.5" />
              <button
                onClick={onFitToScreen}
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
                onClick={onToggleComparison}
                className={`p-1 rounded transition-colors ${
                  showComparison ? 'bg-[#27272f] text-white' : 'text-neutral-400 hover:text-white'
                }`}
                title="Split Comparison"
              >
                <Columns size={12} />
              </button>
              <button
                onClick={onToggleCheckerboard}
                className={`p-1 rounded transition-colors ${
                  showCheckerboard ? 'bg-[#27272f] text-white' : 'text-neutral-400 hover:text-white'
                }`}
                title="Transparency Grid"
              >
                <Grid size={12} />
              </button>
              {onTogglePreviewMode && (
                <button
                  onClick={onTogglePreviewMode}
                  className={`p-1 rounded transition-colors ${
                    isPreviewMode ? 'bg-emerald-500/20 text-emerald-300' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Toggle Clean Preview (W)"
                >
                  {isPreviewMode ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              )}
            </div>

            {/* Bottom Status & Apparel Shortcut Bar */}
            <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
              <div className="flex items-center space-x-3 bg-[#121216]/90 backdrop-blur-md border border-white/[0.08] rounded-full px-4 py-1.5 text-[11px] font-mono text-neutral-400 pointer-events-auto shadow-xl">
                <span className="text-neutral-200 font-semibold">
                  {renderStats.width} × {renderStats.height} px
                </span>
                <span className="text-neutral-700">•</span>
                <span>Compute: {renderStats.timeMs}ms</span>
                <span className="text-neutral-700">•</span>
                <span>Zoom: {Math.round(zoom * 100)}%</span>
                <span className="text-neutral-700">•</span>
                <span className="text-neutral-400">(Hold Space to Pan)</span>
              </div>

              <button
                onClick={onProceedToMockup}
                className="pro-btn flex items-center space-x-2 px-5 py-2.5 rounded-xl text-neutral-950 text-xs font-bold transition-all shadow-2xl pointer-events-auto"
              >
                <Shirt size={14} />
                <span>Place on Apparel Mockup</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Dock Panel */}
      <DockPanel
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        isRendering={isRendering}
        history={history}
        currentHistoryIndex={currentHistoryIndex}
        onRevertHistory={onRevertHistory}
        onTriggerSmartOptimize={onTriggerSmartOptimize}
      />
    </div>
  );
};
