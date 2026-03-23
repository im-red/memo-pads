import { useState, useMemo, useRef } from 'react';
import { Memo, Notebook } from '../types/memo';
import { parseWeReadNotes, WeReadNote } from '../utils/wereadParser';

interface WeReadImportOverlayProps {
  isOpen: boolean;
  notebooks: Notebook[];
  existingMemos: Memo[];
  onClose: () => void;
  onImport: (newMemos: Memo[], notebookId: string) => void;
}

type InputMode = 'file' | 'text';

const WeReadImportOverlay = ({
  isOpen,
  notebooks,
  existingMemos,
  onClose,
  onImport
}: WeReadImportOverlayProps) => {
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [textContent, setTextContent] = useState('');
  const [notes, setNotes] = useState<WeReadNote[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeNotebooks = useMemo(() => {
    return notebooks.filter(n => !n.isDeleted);
  }, [notebooks]);

  const preview = useMemo(() => {
    if (notes.length === 0) return null;

    let duplicateCount = 0;
    const newMemos: Array<{ originalText: string; explanation: string }> = [];

    notes.forEach(note => {
      const isDuplicate = existingMemos.some(
        existing =>
          existing.originalText === note.originalText &&
          existing.explanation === note.explanation
      );
      if (isDuplicate) {
        duplicateCount++;
      } else {
        newMemos.push({
          originalText: note.originalText,
          explanation: note.explanation
        });
      }
    });

    return {
      total: notes.length,
      duplicates: duplicateCount,
      newMemos: newMemos.length
    };
  }, [notes, existingMemos]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const content = e.target?.result as string;
        const parsed = parseWeReadNotes(content);
        if (parsed.length === 0) {
          setError('No WeRead notes found in this file.');
          setNotes([]);
        } else {
          setNotes(parsed);
          setError('');
        }
      } catch (err) {
        setError('Failed to parse WeRead notes.');
        setNotes([]);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTextSubmit = () => {
    if (!textContent.trim()) {
      setError('Please paste WeRead notes content.');
      return;
    }

    try {
      const parsed = parseWeReadNotes(textContent);
      if (parsed.length === 0) {
        setError('No WeRead notes found in the content.');
        setNotes([]);
      } else {
        setNotes(parsed);
        setError('');
      }
    } catch (err) {
      setError('Failed to parse WeRead notes.');
      setNotes([]);
    }
  };

  const handleConfirm = () => {
    if (notes.length === 0) return;
    if (!selectedNotebookId) {
      setError('Please select a notebook');
      return;
    }

    const generateMemoId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    const newMemos: Memo[] = [];
    const now = new Date().toISOString();
    const deviceId = localStorage.getItem('memo-pads:device-id') ||
      (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

    let importOrder = 0;
    notes.forEach(note => {
      const isDuplicate = existingMemos.some(
        existing =>
          existing.originalText === note.originalText &&
          existing.explanation === note.explanation
      );
      if (!isDuplicate) {
        newMemos.push({
          id: generateMemoId(),
          originalText: note.originalText,
          explanation: note.explanation,
          notebookId: '',
          createdAt: now,
          updatedAt: now,
          importOrder: importOrder++,
          version: 1,
          deviceId
        });
      }
    });

    onImport(newMemos, selectedNotebookId);
    resetState();
  };

  const resetState = () => {
    setNotes([]);
    setTextContent('');
    setSelectedNotebookId('');
    setError('');
    setInputMode('file');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="overlay">
      <div className="overlay-backdrop" onClick={handleClose} />
      <div className="overlay-panel">
        <div className="overlay-header">
          <h2>Import WeRead Notes</h2>
          <button type="button" className="overlay-close" onClick={handleClose}>
            ×
          </button>
        </div>

        {notes.length === 0 ? (
          <>
            <div className="weread-tabs">
              <button
                type="button"
                className={`weread-tab ${inputMode === 'file' ? 'active' : ''}`}
                onClick={() => setInputMode('file')}
              >
                From File
              </button>
              <button
                type="button"
                className={`weread-tab ${inputMode === 'text' ? 'active' : ''}`}
                onClick={() => setInputMode('text')}
              >
                From Text
              </button>
            </div>

            {inputMode === 'file' ? (
              <div className="import-file-section">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,text/plain"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select WeRead Notes File
                </button>
                <p className="weread-hint">
                  Select a text file exported from WeRead containing your notes.
                </p>
              </div>
            ) : (
              <div className="weread-text-input">
                <textarea
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  placeholder="Paste WeRead notes here..."
                  rows={8}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleTextSubmit}
                  disabled={!textContent.trim()}
                >
                  Parse Notes
                </button>
              </div>
            )}

            {error && <p className="form-error">{error}</p>}
          </>
        ) : (
          <>
            <div className="weread-import-info">
              <p className="weread-import-count">
                Found <strong>{preview?.total || 0}</strong> notes
              </p>
              <p className={`import-duplicates ${preview?.duplicates ? 'has-duplicates' : ''}`}>
                <strong>{preview?.duplicates || 0}</strong> duplicate notes will be skipped
              </p>
              <p className="weread-import-hint">
                {preview?.newMemos || 0} notes will be imported as memos.
              </p>
            </div>

            <form onSubmit={e => { e.preventDefault(); handleConfirm(); }} className="memo-form">
              <div className="form-group">
                <label htmlFor="notebookSelect">Import to Notebook</label>
                <select
                  id="notebookSelect"
                  value={selectedNotebookId}
                  onChange={e => setSelectedNotebookId(e.target.value)}
                  className="notebook-select"
                >
                  <option value="">Select a notebook...</option>
                  {activeNotebooks.map(notebook => (
                    <option key={notebook.id} value={notebook.id}>
                      {notebook.name}
                    </option>
                  ))}
                </select>
              </div>

              {error && <p className="form-error">{error}</p>}

              <div className="weread-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetState}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={preview?.newMemos === 0 || !selectedNotebookId}
                >
                  Import {preview?.newMemos || 0} Notes
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default WeReadImportOverlay;
