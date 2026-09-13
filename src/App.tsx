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
import { LicenseModal } from './components/LicenseModal';
import { AboutModal } from './components/AboutModal';
import { checkAccessStatus, AccessStatus } from './engine/licenseEngine';
import {
  fetchDiskMockupFiles,
  openMockupsFolder,
  syncMockupTemplatesWithDisk
} from './engine/mockupLoader';
import {
  loadSavedSettings,
  saveUserSettings,
  savePartialUserSettings,
  resetUserSettings
} from './engine/settingsStorage';

export const App: React.FC = () => {
  // Retained settings from previous user sessions
  const savedSettingsRef = useRef(loadSavedSettings());
  const initialSaved = savedSettingsRef.current;

  // Navigation & Tool State
  const [activeScreen, setActiveScreen] = useState<AppScreen>('create');
  const [activeTool, setActiveTool] = useState<ToolType>('hand');
  const [zoomMode, setZoomMode] = useState<'in' | 'out'>('in');

  // Source Asset State (Starts clean and empty)
  const [sourceAsset, setSourceAsset] = useState<SourceAsset | null>(null);

  // Embroidery Engine Settings (Retained)
  const [settings, setSettings] = useState<EmbroiderySettings>(initialSaved.settings);

  // Mockup Template & Placement State (Retained)
  const [mockupTemplates, setMockupTemplates] = useState<MockupTemplate[]>(MOCKUP_TEMPLATES);
  const matchedInitialMockup =
    MOCKUP_TEMPLATES.find((m) => m.id === initialSaved.selectedMockupId) || MOCKUP_TEMPLATES[0];
  const [mockupTemplate, setMockupTemplate] = useState<MockupTemplate>(matchedInitialMockup);
  const [transform, setTransform] = useState<MockupTransform>(initialSaved.transform);
  const [isRefreshingMockups, setIsRefreshingMockups] = useState<boolean>(false);

  // Viewport Settings (Retained)
  const [zoom, setZoom] = useState<number>(1.0);
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [showCheckerboard, setShowCheckerboard] = useState<boolean>(
    initialSaved.viewport?.showCheckerboard ?? true
  );
  const [showRulers, setShowRulers] = useState<boolean>(
    initialSaved.viewport?.showRulers ?? true
  );
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [saveStatusText, setSaveStatusText] = useState<string>('');

  // Modal States
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [exportIncludeMockup, setExportIncludeMockup] = useState<boolean>(false);
  const [isSmartModalOpen, setIsSmartModalOpen] = useState<boolean>(false);
  const [smartAnalysisResult, setSmartAnalysisResult] = useState<SmartAnalysisResult | null>(null);
  const [isSmartOptimizing, setIsSmartOptimizing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // License & 14-Day Free Trial State
  const [accessStatus, setAccessStatus] = useState<AccessStatus>(checkAccessStatus);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);

  // History Stack
  const [history, setHistory] = useState<HistoryStep[]>([
    {
      description: 'Initial Setup',
      settings: initialSaved.settings,
      transform: initialSaved.transform,
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
      const nw = mockupImageElement?.naturalWidth || mockupTemplate.width || 1200;
      const nh = mockupImageElement?.naturalHeight || mockupTemplate.height || 1200;
      const availableW = window.innerWidth - 420;
      const availableH = window.innerHeight - 180;
      const fitRatio = Math.min(availableW / nw, availableH / nh, 1.0);
      setZoom(Math.max(0.05, parseFloat(fitRatio.toFixed(2))));
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
  }, [activeScreen, mockupImageElement?.naturalWidth, mockupImageElement?.naturalHeight, mockupTemplate.width, mockupTemplate.height, sourceAsset?.width, sourceAsset?.height]);

  // Only trigger automatic fit when navigating to a new screen (never reset zoom during polling)
  const prevScreenRef = useRef<AppScreen>(activeScreen);
  useEffect(() => {
    if (prevScreenRef.current !== activeScreen) {
      prevScreenRef.current = activeScreen;
      if (activeScreen === 'mockup' || activeScreen === 'embroidery') {
        handleFitToScreen();
      }
    }
  }, [activeScreen, handleFitToScreen]);

  // Check 14-day trial & Gumroad license status on launch and continuously in real time
  useEffect(() => {
    const updateAccess = () => {
      const status = checkAccessStatus();
      setAccessStatus(status);
      if (status.isLocked) {
        setIsLicenseModalOpen(true);
      }
    };

    updateAccess();

    // Check periodically in real time (every 30 seconds)
    const interval = setInterval(updateAccess, 30000);

    // Re-check whenever window regains focus
    window.addEventListener('focus', updateAccess);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', updateAccess);
    };
  }, []);

  // Trigger Smart Analysis & Optimization
  const handleTriggerSmartOptimize = useCallback(() => {
    if (accessStatus.isLocked) {
      setIsLicenseModalOpen(true);
      return;
    }
    if (!sourceImageElement) return;
    const analysis = smartOptimizerRef.current.analyzeAndOptimize(sourceImageElement, settings);
    setSmartAnalysisResult(analysis);
    setIsSmartModalOpen(true);
  }, [sourceImageElement, settings, accessStatus.isLocked]);

  const handleApplySmartOptimization = useCallback(() => {
    if (accessStatus.isLocked) {
      setIsLicenseModalOpen(true);
      return;
    }
    if (!smartAnalysisResult) return;
    setIsSmartOptimizing(true);
    setSettings(smartAnalysisResult.optimizedSettings);
  }, [smartAnalysisResult, accessStatus.isLocked]);

  const handleSmartOptimizeComplete = useCallback(() => {
    setIsSmartOptimizing(false);
  }, []);

  // Update Settings Partial
  const handleUpdateSettings = (updated: Partial<EmbroiderySettings>) => {
    setSettings((prev) => ({ ...prev, ...updated }));
  };

  // Update Mockup Transform Partial
  const handleUpdateTransform = (updated: Partial<MockupTransform>) => {
    setTransform((prev) => ({ ...prev, ...updated }));
  };

  // If Electron has a disk file with newer saved settings, reconcile on startup
  useEffect(() => {
    if (window.electronAPI?.loadUserSettings) {
      window.electronAPI.loadUserSettings().then((fileData: any) => {
        if (fileData && fileData.lastSavedAt && fileData.lastSavedAt > initialSaved.lastSavedAt) {
          if (fileData.settings) setSettings(fileData.settings);
          if (fileData.transform) setTransform(fileData.transform);
          if (fileData.viewport) {
            if (typeof fileData.viewport.showCheckerboard === 'boolean') {
              setShowCheckerboard(fileData.viewport.showCheckerboard);
            }
            if (typeof fileData.viewport.showRulers === 'boolean') {
              setShowRulers(fileData.viewport.showRulers);
            }
          }
        }
      }).catch(() => {});
    }
  }, []);

  const handleSaveSettingsAsDefault = useCallback((target: 'all' | 'embroidery' | 'mockup' = 'all') => {
    let status = 'Settings Saved as Default';
    if (target === 'embroidery') {
      const saved = savePartialUserSettings({ settings });
      savedSettingsRef.current = {
        ...savedSettingsRef.current,
        settings: saved.settings,
        hasSavedSettings: true,
        lastSavedAt: saved.lastSavedAt
      };
      status = 'Embroidery Defaults Saved';
    } else if (target === 'mockup') {
      const saved = savePartialUserSettings({ transform, selectedMockupId: mockupTemplate.id });
      savedSettingsRef.current = {
        ...savedSettingsRef.current,
        transform: saved.transform,
        selectedMockupId: saved.selectedMockupId,
        hasSavedSettings: true,
        lastSavedAt: saved.lastSavedAt
      };
      status = 'Mockup Defaults Saved';
    } else {
      const saved = saveUserSettings(settings, transform, mockupTemplate.id, {
        showCheckerboard,
        showRulers
      });
      savedSettingsRef.current = {
        settings: saved.settings,
        transform: saved.transform,
        selectedMockupId: saved.selectedMockupId,
        viewport: saved.viewport,
        hasSavedSettings: true,
        lastSavedAt: saved.lastSavedAt
      };
      status = 'All Settings Saved as Default';
    }
    setSaveStatusText(status);
    setTimeout(() => setSaveStatusText(''), 2500);
  }, [settings, transform, mockupTemplate.id, showCheckerboard, showRulers]);

  const handleResetSettingsToDefault = useCallback(() => {
    resetUserSettings();
    savedSettingsRef.current.hasSavedSettings = false;
    setSettings(DEFAULT_EMBROIDERY_SETTINGS);
    setTransform(mockupTemplate.defaultTransform);
    setSaveStatusText('Reset to Defaults');
    setTimeout(() => setSaveStatusText(''), 2500);
  }, [mockupTemplate.defaultTransform]);

  // Switch Mockup Template
  const handleSelectMockup = (template: MockupTemplate) => {
    setMockupTemplate(template);

    // If switching to the explicitly saved mockup, restore the exact saved transform!
    if (savedSettingsRef.current.hasSavedSettings && savedSettingsRef.current.selectedMockupId === template.id) {
      setTransform({ ...savedSettingsRef.current.transform });
    } else {
      // For other mockups, preserve user's custom wrap, grain, shadow, blend mode, and scale
      // instead of resetting them to factory defaults!
      setTransform((prev) => ({
        ...template.defaultTransform,
        scale: prev.scale ?? template.defaultTransform.scale,
        rotation: prev.rotation ?? template.defaultTransform.rotation,
        opacity: prev.opacity ?? template.defaultTransform.opacity,
        blendMode: prev.blendMode ?? template.defaultTransform.blendMode,
        displacementStrength: prev.displacementStrength ?? template.defaultTransform.displacementStrength,
        fabricTextureStrength: prev.fabricTextureStrength ?? template.defaultTransform.fabricTextureStrength,
        creviceShadowStrength: prev.creviceShadowStrength ?? template.defaultTransform.creviceShadowStrength,
        shadowIntensity: prev.shadowIntensity ?? template.defaultTransform.shadowIntensity,
      }));
    }

    const nw = template.width || 1200;
    const nh = template.height || 1200;
    const availableW = window.innerWidth - 420;
    const availableH = window.innerHeight - 180;
    const fitRatio = Math.min(availableW / nw, availableH / nh, 1.0);
    setZoom(Math.max(0.05, parseFloat(fitRatio.toFixed(2))));
  };

  // Add custom uploaded mockup to templates and select it
  const handleUploadCustomMockup = useCallback((customTpl: MockupTemplate) => {
    const tplWithFlag: MockupTemplate = { ...customTpl, isCustom: true };
    setMockupTemplates((prev) => [tplWithFlag, ...prev.filter((t) => t.id !== tplWithFlag.id)]);
    setMockupTemplate(tplWithFlag);
    setTransform((prev) => ({
      ...tplWithFlag.defaultTransform,
      scale: prev.scale ?? tplWithFlag.defaultTransform.scale,
      rotation: prev.rotation ?? tplWithFlag.defaultTransform.rotation,
      opacity: prev.opacity ?? tplWithFlag.defaultTransform.opacity,
      blendMode: prev.blendMode ?? tplWithFlag.defaultTransform.blendMode,
      displacementStrength: prev.displacementStrength ?? tplWithFlag.defaultTransform.displacementStrength,
      fabricTextureStrength: prev.fabricTextureStrength ?? tplWithFlag.defaultTransform.fabricTextureStrength,
      creviceShadowStrength: prev.creviceShadowStrength ?? tplWithFlag.defaultTransform.creviceShadowStrength,
      shadowIntensity: prev.shadowIntensity ?? tplWithFlag.defaultTransform.shadowIntensity,
    }));
    const nw = customTpl.width || 1200;
    const nh = customTpl.height || 1200;
    const availableW = window.innerWidth - 420;
    const availableH = window.innerHeight - 180;
    const fitRatio = Math.min(availableW / nw, availableH / nh, 1.0);
    setZoom(Math.max(0.05, parseFloat(fitRatio.toFixed(2))));
  }, []);

  // Sync mockups with public/mockups folder
  const syncMockups = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshingMockups(true);
    try {
      const diskFiles = await fetchDiskMockupFiles();
      if (diskFiles && diskFiles.length > 0) {
        setMockupTemplates((prev) => {
          void syncMockupTemplatesWithDisk(prev, diskFiles).then((updated) => {
            setMockupTemplates(updated);
            setMockupTemplate((curr) => {
              const matched = updated.find((t) => t.id === curr.id || (t.filename && t.filename === curr.filename));
              if (!matched) return curr;
              if (
                matched.imageUrl === curr.imageUrl &&
                matched.width === curr.width &&
                matched.height === curr.height &&
                matched.name === curr.name
              ) {
                return curr;
              }
              return matched;
            });
          });
          return prev;
        });
      }
    } catch (err) {
      console.warn('Mockups folder sync error:', err);
    } finally {
      if (showSpinner) {
        setTimeout(() => setIsRefreshingMockups(false), 350);
      }
    }
  }, []);

  // Set up listeners for folder additions & live changes
  useEffect(() => {
    // Initial folder scan
    void syncMockups();

    // 1. Native Electron IPC mockups-changed listener
    let unsubscribeElectron: (() => void) | undefined;
    if (window.electronAPI?.onMockupsChanged) {
      unsubscribeElectron = window.electronAPI.onMockupsChanged(() => {
        void syncMockups();
      });
    }

    // 2. Vite HMR event listener
    if (import.meta.hot) {
      import.meta.hot.on('mockups-folder-changed', () => {
        void syncMockups();
      });
    }

    // 3. Window focus event (e.g. user pasted file in Windows Explorer and switched back to app)
    const handleFocus = () => {
      void syncMockups();
    };
    window.addEventListener('focus', handleFocus);

    // 4. Lightweight polling fallback every 3.5 seconds
    const interval = setInterval(() => {
      void syncMockups();
    }, 3500);

    return () => {
      if (unsubscribeElectron) unsubscribeElectron();
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [syncMockups]);

  const handleSelectMockupCategory = (category: string) => {
    const matched = mockupTemplates.find((m) => m.category === category);
    if (matched) {
      handleSelectMockup(matched);
    }
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = EMBROIDERY_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      handleUpdateSettings({ ...preset.settings, presetId: preset.id });
      if (sourceAsset && activeScreen === 'create') {
        setActiveScreen('embroidery');
      }
    }
  };

  const activePresetId = settings.presetId;

  const handleNewProject = () => {
    if (accessStatus.isLocked) {
      setIsLicenseModalOpen(true);
      return;
    }
    setSourceAsset(null);
    setActiveScreen('create');
  };

  const handleOpenImportDialog = () => {
    if (accessStatus.isLocked) {
      setIsLicenseModalOpen(true);
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (accessStatus.isLocked) {
      setIsLicenseModalOpen(true);
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const asset: SourceAsset = {
          id: `imported_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          dataUrl,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          type: 'image'
        };
        setSourceAsset(asset);
        setActiveScreen('embroidery');
        handleFitToScreen();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleOpenExport = (mode?: 'standalone' | 'mockup') => {
    if (accessStatus.isLocked) {
      setIsLicenseModalOpen(true);
      return;
    }
    if (mode === 'mockup') {
      setExportIncludeMockup(true);
      if (sourceAsset) setActiveScreen('mockup');
    } else if (mode === 'standalone') {
      setExportIncludeMockup(false);
    } else {
      setExportIncludeMockup(activeScreen === 'mockup');
    }
    setIsExportOpen(true);
  };

  // Safe Navigation Handler
  const handleNavigate = (screen: AppScreen) => {
    if (accessStatus.isLocked) {
      setIsLicenseModalOpen(true);
      return;
    }
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
      if (accessStatus.isLocked) {
        return;
      }
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        handleNewProject();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        handleOpenImportDialog();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        if (sourceAsset) handleOpenExport('mockup');
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        if (sourceAsset) handleOpenExport('standalone');
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        handleSaveSettingsAsDefault();
        e.preventDefault();
      } else if (e.altKey && e.key.toLowerCase() === 'r') {
        handleResetSettingsToDefault();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        setZoom((z) => Math.min(5.0, parseFloat((z * 1.25).toFixed(2))));
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        setZoom((z) => Math.max(0.05, parseFloat((z * 0.8).toFixed(2))));
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
      } else if (e.key === 'Tab') {
        if (activeScreen === 'embroidery') {
          setShowComparison((prev) => !prev);
          e.preventDefault();
        }
      } else if (e.key.toLowerCase() === 'w' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h')) {
        setIsPreviewMode((p) => !p);
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'h') {
        setActiveTool('hand');
      } else if (e.key.toLowerCase() === 'z') {
        setActiveTool('zoom');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, handleFitToScreen, sourceAsset, activeScreen, accessStatus.isLocked, handleSaveSettingsAsDefault, handleResetSettingsToDefault]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#09090b] text-[#f4f4f5] overflow-hidden select-none font-sans">
      {/* 1. Adobe Application Menu Bar */}
      <MenuBar
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        onNewProject={handleNewProject}
        onOpenImport={handleOpenImportDialog}
        onOpenExport={handleOpenExport}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onResetSettings={handleResetSettingsToDefault}
        onSaveSettingsAsDefault={handleSaveSettingsAsDefault}
        saveStatusText={saveStatusText}
        zoom={zoom}
        onZoomChange={setZoom}
        onResetZoom={() => setZoom(1.0)}
        onFitToScreen={handleFitToScreen}
        showComparison={showComparison}
        onToggleComparison={() => setShowComparison((prev) => !prev)}
        showCheckerboard={showCheckerboard}
        onToggleCheckerboard={() => setShowCheckerboard((prev) => !prev)}
        showRulers={showRulers}
        onToggleRulers={() => setShowRulers((prev) => !prev)}
        onApplyPreset={handleApplyPreset}
        onSelectMockupCategory={handleSelectMockupCategory}
        hasSourceAsset={Boolean(sourceAsset)}
        activeMockupCategory={mockupTemplate.category}
        activeMockupId={mockupTemplate.id}
        mockupTemplates={mockupTemplates}
        onSelectMockup={handleSelectMockup}
        activePresetId={activePresetId}
        activeFabricSubstrate={settings.fabricSubstrate}
        onSelectFabricSubstrate={(fab) => handleUpdateSettings({ fabricSubstrate: fab })}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
        onOpenAboutModal={() => setIsAboutModalOpen(true)}
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
        onOpenExport={() => handleOpenExport()}
        onTriggerSmartOptimize={handleTriggerSmartOptimize}
        sourceName={sourceAsset ? sourceAsset.name : 'No Document Open'}
        hasSourceAsset={Boolean(sourceAsset)}
        accessStatus={accessStatus}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
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
              isSmartOptimizing={isSmartOptimizing}
              onSmartOptimizeComplete={handleSmartOptimizeComplete}
              history={history}
              currentHistoryIndex={historyIndex}
              onRevertHistory={handleRevertHistory}
              onSaveSettingsAsDefault={handleSaveSettingsAsDefault}
              onResetSettingsToDefault={handleResetSettingsToDefault}
              saveStatusText={saveStatusText}
            />
          )}

          {activeScreen === 'mockup' && sourceAsset && (
            <MockupStudio
              sourceAsset={sourceAsset}
              settings={settings}
              mockupTemplate={mockupTemplate}
              transform={transform}
              templates={mockupTemplates}
              onSelectMockup={handleSelectMockup}
              onUpdateTransform={handleUpdateTransform}
              onUploadCustomMockup={handleUploadCustomMockup}
              onOpenMockupsFolder={openMockupsFolder}
              onRefreshMockups={() => syncMockups(true)}
              isRefreshingMockups={isRefreshingMockups}
              activeTool={activeTool}
              zoomMode={zoomMode}
              zoom={zoom}
              onZoomChange={setZoom}
              onResetZoom={() => setZoom(1.0)}
              onFitToScreen={handleFitToScreen}
              showRulers={showRulers}
              isPreviewMode={isPreviewMode}
              onTogglePreviewMode={() => setIsPreviewMode((p) => !p)}
              onOpenExport={() => setIsExportOpen(true)}
              onSaveSettingsAsDefault={handleSaveSettingsAsDefault}
              onResetSettings={handleResetSettingsToDefault}
              saveStatusText={saveStatusText}
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
        defaultIncludeMockup={exportIncludeMockup}
      />

      {/* Smart Analysis Diagnostic Modal */}
      <SmartAnalysisModal
        isOpen={isSmartModalOpen}
        onClose={() => setIsSmartModalOpen(false)}
        result={smartAnalysisResult}
        onApply={handleApplySmartOptimization}
      />

      {/* Gumroad License & 14-Day Free Trial Modal */}
      <LicenseModal
        isOpen={isLicenseModalOpen || accessStatus.isLocked}
        onClose={() => {
          if (!accessStatus.isLocked) {
            setIsLicenseModalOpen(false);
          }
        }}
        accessStatus={accessStatus}
        onStatusChange={(newStatus) => {
          setAccessStatus(newStatus);
          if (!newStatus.isLocked) {
            setIsLicenseModalOpen(false);
          }
        }}
      />

      {/* About & Developer Inquiries Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Hidden Native File Input for Ctrl+O / Menu File Open */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileImport}
      />
    </div>
  );
};

export default App;
