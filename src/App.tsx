import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AppScreen,
  ToolType,
  SourceAsset,
  EmbroiderySettings,
  MockupTemplate,
  MockupTransform,
  HistoryStep
} from './types';
import { DEFAULT_EMBROIDERY_SETTINGS, EMBROIDERY_PRESETS } from './engine/presets';
import { loadSourceImage } from './engine/sourceImages';
import { MOCKUP_TEMPLATES } from './engine/mockupRenderer';
import { SmartOptimizer, SmartAnalysisResult } from './engine/smartOptimizer';
import { MenuBar } from './components/MenuBar';
import { Header } from './components/Header';
import { OptionsBar } from './components/OptionsBar';
import { Toolbox } from './components/Toolbox';
import { CreateScreen } from './components/CreateScreen';
import { EmbroideryStudio } from './components/EmbroideryStudio';
import { MockupStudio } from './components/MockupStudio';
import { ExportModal } from './components/ExportModal';
import { SmartAnalysisModal } from './components/SmartAnalysisModal';

export const App: React.FC = () => {
  // Navigation & Tool State
  const [activeScreen, setActiveScreen] = useState<AppScreen>('create');
  const [activeTool, setActiveTool] = useState<ToolType>('hand');
  const [zoomMode, setZoomMode] = useState<'in' | 'out'>('in');

  // Source Asset State (Starts clean and empty)
  const [sourceAsset, setSourceAsset] = useState<SourceAsset | null>(null);

  // Embroidery Engine Settings
  const [settings, setSettings] = useState<EmbroiderySettings>(DEFAULT_EMBROIDERY_SETTINGS);

  // Mockup Template & Placement State
  const [mockupTemplate, setMockupTemplate] = useState<MockupTemplate>(MOCKUP_TEMPLATES[0]);
  const [transform, setTransform] = useState<MockupTransform>(MOCKUP_TEMPLATES[0].defaultTransform);

  // Viewport Settings
  const [zoom, setZoom] = useState<number>(1.0);
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [showCheckerboard, setShowCheckerboard] = useState<boolean>(true);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  // Modal States
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isSmartModalOpen, setIsSmartModalOpen] = useState<boolean>(false);
  const [smartAnalysisResult, setSmartAnalysisResult] = useState<SmartAnalysisResult | null>(null);

  // History Stack
  const [history, setHistory] = useState<HistoryStep[]>([
    {
      description: 'Initial Setup',
      settings: DEFAULT_EMBROIDERY_SETTINGS,
      transform: MOCKUP_TEMPLATES[0].defaultTransform,
      timestamp: Date.now()
    }
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // DOM Images Cache
  const [sourceImageElement, setSourceImageElement] = useState<HTMLImageElement | null>(null);
  const [mockupImageElement, setMockupImageElement] = useState<HTMLImageElement | null>(null);

  const smartOptimizerRef = useRef(new SmartOptimizer());

  // Sync Source Image Element
  useEffect(() => {
    if (!sourceAsset?.dataUrl) {
      setSourceImageElement(null);
      return;
    }
    let cancelled = false;
    setSourceImageElement(null);
    void loadSourceImage(sourceAsset.dataUrl).then(img => { if (!cancelled) setSourceImageElement(img); })
      .catch(() => { if (!cancelled) setSourceImageElement(null); });
    return () => { cancelled = true; };
  }, [sourceAsset?.dataUrl]);

  // Sync Mockup Image Element
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setMockupImageElement(img);
    img.src = mockupTemplate.imageUrl;
  }, [mockupTemplate.imageUrl]);

  const handleFitToScreen = useCallback(() => {
    if (activeScreen === 'mockup') {
      setZoom(Math.min((window.innerWidth - 420) / 1200, (window.innerHeight - 180) / 1200, 1));
      return;
    }
    if (sourceAsset?.width && sourceAsset?.height) {
      const availableW = window.innerWidth - 420;
      const availableH = window.innerHeight - 150;
      const fitRatio = Math.min(availableW / sourceAsset.width, availableH / sourceAsset.height, 1.0);
      setZoom(Math.max(0.05, parseFloat(fitRatio.toFixed(2))));
    } else {
      setZoom(1.0);
    }
  }, [activeScreen, sourceAsset?.width, sourceAsset?.height]);

  useEffect(() => {
    if (activeScreen === 'mockup') setZoom(Math.max(.1, Math.min((window.innerWidth - 420) / 1200, (window.innerHeight - 180) / 1200, 1)));
  }, [activeScreen]);

  // Trigger Smart Analysis & Optimization
  const handleTriggerSmartOptimize = useCallback(() => {
    if (!sourceImageElement) return;
    const analysis = smartOptimizerRef.current.analyzeAndOptimize(sourceImageElement, settings);
    setSmartAnalysisResult(analysis);
    setIsSmartModalOpen(true);
  }, [sourceImageElement, settings]);

  const handleApplySmartOptimization = useCallback(() => {
    if (!smartAnalysisResult) return;
    setSettings(smartAnalysisResult.optimizedSettings);
  }, [smartAnalysisResult]);

  // Update Settings Partial
  const handleUpdateSettings = (updated: Partial<EmbroiderySettings>) => {
    setSettings((prev) => ({ ...prev, ...updated }));
  };

  // Update Mockup Transform Partial
  const handleUpdateTransform = (updated: Partial<MockupTransform>) => {
    setTransform((prev) => ({ ...prev, ...updated }));
  };

  // Switch Mockup Template
  const handleSelectMockup = (template: MockupTemplate) => {
    setMockupTemplate(template);
    setTransform({ ...template.defaultTransform });
  };

  const handleSelectMockupCategory = (category: 'shirt' | 'sweatshirt' | 'hat' | 'tote') => {
    const matched = MOCKUP_TEMPLATES.find((m) => m.category === category);
    if (matched) {
      handleSelectMockup(matched);
    }
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = EMBROIDERY_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      handleUpdateSettings(preset.settings);
    }
  };

  // Safe Navigation Handler
  const handleNavigate = (screen: AppScreen) => {
    if (screen !== 'create' && !sourceAsset?.dataUrl) {
      setActiveScreen('create');
      return;
    }
    setActiveScreen(screen);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevStep = history[historyIndex - 1];
      setSettings(prevStep.settings);
      setTransform(prevStep.transform);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextStep = history[historyIndex + 1];
      setSettings(nextStep.settings);
      setTransform(nextStep.transform);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleRevertHistory = (index: number) => {
    if (index >= 0 && index < history.length) {
      const step = history[index];
      setSettings(step.settings);
      setTransform(step.transform);
      setHistoryIndex(index);
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        setIsExportOpen(true);
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        handleFitToScreen();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        setZoom(1.0);
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        setShowRulers((r) => !r);
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        setShowCheckerboard((c) => !c);
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'w' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h')) {
        setIsPreviewMode((p) => !p);
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'h') {
        setActiveTool('hand');
      } else if (e.key.toLowerCase() === 'z') {
        setActiveTool('zoom');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, handleFitToScreen]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#09090b] text-[#f4f4f5] overflow-hidden select-none font-sans">
      {/* 1. Adobe Application Menu Bar */}
      <MenuBar
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        onOpenUpload={() => setActiveScreen('create')}
        onOpenExport={() => setIsExportOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onResetSettings={() => setSettings(DEFAULT_EMBROIDERY_SETTINGS)}
        zoom={zoom}
        onZoomChange={setZoom}
        onResetZoom={() => setZoom(1.0)}
        showComparison={showComparison}
        onToggleComparison={() => setShowComparison((prev) => !prev)}
        showCheckerboard={showCheckerboard}
        onToggleCheckerboard={() => setShowCheckerboard((prev) => !prev)}
        showRulers={showRulers}
        onToggleRulers={() => setShowRulers((prev) => !prev)}
        onApplyPreset={handleApplyPreset}
        onSelectMockupCategory={handleSelectMockupCategory}
      />

      {/* 2. Studio Header Bar */}
      <Header
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        zoom={zoom}
        onZoomChange={setZoom}
        onResetZoom={() => setZoom(1.0)}
        showComparison={showComparison}
        onToggleComparison={() => setShowComparison((prev) => !prev)}
        showCheckerboard={showCheckerboard}
        onToggleCheckerboard={() => setShowCheckerboard((prev) => !prev)}
        isPreviewMode={isPreviewMode}
        onTogglePreviewMode={() => setIsPreviewMode((p) => !p)}
        onOpenExport={() => setIsExportOpen(true)}
        onTriggerSmartOptimize={handleTriggerSmartOptimize}
        sourceName={sourceAsset ? sourceAsset.name : 'No Document Open'}
      />

      {/* 3. Contextual Tool Options Bar */}
      {!isPreviewMode && activeScreen !== 'create' && (
        <OptionsBar
          activeTool={activeTool}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          zoom={zoom}
          onZoomChange={setZoom}
          onResetZoom={() => setZoom(1.0)}
          onFitToScreen={handleFitToScreen}
          zoomMode={zoomMode}
          onSetZoomMode={setZoomMode}
        />
      )}

      {/* 4. Main Studio Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Simplified Tool Palette (Hand & Zoom Only) */}
        {!isPreviewMode && activeScreen !== 'create' && (
          <Toolbox
            activeTool={activeTool}
            onSelectTool={setActiveTool}
          />
        )}

        {/* Viewport Content */}
        <main className="flex-1 flex overflow-hidden relative">
          {activeScreen === 'create' && (
            <CreateScreen
              currentAsset={sourceAsset}
              onSelectAsset={(asset) => {
                setSourceAsset(asset);
              }}
              onProceedToEmbroidery={() => {
                setActiveScreen('embroidery');
                handleFitToScreen();
              }}
            />
          )}

          {activeScreen === 'embroidery' && sourceAsset && (
            <EmbroideryStudio
              sourceAsset={sourceAsset}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              activeTool={activeTool}
              zoom={zoom}
              onZoomChange={setZoom}
              onResetZoom={() => setZoom(1.0)}
              onFitToScreen={handleFitToScreen}
              zoomMode={zoomMode}
              showComparison={showComparison}
              onToggleComparison={() => setShowComparison((prev) => !prev)}
              showCheckerboard={showCheckerboard}
              onToggleCheckerboard={() => setShowCheckerboard((prev) => !prev)}
              showRulers={showRulers}
              isPreviewMode={isPreviewMode}
              onTogglePreviewMode={() => setIsPreviewMode((p) => !p)}
              onProceedToMockup={() => setActiveScreen('mockup')}
              onTriggerSmartOptimize={handleTriggerSmartOptimize}
              history={history}
              currentHistoryIndex={historyIndex}
              onRevertHistory={handleRevertHistory}
            />
          )}

          {activeScreen === 'mockup' && sourceAsset && (
            <MockupStudio
              sourceAsset={sourceAsset}
              settings={settings}
              mockupTemplate={mockupTemplate}
              transform={transform}
              onSelectMockup={handleSelectMockup}
              onUpdateTransform={handleUpdateTransform}
              onUploadCustomMockup={(customTpl) => {
                setMockupTemplate(customTpl);
                setTransform({ ...customTpl.defaultTransform });
              }}
              activeTool={activeTool}
              zoom={zoom}
              onZoomChange={setZoom}
              onResetZoom={() => setZoom(1.0)}
              onFitToScreen={handleFitToScreen}
              showRulers={showRulers}
              isPreviewMode={isPreviewMode}
              onTogglePreviewMode={() => setIsPreviewMode((p) => !p)}
              onOpenExport={() => setIsExportOpen(true)}
            />
          )}
        </main>
      </div>

      {/* High-Resolution Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        sourceImage={sourceImageElement}
        mockupTemplate={mockupTemplate}
        mockupImage={mockupImageElement}
        settings={settings}
        transform={transform}
        activeScreen={activeScreen}
      />

      {/* Smart Analysis Diagnostic Modal */}
      <SmartAnalysisModal
        isOpen={isSmartModalOpen}
        onClose={() => setIsSmartModalOpen(false)}
        result={smartAnalysisResult}
        onApply={handleApplySmartOptimization}
      />
    </div>
  );
};

export default App;
