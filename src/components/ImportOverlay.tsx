import { useState, useMemo, useRef } from 'react';
import { Notebook, Memo } from '../types/memo';
import { computeImportPreview, executeImport } from '../utils/importUtils';

interface ImportedData {
  notebooks: Notebook[];
  memos: Memo[];
}

interface ImportOverlayProps {
  isOpen: boolean;
  existingNotebooks: Notebook[];
  existingMemos: Memo[];
  onClose: () => void;
  onImport: (newNotebooks: Notebook[], newMemos: Memo[], updatedNotebooks: Notebook[]) => void;
}

const ImportOverlay = ({
  isOpen,
  existingNotebooks,
  existingMemos,
  onClose,
  onImport
}: ImportOverlayProps) => {
  const [importedData, setImportedData] = useState<ImportedData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedNotebooks = useMemo(() => {
    if (!importedData) return [];
    return importedData.notebooks.filter(n => selectedIds.has(n.id));
  }, [importedData, selectedIds]);

  const selectedMemos = useMemo(() => {
    if (!importedData) return [];
    return importedData.memos.filter(m => selectedIds.has(m.notebookId));
  }, [importedData, selectedIds]);

  const preview = useMemo(() => {
    if (selectedNotebooks.length === 0) return null;
    return computeImportPreview(selectedNotebooks, selectedMemos, existingNotebooks, existingMemos);
  }, [selectedNotebooks, selectedMemos, existingNotebooks, existingMemos]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (!data.notebooks || !Array.isArray(data.notebooks)) {
          throw new Error('Invalid file: missing notebooks array');
        }
        if (!data.memos || !Array.isArray(data.memos)) {
          throw new Error('Invalid file: missing memos array');
        }

        setImportedData({
          notebooks: data.notebooks,
          memos: data.memos
        });
        setSelectedIds(new Set(data.notebooks.map((n: Notebook) => n.id)));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to parse file';
        setError(message);
        setImportedData(null);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
    if (importedData) {
      setSelectedIds(new Set(importedData.notebooks.map(n => n.id)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleImport = () => {
    if (!importedData || selectedIds.size === 0) return;

    const result = executeImport(
      selectedNotebooks,
      selectedMemos,
      existingNotebooks,
      existingMemos
    );

    onImport(result.newNotebooks, result.newMemos, result.updatedNotebooks);
    setImportedData(null);
    setSelectedIds(new Set());
    setError(null);
  };

  const handleClose = () => {
    setImportedData(null);
    setSelectedIds(new Set());
    setError(null);
    onClose();
  };

  const getMemoCount = (notebookId: string) => {
    if (!importedData) return 0;
    return importedData.memos.filter(m => m.notebookId === notebookId).length;
  };

  const getNotebookStatus = (notebook: Notebook) => {
    const existingById = existingNotebooks.find(n => n.id === notebook.id);
    if (existingById) {
      return existingById.name === notebook.name ? 'existing' : 'update';
    }
    const existingByName = existingNotebooks.find(n => n.name === notebook.name);
    return existingByName ? 'existing' : 'new';
  };

  if (!isOpen) return null;

  return (
    <div className="overlay">
      <div className="overlay-backdrop" onClick={handleClose} />
      <div className="overlay-panel">
        <div className="overlay-header">
          <h2>Import Data</h2>
          <button type="button" className="overlay-close" onClick={handleClose}>
            ×
          </button>
        </div>

        {!importedData ? (
          <div className="import-file-section">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              Select JSON File
            </button>
            {error && <p className="form-error">{error}</p>}
          </div>
        ) : (
          <>
            <div className="export-select-actions">
              <button type="button" className="select-action-btn" onClick={handleSelectAll}>
                Select All
              </button>
              <button type="button" className="select-action-btn" onClick={handleDeselectAll}>
                Deselect All
              </button>
            </div>

            <div className="export-notebook-list">
              {importedData.notebooks.length === 0 ? (
                <p className="empty-message">No notebooks in file</p>
              ) : (
                importedData.notebooks.map(notebook => {
                  const status = getNotebookStatus(notebook);
                  return (
                    <label key={notebook.id} className="export-notebook-item">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(notebook.id)}
                        onChange={() => handleToggle(notebook.id)}
                      />
                      <span className="export-notebook-name">{notebook.name}</span>
                      <span className="export-notebook-count">{getMemoCount(notebook.id)} memos</span>
                      <span className={`import-status import-status--${status}`}>
                        {status === 'new' ? 'New' : status === 'update' ? 'Update' : 'Existing'}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {preview && (
              <div className="import-preview">
                <p>
                  <strong>{preview.newNotebooks}</strong> new notebooks will be created
                </p>
                {preview.updatedNotebooks > 0 && (
                  <p>
                    <strong>{preview.updatedNotebooks}</strong> notebooks will be renamed
                  </p>
                )}
                <p>
                  <strong>{preview.newMemos}</strong> new memos will be added
                </p>
                <p className={`import-duplicates ${preview.duplicateCount ? 'has-duplicates' : ''}`}>
                  <strong>{preview.duplicateCount}</strong> duplicate memos will be skipped
                </p>
              </div>
            )}

            <button
              type="button"
              className="btn-primary"
              onClick={handleImport}
              disabled={selectedIds.size === 0}
            >
              Import {selectedIds.size > 0 ? `(${selectedIds.size} notebooks)` : ''}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ImportOverlay;
