import { useState, useEffect } from 'react';
import { Notebook } from '../types/memo';

interface AddNotebookOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  onEdit?: (notebook: Notebook) => void;
  editNotebook?: Notebook | null;
}

const AddNotebookOverlay = ({
  isOpen,
  onClose,
  onSave,
  onEdit,
  editNotebook
}: AddNotebookOverlayProps) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editNotebook) {
      setName(editNotebook.name);
    } else {
      setName('');
    }
    setError('');
  }, [editNotebook, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Notebook name is required');
      return;
    }

    if (editNotebook && onEdit) {
      onEdit({ ...editNotebook, name: name.trim() });
    } else {
      onSave(name.trim());
    }
    setName('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="overlay">
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="overlay-panel">
        <div className="overlay-header">
          <h2>{editNotebook ? 'Edit Notebook' : 'New Notebook'}</h2>
          <button type="button" className="overlay-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="memo-form">
          <div className="form-group">
            <label htmlFor="notebookName">Notebook Name</label>
            <input
              id="notebookName"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter notebook name..."
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary">
            {editNotebook ? 'Save Changes' : 'Create Notebook'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddNotebookOverlay;
