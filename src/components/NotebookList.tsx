import { Notebook } from '../types/memo';
import clsx from 'clsx';
import { useState, useRef, useEffect } from 'react';

interface NotebookListProps {
  notebooks: Notebook[];
  selectedNotebookId: string | null;
  onSelect: (notebookId: string) => void;
  onAdd: () => void;
  onEdit: (notebook: Notebook) => void;
  onDelete: (notebookId: string) => void;
  memoCounts: Record<string, number>;
}

const NotebookList = ({
  notebooks,
  selectedNotebookId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  memoCounts
}: NotebookListProps) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const handleEdit = (notebook: Notebook) => {
    setOpenMenuId(null);
    onEdit(notebook);
  };

  const handleDelete = (notebookId: string) => {
    setOpenMenuId(null);
    onDelete(notebookId);
  };

  return (
    <div className="notebook-list">
      <div className="notebook-list__header">
        <h2>Notebooks</h2>
        <button
          type="button"
          className="add-notebook-btn"
          onClick={onAdd}
          aria-label="Add notebook"
        >
          +
        </button>
      </div>
      <ul className="notebook-items">
        {notebooks.map(notebook => (
          <li
            key={notebook.id}
            className={clsx('notebook-item', {
              active: selectedNotebookId === notebook.id
            })}
          >
            <button
              type="button"
              className="notebook-item__btn"
              onClick={() => onSelect(notebook.id)}
            >
              <span className="notebook-item__name">{notebook.name}</span>
              <span className="notebook-item__count">
                {memoCounts[notebook.id] || 0} memos
              </span>
            </button>
            <div className="notebook-item__menu" ref={openMenuId === notebook.id ? menuRef : null}>
              <button
                type="button"
                className="notebook-item__menu-btn"
                onClick={() => setOpenMenuId(openMenuId === notebook.id ? null : notebook.id)}
                aria-label="Notebook menu"
              >
                ⋮
              </button>
              {openMenuId === notebook.id && (
                <div className="notebook-item__menu-dropdown">
                  <button type="button" onClick={() => handleEdit(notebook)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(notebook.id)} className="danger">
                    Delete
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {notebooks.length === 0 && (
        <p className="empty-message">No notebooks yet. Create one to get started!</p>
      )}
    </div>
  );
};

export default NotebookList;
