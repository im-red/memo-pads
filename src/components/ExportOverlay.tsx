import { useState, useMemo, useEffect } from 'react';
import { Notebook, Memo } from '../types/memo';

interface ExportOverlayProps {
  isOpen: boolean;
  notebooks: Notebook[];
  memos: Memo[];
  onClose: () => void;
  onExport: (selectedNotebookIds: string[]) => void;
}

const ExportOverlay = ({
  isOpen,
  notebooks,
  memos,
  onClose,
  onExport
}: ExportOverlayProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(notebooks.map(n => n.id)));
    }
  }, [isOpen, notebooks]);

  const preview = useMemo(() => {
    const selectedNotebooks = notebooks.filter(n => selectedIds.has(n.id));
    const selectedMemos = memos.filter(m => selectedIds.has(m.notebookId));
    return {
      notebookCount: selectedNotebooks.length,
      memoCount: selectedMemos.length
    };
  }, [notebooks, memos, selectedIds]);

  const handleToggle = (notebookId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(notebookId)) {
        next.delete(notebookId);
      } else {
        next.add(notebookId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(notebooks.map(n => n.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleExport = () => {
    if (selectedIds.size === 0) return;
    onExport(Array.from(selectedIds));
    setSelectedIds(new Set(notebooks.map(n => n.id)));
  };

  const getMemoCount = (notebookId: string) => {
    return memos.filter(m => m.notebookId === notebookId).length;
  };

  if (!isOpen) return null;

  return (
    <div className="overlay">
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="overlay-panel">
        <div className="overlay-header">
          <h2>Export Data</h2>
          <button type="button" className="overlay-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="export-select-actions">
          <button type="button" className="select-action-btn" onClick={handleSelectAll}>
            Select All
          </button>
          <button type="button" className="select-action-btn" onClick={handleDeselectAll}>
            Deselect All
          </button>
        </div>

        <div className="export-notebook-list">
          {notebooks.length === 0 ? (
            <p className="empty-message">No notebooks to export</p>
          ) : (
            notebooks.map(notebook => (
              <label key={notebook.id} className="export-notebook-item">
                <input
                  type="checkbox"
                  checked={selectedIds.has(notebook.id)}
                  onChange={() => handleToggle(notebook.id)}
                />
                <span className="export-notebook-name">{notebook.name}</span>
                <span className="export-notebook-count">{getMemoCount(notebook.id)} memos</span>
              </label>
            ))
          )}
        </div>

        <div className="export-preview">
          <p>
            <strong>{preview.notebookCount}</strong> notebooks, <strong>{preview.memoCount}</strong> memos will be exported
          </p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleExport}
          disabled={selectedIds.size === 0}
        >
          Export {selectedIds.size > 0 ? `(${selectedIds.size} notebooks)` : ''}
        </button>
      </div>
    </div>
  );
};

export default ExportOverlay;
