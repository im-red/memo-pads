import React, { useMemo, useState } from 'react';
import { Memo, Notebook } from '../types/memo';

interface TrashBinPageProps {
    notebooks: Notebook[];
    memos: Memo[];
    onRestoreNotebook: (notebookId: string) => void;
    onRestoreMemo: (memoId: string) => void;
    onPermanentDeleteNotebook: (notebookId: string) => void;
    onPermanentDeleteMemo: (memoId: string) => void;
    onBack: () => void;
}

const TrashBinPage: React.FC<TrashBinPageProps> = ({
    notebooks,
    memos,
    onRestoreNotebook,
    onRestoreMemo,
    onPermanentDeleteNotebook,
    onPermanentDeleteMemo,
    onBack,
}) => {
    const [activeTab, setActiveTab] = useState<'notebooks' | 'memos'>('notebooks');

    const deletedNotebooks = useMemo(() => {
        return notebooks
            .filter(n => n.isDeleted)
            .sort((a, b) => new Date(b.deletedAt || b.updatedAt).getTime() - new Date(a.deletedAt || a.updatedAt).getTime());
    }, [notebooks]);

    const deletedMemos = useMemo(() => {
        return memos
            .filter(m => m.isDeleted)
            .sort((a, b) => new Date(b.deletedAt || b.updatedAt).getTime() - new Date(a.deletedAt || a.updatedAt).getTime());
    }, [memos]);

    const getNotebookName = (notebookId: string) => {
        const notebook = notebooks.find(n => n.id === notebookId);
        return notebook?.name || 'Unknown Notebook';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    };

    return (
        <div className="app-shell">
            <header className="app-header">
                <button
                    type="button"
                    className="back-btn"
                    onClick={onBack}
                >
                    ←
                </button>
                <div className="header-title">
                    <h1>🗑️ Trash Bin</h1>
                </div>
            </header>

            <main>
                <section className="container">
                    <div className="trash-page-content">
                        <div className="trash-tabs">
                            <button
                                type="button"
                                className={`trash-tab ${activeTab === 'notebooks' ? 'active' : ''}`}
                                onClick={() => setActiveTab('notebooks')}
                            >
                                Notebooks ({deletedNotebooks.length})
                            </button>
                            <button
                                type="button"
                                className={`trash-tab ${activeTab === 'memos' ? 'active' : ''}`}
                                onClick={() => setActiveTab('memos')}
                            >
                                Memos ({deletedMemos.length})
                            </button>
                        </div>

                        <div className="trash-content">
                            {activeTab === 'notebooks' && (
                                <div className="trash-list">
                                    {deletedNotebooks.length === 0 ? (
                                        <div className="empty-trash">
                                            <p>No deleted notebooks</p>
                                        </div>
                                    ) : (
                                        deletedNotebooks.map(notebook => (
                                            <div key={notebook.id} className="trash-item">
                                                <div className="trash-item-info">
                                                    <h3>{notebook.name}</h3>
                                                    <p className="trash-item-meta">
                                                        Deleted {formatDate(notebook.deletedAt || notebook.updatedAt)}
                                                    </p>
                                                </div>
                                                <div className="trash-item-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-secondary btn-sm"
                                                        onClick={() => onRestoreNotebook(notebook.id)}
                                                    >
                                                        Restore
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-danger btn-sm"
                                                        onClick={() => {
                                                            if (confirm('Permanently delete this notebook? This cannot be undone.')) {
                                                                onPermanentDeleteNotebook(notebook.id);
                                                            }
                                                        }}
                                                    >
                                                        Delete Forever
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'memos' && (
                                <div className="trash-list">
                                    {deletedMemos.length === 0 ? (
                                        <div className="empty-trash">
                                            <p>No deleted memos</p>
                                        </div>
                                    ) : (
                                        deletedMemos.map(memo => (
                                            <div key={memo.id} className="trash-item">
                                                <div className="trash-item-info">
                                                    <h3>{memo.originalText}</h3>
                                                    <p className="trash-item-explanation">{memo.explanation}</p>
                                                    <p className="trash-item-meta">
                                                        From: {getNotebookName(memo.notebookId)} • Deleted {formatDate(memo.deletedAt || memo.updatedAt)}
                                                    </p>
                                                </div>
                                                <div className="trash-item-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-secondary btn-sm"
                                                        onClick={() => onRestoreMemo(memo.id)}
                                                    >
                                                        Restore
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-danger btn-sm"
                                                        onClick={() => {
                                                            if (confirm('Permanently delete this memo? This cannot be undone.')) {
                                                                onPermanentDeleteMemo(memo.id);
                                                            }
                                                        }}
                                                    >
                                                        Delete Forever
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default TrashBinPage;
