import React, { useState, useMemo, useRef } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonItem, IonCheckbox, IonLabel, IonNote, IonText, IonBadge
} from '@ionic/react';
import { Notebook, Memo } from '../models';
import { computeImportPreview, executeImport } from '../util/importUtils';
import { useApp } from '../data/AppContext';
import './ImportOverlay.scss';

interface ImportedData {
  notebooks: Notebook[];
  memos: Memo[];
}

interface ImportOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImportOverlay: React.FC<ImportOverlayProps> = ({ isOpen, onClose }) => {
  const { notebooks: existingNotebooks, memos: existingMemos, importData } = useApp();
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

    importData(result.newNotebooks, result.newMemos, result.updatedNotebooks);
    setImportedData(null);
    setSelectedIds(new Set());
    setError(null);
    onClose();
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

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Import Data</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleClose}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!importedData ? (
          <div className="ion-text-center ion-padding">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden-file-input"
              onChange={handleFileChange}
            />
            <IonButton expand="block" onClick={() => fileInputRef.current?.click()}>
              Select JSON File
            </IonButton>
            {error && <IonText color="danger"><p>{error}</p></IonText>}
          </div>
        ) : (
          <>
            <div className="ion-margin-bottom button-group-row">
              <IonButton fill="outline" size="small" onClick={handleSelectAll}>Select All</IonButton>
              <IonButton fill="outline" size="small" onClick={handleDeselectAll}>Deselect All</IonButton>
            </div>

            <IonList>
              {importedData.notebooks.length === 0 ? (
                <IonItem lines="none">
                  <IonLabel className="ion-text-center" color="medium">No notebooks in file</IonLabel>
                </IonItem>
              ) : (
                importedData.notebooks.map(notebook => {
                  const status = getNotebookStatus(notebook);
                  const statusColor = status === 'new' ? 'success' : status === 'update' ? 'warning' : 'medium';
                  const statusText = status === 'new' ? 'New' : status === 'update' ? 'Update' : 'Existing';

                  return (
                    <IonItem key={notebook.id} lines="full" button onClick={() => handleToggle(notebook.id)}>
                      <IonCheckbox
                        slot="start"
                        checked={selectedIds.has(notebook.id)}
                        onIonChange={e => e.preventDefault()}
                      />
                      <IonLabel>
                        <h2>{notebook.name}</h2>
                        <p>{getMemoCount(notebook.id)} memos</p>
                      </IonLabel>
                      <IonBadge slot="end" color={statusColor}>{statusText}</IonBadge>
                    </IonItem>
                  );
                })
              )}
            </IonList>

            {preview && (
              <div className="ion-margin-top ion-text-center">
                <IonText color="medium">
                  <p><strong>{preview.newNotebooks}</strong> new notebooks will be created</p>
                  {preview.updatedNotebooks > 0 && (
                    <p><strong>{preview.updatedNotebooks}</strong> notebooks will be renamed</p>
                  )}
                  <p><strong>{preview.newMemos}</strong> new memos will be added</p>
                  <p><strong>{preview.duplicateCount}</strong> duplicate memos will be skipped</p>
                </IonText>
              </div>
            )}

            <IonButton
              expand="block"
              className="ion-margin-top"
              onClick={handleImport}
              disabled={selectedIds.size === 0}
            >
              Import {selectedIds.size > 0 ? `(${selectedIds.size} notebooks)` : ''}
            </IonButton>
          </>
        )}
      </IonContent>
    </IonModal>
  );
};

export default ImportOverlay;