import React, { useState, useMemo, useEffect } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonItem, IonCheckbox, IonLabel, IonText
} from '@ionic/react';
import { useApp } from '../data/AppContext';
import { exportData } from '../util/importUtils';

interface ExportOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExportOverlay: React.FC<ExportOverlayProps> = ({ isOpen, onClose }) => {
  const { notebooks, memos } = useApp();
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

    // Perform export
    const selectedNotebookIds = Array.from(selectedIds);
    exportData(selectedNotebookIds, notebooks, memos);

    setSelectedIds(new Set(notebooks.map(n => n.id)));
    onClose();
  };

  const getMemoCount = (notebookId: string) => {
    return memos.filter(m => m.notebookId === notebookId).length;
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Export Data</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} className="overlay-close">Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="ion-margin-bottom" style={{ display: 'flex', gap: '8px' }}>
          <IonButton fill="outline" size="small" onClick={handleSelectAll}>Select All</IonButton>
          <IonButton fill="outline" size="small" onClick={handleDeselectAll}>Deselect All</IonButton>
        </div>

        <IonList className="export-notebook-list">
          {notebooks.length === 0 ? (
            <IonItem lines="none">
              <IonLabel className="ion-text-center empty-message" color="medium">No notebooks to export</IonLabel>
            </IonItem>
          ) : (
            notebooks.map(notebook => (
              <IonItem key={notebook.id} lines="full" button onClick={() => handleToggle(notebook.id)} className="export-notebook-item">
                <IonCheckbox
                  slot="start"
                  checked={selectedIds.has(notebook.id)}
                  onIonChange={e => e.preventDefault()}
                />
                <IonLabel>
                  <h2 className="export-notebook-name">{notebook.name}</h2>
                  <p className="export-notebook-count">{getMemoCount(notebook.id)} memos</p>
                </IonLabel>
              </IonItem>
            ))
          )}
        </IonList>

        <div className="ion-margin-top ion-text-center export-preview">
          <IonText color="medium">
            <p><strong>{preview.notebookCount}</strong> notebooks, <strong>{preview.memoCount}</strong> memos will be exported</p>
          </IonText>
        </div>

        <IonButton
          expand="block"
          className="ion-margin-top btn-primary"
          onClick={handleExport}
          disabled={selectedIds.size === 0}
        >
          Export {selectedIds.size > 0 ? `(${selectedIds.size} notebooks)` : ''}
        </IonButton>
      </IonContent>
    </IonModal>
  );
};

export default ExportOverlay;
