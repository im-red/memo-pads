import { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import useLocalStorageState from '../hooks/useLocalStorageState';
import { Memo, Notebook, ViewProgress } from '../models';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const NOTEBOOKS_KEY = 'memo-pads:notebooks';
const MEMOS_KEY = 'memo-pads:memos';
const PROGRESS_KEY = 'memo-pads:progress';
const DEVICE_ID_KEY = 'memo-pads:device-id';

const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

const generateId = () => {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
};

interface AppContextType {
  notebooks: Notebook[];
  activeNotebooks: Notebook[];
  memos: Memo[];
  viewProgress: Record<string, ViewProgress>;
  
  addNotebook: (name: string) => Promise<void>;
  editNotebook: (notebook: Notebook) => void;
  deleteNotebook: (id: string) => Promise<void>;
  restoreNotebook: (id: string) => Promise<void>;
  permanentDeleteNotebook: (id: string) => Promise<void>;
  
  addMemo: (notebookId: string, originalText: string, explanation: string) => Promise<void>;
  editMemo: (memo: Memo) => Promise<void>;
  deleteMemo: (id: string) => Promise<void>;
  restoreMemo: (id: string) => Promise<void>;
  permanentDeleteMemo: (id: string) => Promise<void>;
  
  updateProgress: (notebookId: string, updates: Partial<ViewProgress>) => void;
  
  importData: (newNotebooks: Notebook[], newMemos: Memo[], updatedNotebooks: Notebook[]) => void;
  weReadImport: (newMemos: Memo[], targetNotebookId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notebooks, setNotebooks] = useLocalStorageState<Notebook[]>(NOTEBOOKS_KEY, []);
  const [memos, setMemos] = useLocalStorageState<Memo[]>(MEMOS_KEY, []);
  const [viewProgress, setViewProgress] = useLocalStorageState<Record<string, ViewProgress>>(PROGRESS_KEY, {});

  const activeNotebooks = useMemo(() => notebooks.filter(n => !n.isDeleted), [notebooks]);

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

  const addNotebook = useCallback(async (name: string) => {
    const now = new Date().toISOString();
    const newNotebook: Notebook = {
      id: generateId(),
      name,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deviceId: getDeviceId()
    };
    setNotebooks(prev => [...prev, newNotebook]);
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) { console.warn(e); }
  }, [setNotebooks]);

  const editNotebook = useCallback((notebook: Notebook) => {
    const now = new Date().toISOString();
    setNotebooks(prev => prev.map(n =>
      n.id === notebook.id
        ? { ...n, name: notebook.name, updatedAt: now, version: (n.version || 1) + 1 }
        : n
    ));
  }, [setNotebooks]);

  const deleteNotebook = useCallback(async (notebookId: string) => {
    const now = new Date().toISOString();
    const deviceId = getDeviceId();

    setNotebooks(prev => prev.map(n =>
      n.id === notebookId
        ? { ...n, isDeleted: true, deletedAt: now, deletedBy: deviceId, updatedAt: now, version: (n.version || 1) + 1 }
        : n
    ));

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

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) { console.warn(e); }
  }, [setNotebooks, setMemos, setViewProgress]);

  const restoreNotebook = useCallback(async (notebookId: string) => {
    const now = new Date().toISOString();

    setNotebooks(prev => prev.map(n =>
      n.id === notebookId
        ? { ...n, isDeleted: false, deletedAt: undefined, deletedBy: undefined, updatedAt: now, version: (n.version || 1) + 1 }
        : n
    ));

    setMemos(prev => prev.map(m =>
      m.notebookId === notebookId
        ? { ...m, isDeleted: false, deletedAt: undefined, deletedBy: undefined, updatedAt: now, version: (m.version || 1) + 1 }
        : m
    ));

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) { console.warn(e); }
  }, [setNotebooks, setMemos]);

  const permanentDeleteNotebook = useCallback(async (notebookId: string) => {
    setNotebooks(prev => prev.filter(n => n.id !== notebookId));
    setMemos(prev => prev.filter(m => m.notebookId !== notebookId));
    setViewProgress(prev => {
      const next = { ...prev };
      delete next[notebookId];
      return next;
    });

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) { console.warn(e); }
  }, [setNotebooks, setMemos, setViewProgress]);

  const addMemo = useCallback(async (notebookId: string, originalText: string, explanation: string) => {
    const isDuplicate = memos.some(
      m => m.notebookId === notebookId &&
        m.originalText.trim() === originalText.trim() &&
        m.explanation.trim() === explanation.trim()
    );
    if (isDuplicate) {
      throw new Error('This memo already exists in the current notebook');
    }

    const now = new Date().toISOString();
    const newMemo: Memo = {
      id: generateId(),
      originalText,
      explanation,
      notebookId,
      createdAt: now,
      updatedAt: now,
      importOrder: 0,
      version: 1,
      deviceId: getDeviceId()
    };
    
    setMemos(prev => [...prev, newMemo]);
    
    const progress = viewProgress[notebookId];
    if (!progress || !progress.currentMemoId) {
      updateProgress(notebookId, { currentMemoId: newMemo.id });
    }

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) { console.warn(e); }
  }, [memos, setMemos, viewProgress, updateProgress]);

  const editMemo = useCallback(async (updatedMemo: Memo) => {
    setMemos(prev => prev.map(m => m.id === updatedMemo.id ? {
      ...updatedMemo,
      updatedAt: new Date().toISOString(),
      version: (updatedMemo.version || 1) + 1
    } : m));

    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) { console.warn(e); }
  }, [setMemos]);

  const deleteMemo = useCallback(async (memoId: string) => {
    const now = new Date().toISOString();
    const deviceId = getDeviceId();
    
    const memoToDelete = memos.find(m => m.id === memoId);
    
    setMemos(prev => prev.map(m =>
      m.id === memoId
        ? { ...m, isDeleted: true, deletedAt: now, deletedBy: deviceId, updatedAt: now, version: (m.version || 1) + 1 }
        : m
    ));

    if (memoToDelete) {
      const notebookId = memoToDelete.notebookId;
      const notebookMemos = memos.filter(m => m.notebookId === notebookId && !m.isDeleted && m.id !== memoId)
        .sort((a, b) => {
          const timeCompare = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          if (timeCompare !== 0) return timeCompare;
          return a.importOrder - b.importOrder;
        });
        
      if (notebookMemos.length > 0) {
        const oldMemos = memos.filter(m => m.notebookId === notebookId && !m.isDeleted)
          .sort((a, b) => {
            const timeCompare = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (timeCompare !== 0) return timeCompare;
            return a.importOrder - b.importOrder;
          });
        const currentIndex = oldMemos.findIndex(m => m.id === memoId);
        const newIndex = Math.min(currentIndex, notebookMemos.length - 1);
        updateProgress(notebookId, { currentMemoId: notebookMemos[newIndex].id });
      } else {
        updateProgress(notebookId, { currentMemoId: null });
      }
    }

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) { console.warn(e); }
  }, [memos, setMemos, updateProgress]);

  const restoreMemo = useCallback(async (memoId: string) => {
    const now = new Date().toISOString();
    setMemos(prev => prev.map(m =>
      m.id === memoId
        ? { ...m, isDeleted: false, deletedAt: undefined, deletedBy: undefined, updatedAt: now, version: (m.version || 1) + 1 }
        : m
    ));
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) { console.warn(e); }
  }, [setMemos]);

  const permanentDeleteMemo = useCallback(async (memoId: string) => {
    setMemos(prev => prev.filter(m => m.id !== memoId));
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (e) { console.warn(e); }
  }, [setMemos]);

  const importData = useCallback((newNotebooks: Notebook[], newMemos: Memo[], updatedNotebooks: Notebook[]) => {
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
  }, [setNotebooks, setMemos]);

  const weReadImport = useCallback((newMemos: Memo[], targetNotebookId: string) => {
    const memosWithNotebookId = newMemos.map(m => ({
      ...m,
      notebookId: targetNotebookId
    }));
    setMemos(prev => [...prev, ...memosWithNotebookId]);
  }, [setMemos]);

  return (
    <AppContext.Provider value={{
      notebooks,
      activeNotebooks,
      memos,
      viewProgress,
      addNotebook,
      editNotebook,
      deleteNotebook,
      restoreNotebook,
      permanentDeleteNotebook,
      addMemo,
      editMemo,
      deleteMemo,
      restoreMemo,
      permanentDeleteMemo,
      updateProgress,
      importData,
      weReadImport
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
