import { Notebook, Memo } from '../types/memo';

export interface ImportPreview {
  notebookCount: number;
  memoCount: number;
  newNotebooks: number;
  updatedNotebooks: number;
  newMemos: number;
  duplicateCount: number;
}

export interface ImportResult {
  newNotebooks: Notebook[];
  updatedNotebooks: Notebook[];
  newMemos: Memo[];
  notebookIdMap: Map<string, string>;
  preview: ImportPreview;
}

export interface NotebookMatchResult {
  newNotebooks: Notebook[];
  updatedNotebooks: Notebook[];
  notebookIdMap: Map<string, string>;
}

export function matchNotebooks(
  selectedNotebooks: Notebook[],
  existingNotebooks: Notebook[]
): NotebookMatchResult {
  const existingNotebookIds = new Set(existingNotebooks.map(n => n.id));
  const existingNotebookNames = new Map(existingNotebooks.map(n => [n.name, n.id]));
  const newNotebooks: Notebook[] = [];
  const updatedNotebooks: Notebook[] = [];
  const notebookIdMap = new Map<string, string>();

  selectedNotebooks.forEach(notebook => {
    if (existingNotebookIds.has(notebook.id)) {
      const existing = existingNotebooks.find(n => n.id === notebook.id);
      if (existing && existing.name !== notebook.name) {
        updatedNotebooks.push({
          ...existing,
          name: notebook.name
        });
      }
      notebookIdMap.set(notebook.id, notebook.id);
    } else {
      const existingId = existingNotebookNames.get(notebook.name);
      if (existingId) {
        notebookIdMap.set(notebook.id, existingId);
      } else {
        const newId = notebook.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
        notebookIdMap.set(notebook.id, newId);
        newNotebooks.push({
          ...notebook,
          id: newId
        });
      }
    }
  });

  return { newNotebooks, updatedNotebooks, notebookIdMap };
}

export function filterDuplicateMemos(
  selectedMemos: Memo[],
  notebookIdMap: Map<string, string>,
  existingMemos: Memo[],
  existingNotebooks: Notebook[]
): { newMemos: Memo[]; duplicateCount: number } {
  const newMemos: Memo[] = [];
  let duplicateCount = 0;

  selectedMemos.forEach(memo => {
    const newNotebookId = notebookIdMap.get(memo.notebookId);
    if (!newNotebookId) return;

    const existingNotebook = existingNotebooks.find(n => n.id === newNotebookId);
    if (existingNotebook) {
      const isDuplicate = existingMemos.some(
        existing =>
          existing.notebookId === newNotebookId &&
          existing.originalText === memo.originalText &&
          existing.explanation === memo.explanation
      );
      if (isDuplicate) {
        duplicateCount++;
        return;
      }
    }

    newMemos.push(memo);
  });

  return { newMemos, duplicateCount };
}

export function computeImportPreview(
  selectedNotebooks: Notebook[],
  selectedMemos: Memo[],
  existingNotebooks: Notebook[],
  existingMemos: Memo[]
): ImportPreview {
  const { newNotebooks, updatedNotebooks, notebookIdMap } = matchNotebooks(
    selectedNotebooks,
    existingNotebooks
  );

  const { newMemos, duplicateCount } = filterDuplicateMemos(
    selectedMemos,
    notebookIdMap,
    existingMemos,
    existingNotebooks
  );

  return {
    notebookCount: selectedNotebooks.length,
    memoCount: selectedMemos.length,
    newNotebooks: newNotebooks.length,
    updatedNotebooks: updatedNotebooks.length,
    newMemos: newMemos.length,
    duplicateCount
  };
}

export function executeImport(
  selectedNotebooks: Notebook[],
  selectedMemos: Memo[],
  existingNotebooks: Notebook[],
  existingMemos: Memo[]
): ImportResult {
  const { newNotebooks, updatedNotebooks, notebookIdMap } = matchNotebooks(
    selectedNotebooks,
    existingNotebooks
  );

  const { newMemos: filteredMemos, duplicateCount } = filterDuplicateMemos(
    selectedMemos,
    notebookIdMap,
    existingMemos,
    existingNotebooks
  );

  const generateMemoId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);

  // Sort memos by legacy numeric ID if present (for backward compatibility), 
  // then by createdAt, then by importOrder
  const sortedMemos = [...filteredMemos].sort((a, b) => {
    // Check if IDs are numeric (legacy format)
    const aIdNum = typeof a.id === 'number' ? a.id : parseInt(String(a.id));
    const bIdNum = typeof b.id === 'number' ? b.id : parseInt(String(b.id));

    if (!isNaN(aIdNum) && !isNaN(bIdNum)) {
      // Both are numeric IDs (legacy), sort by ID
      return aIdNum - bIdNum;
    }

    // Sort by createdAt
    const timeCompare = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (timeCompare !== 0) return timeCompare;

    // Sort by importOrder if available
    const aOrder = a.importOrder ?? 0;
    const bOrder = b.importOrder ?? 0;
    return aOrder - bOrder;
  });

  // Group memos by createdAt to assign importOrder for memos with same timestamp
  const memosByTime = new Map<string, Memo[]>();
  sortedMemos.forEach(memo => {
    const timeKey = memo.createdAt;
    if (!memosByTime.has(timeKey)) {
      memosByTime.set(timeKey, []);
    }
    memosByTime.get(timeKey)!.push(memo);
  });

  const newMemos = sortedMemos.map((memo) => {
    const newNotebookId = notebookIdMap.get(memo.notebookId);
    const memosAtSameTime = memosByTime.get(memo.createdAt) || [];
    const importOrder = memosAtSameTime.indexOf(memo);

    return {
      ...memo,
      id: generateMemoId(),
      notebookId: newNotebookId || memo.notebookId,
      importOrder: importOrder
    };
  });

  return {
    newNotebooks,
    updatedNotebooks,
    newMemos,
    notebookIdMap,
    preview: {
      notebookCount: selectedNotebooks.length,
      memoCount: selectedMemos.length,
      newNotebooks: newNotebooks.length,
      updatedNotebooks: updatedNotebooks.length,
      newMemos: newMemos.length,
      duplicateCount
    }
  };
}
