import { SplashScreen } from '@capacitor/splash-screen';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { App as CapacitorApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Memo, Notebook, ViewProgress } from './types/memo';
import useLocalStorageState from './hooks/useLocalStorageState';
import NotebookList from './components/NotebookList';
import MemoList from './components/MemoList';
import AddMemoOverlay from './components/AddMemoOverlay';
import AddNotebookOverlay from './components/AddNotebookOverlay';
import ExportOverlay from './components/ExportOverlay';
import ImportOverlay from './components/ImportOverlay';
import WeReadImportOverlay from './components/WeReadImportOverlay';
import TrashBinPage from './components/TrashBinPage';
import SettingsPage from './components/SettingsPage';
import AboutPage from './components/AboutPage';
import useAppVersion from './hooks/useAppVersion';

const NOTEBOOKS_KEY = 'memo-pads:notebooks';
const MEMOS_KEY = 'memo-pads:memos';
const PROGRESS_KEY = 'memo-pads:progress';
const DEVICE_ID_KEY = 'memo-pads:device-id';

// Get or create device ID
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

interface AppProps {
  notebooks: Notebook[];
  setNotebooks: (notebooks: Notebook[]) => void;
  memos: Memo[];
  setMemos: (memos: Memo[]) => void;
}

const App: React.FC<AppProps> = ({ notebooks, setNotebooks, memos, setMemos }) => {
  const [viewProgress, setViewProgress] = useLocalStorageState<Record<string, ViewProgress>>(PROGRESS_KEY, {});

  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [isAddMemoOpen, setIsAddMemoOpen] = useState(false);
  const [memoOpenMode, setMemoOpenMode] = useState<'add' | 'paste'>('add');
  const [isAddNotebookOpen, setIsAddNotebookOpen] = useState(false);
  const [editNotebook, setEditNotebook] = useState<Notebook | null>(null);
  const [editMemo, setEditMemo] = useState<Memo | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isWeReadImportOpen, setIsWeReadImportOpen] = useState(false);
  const [isTrashBinPageOpen, setIsTrashBinPageOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const sideMenuRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  const { fullString: versionString } = useAppVersion();

  const currentProgress = selectedNotebookId ? viewProgress[selectedNotebookId] : null;
  const showExplanation = currentProgress?.showExplanation ?? false;
  const alwaysShowExplanation = currentProgress?.alwaysShowExplanation ?? false;
  const currentMemoId = currentProgress?.currentMemoId ?? null;

  const notebookMemos = useMemo(() => {
    if (!selectedNotebookId) return [];
    return memos
      .filter(m => m.notebookId === selectedNotebookId && !m.isDeleted)
      .sort((a, b) => {
        const timeCompare = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (timeCompare !== 0) return timeCompare;
        return a.importOrder - b.importOrder;
      });
  }, [memos, selectedNotebookId]);

  const memoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    memos.forEach(m => {
      if (!m.isDeleted) {
        counts[m.notebookId] = (counts[m.notebookId] || 0) + 1;
      }
    });
    return counts;
  }, [memos]);

  const activeNotebooks = useMemo(() => {
    return notebooks.filter(n => !n.isDeleted);
  }, [notebooks]);

  useEffect(() => {
    // Hide splash screen once the app component is mounted
    const hideSplash = async () => {
      try {
        await SplashScreen.hide();
      } catch (err) {
        console.warn('Error hiding splash screen', err);
      }
    };
    hideSplash();

    const handleClickOutside = (event: MouseEvent) => {
      if (sideMenuRef.current && !sideMenuRef.current.contains(event.target as Node)) {
        setIsSideMenuOpen(false);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    };
    if (isSideMenuOpen || isHeaderMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSideMenuOpen, isHeaderMenuOpen]);

  useEffect(() => {
    if (!isSideMenuOpen || !sideMenuRef.current) return;

    const sideMenu = sideMenuRef.current;
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      currentX = startX;
      isDragging = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX;
      const diff = currentX - startX;
      if (diff < 0) {
        const menuWidth = sideMenu.offsetWidth;
        const translateX = Math.max(diff, -menuWidth);
        sideMenu.style.transform = `translateX(${translateX}px)`;
        sideMenu.style.transition = 'none';
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      const diff = currentX - startX;
      const menuWidth = sideMenu.offsetWidth;
      sideMenu.style.transition = '';
      sideMenu.style.transform = '';
      if (diff < -menuWidth * 0.3) {
        setIsSideMenuOpen(false);
      }
    };

    sideMenu.addEventListener('touchstart', handleTouchStart, { passive: true });
    sideMenu.addEventListener('touchmove', handleTouchMove, { passive: true });
    sideMenu.addEventListener('touchend', handleTouchEnd);

    return () => {
      sideMenu.removeEventListener('touchstart', handleTouchStart);
      sideMenu.removeEventListener('touchmove', handleTouchMove);
      sideMenu.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isSideMenuOpen]);

  useEffect(() => {
    let listener: PluginListenerHandle | undefined;
    let cancelled = false;

    const setup = async () => {
      const handle = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (isSideMenuOpen) {
          setIsSideMenuOpen(false);
          return;
        }
        if (isAddMemoOpen) {
          setIsAddMemoOpen(false);
          setEditMemo(null);
          return;
        }
        if (isAddNotebookOpen) {
          setIsAddNotebookOpen(false);
          return;
        }
        if (isExportOpen) {
          setIsExportOpen(false);
          return;
        }
        if (isImportOpen) {
          setIsImportOpen(false);
          return;
        }
        if (isWeReadImportOpen) {
          setIsWeReadImportOpen(false);
          return;
        }
        if (isTrashBinPageOpen) {
          setIsTrashBinPageOpen(false);
          return;
        }
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          return;
        }
        if (selectedNotebookId) {
          setSelectedNotebookId(null);
          return;
        }
        if (canGoBack) {
          window.history.back();
        } else {
          CapacitorApp.exitApp();
        }
      });

      if (cancelled) {
        handle.remove();
      } else {
        listener = handle;
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (listener) {
        listener.remove();
      }
    };
  }, [isSideMenuOpen, isAddMemoOpen, isAddNotebookOpen, isExportOpen, isImportOpen, isWeReadImportOpen, isTrashBinPageOpen, isSettingsOpen, selectedNotebookId]);

  const updateProgress = useCallback((notebookId: string, updates: Partial<ViewProgress>) => {
    setViewProgress(prev => ({
      ...prev,
      [notebookId]: {
        notebookId,
        currentMemoId: null,
        showExplanation: false,
        alwaysShowExplanation: false,
        ...(prev[notebookId] || {}),
        ...updates
      }
    }));
  }, [setViewProgress]);

  const handleSelectNotebook = useCallback((notebookId: string) => {
    setSelectedNotebookId(notebookId);
  }, []);

  const handleAddNotebook = useCallback(async (name: string) => {
    const now = new Date().toISOString();
    const newNotebook: Notebook = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      name,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deviceId: getDeviceId()
    };
    setNotebooks(prev => [...prev, newNotebook]);
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.warn('Unable to trigger haptic feedback', error);
    }
  }, [setNotebooks]);

  const handleEditNotebook = useCallback((notebook: Notebook) => {
    const now = new Date().toISOString();
    setNotebooks(prev => prev.map(n =>
      n.id === notebook.id
        ? { ...n, name: notebook.name, updatedAt: now, version: (n.version || 1) + 1 }
        : n
    ));
    setEditNotebook(null);
    setIsAddNotebookOpen(false);
  }, [setNotebooks]);

  const handleDeleteNotebook = useCallback(async (notebookId: string) => {
    if (!confirm('Delete this notebook and all its memos? They will be moved to trash.')) return;

    const now = new Date().toISOString();
    const deviceId = getDeviceId();

    // Soft delete notebook
    setNotebooks(prev => prev.map(n =>
      n.id === notebookId
        ? { ...n, isDeleted: true, deletedAt: now, deletedBy: deviceId, updatedAt: now, version: (n.version || 1) + 1 }
        : n
    ));

    // Soft delete all memos in the notebook
    setMemos(prev => prev.map(m =>
      m.notebookId === notebookId
        ? { ...m, isDeleted: true, deletedAt: now, deletedBy: deviceId, updatedAt: now, version: (m.version || 1) + 1 }
        : m
    ));

    setViewProgress(prev => {
      const next = { ...prev };
      delete next[notebookId];
      return next;
    });
    setSelectedNotebookId(null);

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.warn('Unable to trigger haptic feedback', error);
    }
  }, [setNotebooks, setMemos, setViewProgress]);

  const generateMemoId = useCallback(() => {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
  }, []);

  const handleAddMemo = useCallback(async (originalText: string, explanation: string) => {
    if (!selectedNotebookId) return;

    const isDuplicate = memos.some(
      m => m.notebookId === selectedNotebookId &&
        m.originalText.trim() === originalText.trim() &&
        m.explanation.trim() === explanation.trim()
    );
    if (isDuplicate) {
      throw new Error('This memo already exists in the current notebook');
    }

    const now = new Date().toISOString();
    const newMemo: Memo = {
      id: generateMemoId(),
      originalText,
      explanation,
      notebookId: selectedNotebookId,
      createdAt: now,
      updatedAt: now,
      importOrder: 0,
      version: 1,
      deviceId: getDeviceId()
    };
    setMemos(prev => [...prev, newMemo]);

    if (!currentMemoId) {
      updateProgress(selectedNotebookId, { currentMemoId: newMemo.id });
    }

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.warn('Unable to trigger haptic feedback', error);
    }
  }, [selectedNotebookId, generateMemoId, setMemos, currentMemoId, updateProgress, memos]);

  const handleEditMemo = useCallback(async (updatedMemo: Memo) => {
    setMemos(prev => prev.map(m => m.id === updatedMemo.id ? {
      ...updatedMemo,
      updatedAt: new Date().toISOString(),
      version: (updatedMemo.version || 1) + 1
    } : m));
    setEditMemo(null);

    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.warn('Unable to trigger haptic feedback', error);
    }
  }, [setMemos]);

  const handleDeleteMemo = useCallback(async (memoId: string) => {
    if (!confirm('Delete this memo? It will be moved to trash.')) return;

    const now = new Date().toISOString();
    const deviceId = getDeviceId();

    // Soft delete memo
    setMemos(prev => prev.map(m =>
      m.id === memoId
        ? { ...m, isDeleted: true, deletedAt: now, deletedBy: deviceId, updatedAt: now, version: (m.version || 1) + 1 }
        : m
    ));

    if (selectedNotebookId) {
      const remainingMemos = notebookMemos.filter(m => m.id !== memoId && !m.isDeleted);
      if (remainingMemos.length > 0) {
        const currentIndex = notebookMemos.findIndex(m => m.id === memoId);
        const newIndex = Math.min(currentIndex, remainingMemos.length - 1);
        updateProgress(selectedNotebookId, { currentMemoId: remainingMemos[newIndex].id });
      } else {
        updateProgress(selectedNotebookId, { currentMemoId: null });
      }
    }

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.warn('Unable to trigger haptic feedback', error);
    }
  }, [setMemos, selectedNotebookId, notebookMemos, updateProgress]);

  const handleRestoreNotebook = useCallback(async (notebookId: string) => {
    const now = new Date().toISOString();

    // Restore notebook
    setNotebooks(prev => prev.map(n =>
      n.id === notebookId
        ? { ...n, isDeleted: false, deletedAt: undefined, deletedBy: undefined, updatedAt: now, version: (n.version || 1) + 1 }
        : n
    ));

    // Restore all memos in the notebook
    setMemos(prev => prev.map(m =>
      m.notebookId === notebookId
        ? { ...m, isDeleted: false, deletedAt: undefined, deletedBy: undefined, updatedAt: now, version: (m.version || 1) + 1 }
        : m
    ));

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.warn('Unable to trigger haptic feedback', error);
    }
  }, [setNotebooks, setMemos]);

  const handleRestoreMemo = useCallback(async (memoId: string) => {
    const now = new Date().toISOString();

    // Restore memo
    setMemos(prev => prev.map(m =>
      m.id === memoId
        ? { ...m, isDeleted: false, deletedAt: undefined, deletedBy: undefined, updatedAt: now, version: (m.version || 1) + 1 }
        : m
    ));

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.warn('Unable to trigger haptic feedback', error);
    }
  }, [setMemos]);

  const handlePermanentDeleteNotebook = useCallback(async (notebookId: string) => {
    // Permanently remove notebook and its memos
    setNotebooks(prev => prev.filter(n => n.id !== notebookId));
    setMemos(prev => prev.filter(m => m.notebookId !== notebookId));
    setViewProgress(prev => {
      const next = { ...prev };
      delete next[notebookId];
      return next;
    });

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.warn('Unable to trigger haptic feedback', error);
    }
  }, [setNotebooks, setMemos, setViewProgress]);

  const handlePermanentDeleteMemo = useCallback(async (memoId: string) => {
    // Permanently remove memo
    setMemos(prev => prev.filter(m => m.id !== memoId));

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.warn('Unable to trigger haptic feedback', error);
    }
  }, [setMemos]);

  const handleToggleExplanation = useCallback(() => {
    if (selectedNotebookId) {
      updateProgress(selectedNotebookId, { showExplanation: !showExplanation });
    }
  }, [selectedNotebookId, showExplanation, updateProgress]);

  const handleToggleAlwaysShowExplanation = useCallback(() => {
    if (selectedNotebookId) {
      const newAlwaysShowExplanation = !alwaysShowExplanation;
      updateProgress(selectedNotebookId, {
        alwaysShowExplanation: newAlwaysShowExplanation,
        showExplanation: newAlwaysShowExplanation ? true : showExplanation
      });
    }
  }, [selectedNotebookId, alwaysShowExplanation, showExplanation, updateProgress]);

  const handleNavigateMemo = useCallback((memoId: string) => {
    if (selectedNotebookId) {
      updateProgress(selectedNotebookId, { currentMemoId: memoId });
    }
  }, [selectedNotebookId, updateProgress]);

  const handleExport = useCallback(async (selectedNotebookIds: string[]) => {
    const selectedNotebooks = notebooks.filter(n => selectedNotebookIds.includes(n.id));
    const selectedMemos = memos.filter(m => selectedNotebookIds.includes(m.notebookId));
    const selectedProgress: Record<string, ViewProgress> = {};
    selectedNotebookIds.forEach(id => {
      if (viewProgress[id]) {
        selectedProgress[id] = viewProgress[id];
      }
    });

    const data = {
      notebooks: selectedNotebooks,
      memos: selectedMemos,
      viewProgress: selectedProgress
    };
    const dataStr = JSON.stringify(data, null, 2);

    const now = new Date();
    const dateString = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const fileName = `memo-pads_${dateString}.json`;

    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: dataStr,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        alert(`Data exported to Documents/${fileName}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        alert('Failed to export data: ' + message);
      }
    } else {
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
    setIsExportOpen(false);
  }, [notebooks, memos, viewProgress]);

  const handleImport = useCallback((newNotebooks: Notebook[], newMemos: Memo[], updatedNotebooks: Notebook[]) => {
    if (updatedNotebooks.length > 0) {
      setNotebooks(prev => prev.map(n => {
        const updated = updatedNotebooks.find(u => u.id === n.id);
        return updated || n;
      }));
    }
    if (newNotebooks.length > 0) {
      setNotebooks(prev => [...prev, ...newNotebooks]);
    }
    if (newMemos.length > 0) {
      setMemos(prev => [...prev, ...newMemos]);
    }
    setIsImportOpen(false);
    const totalNotebooks = newNotebooks.length + updatedNotebooks.length;
    alert(`Imported ${totalNotebooks} notebooks and ${newMemos.length} memos.`);
  }, [setNotebooks, setMemos]);

  const handleWeReadImport = useCallback((newMemos: Memo[], targetNotebookId: string) => {
    const memosWithNotebookId = newMemos.map(m => ({
      ...m,
      notebookId: targetNotebookId
    }));

    setMemos(prev => [...prev, ...memosWithNotebookId]);
    setIsWeReadImportOpen(false);
    const targetNotebook = notebooks.find(n => n.id === targetNotebookId);
    alert(`Imported ${newMemos.length} notes to "${targetNotebook?.name || 'selected notebook'}".`);
  }, [notebooks, setNotebooks, setMemos]);

  const handleOpenAddMemo = (mode: 'add' | 'paste' = 'add') => {
    setEditMemo(null);
    setMemoOpenMode(mode);
    setIsAddMemoOpen(true);
  };

  const handleOpenEditMemo = (memo: Memo) => {
    setEditMemo(memo);
    setIsAddMemoOpen(true);
  };

  const initialMemoId = useMemo(() => {
    if (notebookMemos.length === 0) return null;
    if (currentMemoId && notebookMemos.some(m => m.id === currentMemoId)) {
      return currentMemoId;
    }
    return notebookMemos[0].id;
  }, [notebookMemos, currentMemoId]);

  useEffect(() => {
    if (selectedNotebookId && initialMemoId !== currentMemoId) {
      updateProgress(selectedNotebookId, { currentMemoId: initialMemoId });
    }
  }, [selectedNotebookId, initialMemoId, currentMemoId, updateProgress]);

  if (isAboutOpen) {
    return (
      <div className="app-shell">
        <AboutPage
          onBack={() => setIsAboutOpen(false)}
        />
      </div>
    );
  }

  if (isSettingsOpen) {
    return (
      <div className="app-shell">
        <SettingsPage
          onBack={() => setIsSettingsOpen(false)}
          onViewAbout={() => setIsAboutOpen(true)}
        />
      </div>
    );
  }

  if (!selectedNotebookId) {
    if (isTrashBinPageOpen) {
      return (
        <TrashBinPage
          notebooks={notebooks}
          memos={memos}
          onRestoreNotebook={handleRestoreNotebook}
          onRestoreMemo={handleRestoreMemo}
          onPermanentDeleteNotebook={handlePermanentDeleteNotebook}
          onPermanentDeleteMemo={handlePermanentDeleteMemo}
          onBack={() => setIsTrashBinPageOpen(false)}
        />
      );
    }

    return (
      <div className="app-shell">
        {/* Side Menu */}
        {isSideMenuOpen && <div className="side-menu-backdrop" onClick={() => setIsSideMenuOpen(false)} />}
        <div ref={sideMenuRef} className={`side-menu ${isSideMenuOpen ? 'side-menu--open' : ''}`}>
          <div className="side-menu-header">
            <h2>Menu</h2>
            <button
              type="button"
              className="side-menu-close"
              onClick={() => setIsSideMenuOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="side-menu-content">
            <button
              type="button"
              className="side-menu-item"
              onClick={() => {
                setIsSideMenuOpen(false);
                setIsTrashBinPageOpen(true);
              }}
            >
              🗑️ Trash Bin
            </button>
            <button
              type="button"
              className="side-menu-item"
              onClick={() => {
                setIsSideMenuOpen(false);
                setIsExportOpen(true);
              }}
            >
              📤 Export Data
            </button>
            <button
              type="button"
              className="side-menu-item"
              onClick={() => {
                setIsSideMenuOpen(false);
                setIsImportOpen(true);
              }}
            >
              📥 Import Data
            </button>
            <button
              type="button"
              className="side-menu-item"
              onClick={() => {
                setIsSideMenuOpen(false);
                setIsWeReadImportOpen(true);
              }}
            >
              📖 Import WeRead Notes
            </button>
            <div className="side-menu-divider" />
            <button
              type="button"
              className="side-menu-item"
              onClick={() => {
                setIsSideMenuOpen(false);
                setIsSettingsOpen(true);
              }}
            >
              ⚙️ Settings
            </button>
          </div>
          <div className="side-menu-footer">
            {versionString}
          </div>
        </div>

        <header className="app-header">
          <button
            type="button"
            className="menu-trigger-btn"
            onClick={() => setIsSideMenuOpen(true)}
          >
            ☰
          </button>
          <div className="header-title">
            <h1>Memo Pads</h1>
          </div>
        </header>

        <main>
          <section className="container">
            <NotebookList
              notebooks={activeNotebooks}
              selectedNotebookId={selectedNotebookId}
              onSelect={handleSelectNotebook}
              onAdd={() => { setEditNotebook(null); setIsAddNotebookOpen(true); }}
              onEdit={(notebook) => { setEditNotebook(notebook); setIsAddNotebookOpen(true); }}
              onDelete={handleDeleteNotebook}
              memoCounts={memoCounts}
            />
          </section>
        </main>

        <AddNotebookOverlay
          isOpen={isAddNotebookOpen}
          onClose={() => { setIsAddNotebookOpen(false); setEditNotebook(null); }}
          onSave={handleAddNotebook}
          onEdit={handleEditNotebook}
          editNotebook={editNotebook}
        />

        <ExportOverlay
          isOpen={isExportOpen}
          notebooks={notebooks}
          memos={memos}
          onClose={() => setIsExportOpen(false)}
          onExport={handleExport}
        />

        <ImportOverlay
          isOpen={isImportOpen}
          existingNotebooks={notebooks}
          existingMemos={memos}
          onClose={() => setIsImportOpen(false)}
          onImport={handleImport}
        />

        <WeReadImportOverlay
          isOpen={isWeReadImportOpen}
          notebooks={notebooks}
          existingMemos={memos}
          onClose={() => setIsWeReadImportOpen(false)}
          onImport={handleWeReadImport}
        />

      </div>
    );
  }

  const selectedNotebook = notebooks.find(n => n.id === selectedNotebookId);

  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => setSelectedNotebookId(null)}
        >
          ←
        </button>
        <div className="header-title">
          <h1>{selectedNotebook?.name}</h1>
          <p className="memo-count">{notebookMemos.length} memos</p>
        </div>
        <div className="header-menu" ref={headerMenuRef}>
          <button
            type="button"
            className="header-menu-btn"
            onClick={() => setIsHeaderMenuOpen(v => !v)}
          >
            ⋮
          </button>
          {isHeaderMenuOpen && (
            <div className="header-menu-dropdown">
              <button
                type="button"
                onClick={() => {
                  handleToggleAlwaysShowExplanation();
                  setIsHeaderMenuOpen(false);
                }}
              >
                {alwaysShowExplanation ? '✓ ' : ''}Always show explanation
              </button>
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="container">
          <MemoList
            memos={notebookMemos}
            showExplanation={showExplanation}
            alwaysShowExplanation={alwaysShowExplanation}
            currentMemoId={initialMemoId}
            onToggleExplanation={handleToggleExplanation}
            onNavigate={handleNavigateMemo}
            onAdd={handleOpenAddMemo}
            onPaste={() => handleOpenAddMemo('paste')}
            onEdit={handleOpenEditMemo}
            onDelete={handleDeleteMemo}
          />
        </section>
      </main>

      <AddMemoOverlay
        isOpen={isAddMemoOpen}
        onClose={() => {
          setIsAddMemoOpen(false);
          setEditMemo(null);
        }}
        onSave={handleAddMemo}
        onEdit={handleEditMemo}
        editMemo={editMemo}
        openMode={memoOpenMode}
      />

    </div>
  );
};

const AppWithStorage: React.FC = () => {
  const [notebooks, setNotebooks] = useLocalStorageState<Notebook[]>(NOTEBOOKS_KEY, []);
  const [memos, setMemos] = useLocalStorageState<Memo[]>(MEMOS_KEY, []);

  return (
    <App
      notebooks={notebooks}
      setNotebooks={setNotebooks}
      memos={memos}
      setMemos={setMemos}
    />
  );
};

export default AppWithStorage;
