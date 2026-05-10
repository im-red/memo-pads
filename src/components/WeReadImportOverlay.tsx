import React, { useState, useMemo, useRef } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonItem, IonLabel, IonText, IonSelect, IonSelectOption,
  IonSegment, IonSegmentButton, IonTextarea
} from '@ionic/react';
import { Memo } from '../models';
import { parseWeReadNotes, WeReadNote } from '../util/wereadParser';
import { useApp } from '../data/AppContext';

interface WeReadImportOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type InputMode = 'file' | 'text';

const WeReadImportOverlay: React.FC<WeReadImportOverlayProps> = ({ isOpen, onClose }) => {
  const { notebooks, memos: existingMemos, weReadImport } = useApp();

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
          notebookId: '', // will be set by context
          createdAt: now,
          updatedAt: now,
          importOrder: importOrder++,
          version: 1,
          deviceId
        });
      }
    });

    weReadImport(newMemos, selectedNotebookId);
    resetState();
    onClose();
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

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Import WeRead Notes</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleClose}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {notes.length === 0 ? (
          <>
            <IonSegment value={inputMode} onIonChange={e => setInputMode(e.detail.value as InputMode)}>
              <IonSegmentButton value="file">
                <IonLabel>From File</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="text">
                <IonLabel>From Text</IonLabel>
              </IonSegmentButton>
            </IonSegment>

            <div className="ion-margin-top">
              {inputMode === 'file' ? (
                <div className="ion-text-center ion-padding">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,text/plain"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <IonButton expand="block" onClick={() => fileInputRef.current?.click()}>
                    Select WeRead Notes File
                  </IonButton>
                  <IonText color="medium" className="ion-margin-top" style={{ display: 'block' }}>
                    <small>Select a text file exported from WeRead containing your notes.</small>
                  </IonText>
                </div>
              ) : (
                <div>
                  <IonItem lines="full">
                    <IonTextarea
                      value={textContent}
                      onIonChange={e => setTextContent(e.detail.value!)}
                      placeholder="Paste WeRead notes here..."
                      rows={8}
                    />
                  </IonItem>
                  <IonButton
                    expand="block"
                    className="ion-margin-top"
                    onClick={handleTextSubmit}
                    disabled={!textContent.trim()}
                  >
                    Parse Notes
                  </IonButton>
                </div>
              )}
              {error && <IonText color="danger" className="ion-text-center"><p>{error}</p></IonText>}
            </div>
          </>
        ) : (
          <>
            <div className="ion-text-center ion-margin-bottom">
              <IonText color="medium">
                <p>Found <strong>{preview?.total || 0}</strong> notes</p>
                <p><strong>{preview?.duplicates || 0}</strong> duplicate notes will be skipped</p>
                <p>{preview?.newMemos || 0} notes will be imported as memos.</p>
              </IonText>
            </div>

            <IonItem lines="full">
              <IonSelect
                label="Import to Notebook"
                labelPlacement="stacked"
                value={selectedNotebookId}
                onIonChange={e => setSelectedNotebookId(e.detail.value)}
                placeholder="Select a notebook..."
              >
                {activeNotebooks.map(notebook => (
                  <IonSelectOption key={notebook.id} value={notebook.id}>
                    {notebook.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {error && <IonText color="danger" className="ion-text-center"><p>{error}</p></IonText>}

            <div className="ion-margin-top" style={{ display: 'flex', gap: '8px' }}>
              <IonButton fill="outline" expand="block" style={{ flex: 1 }} onClick={resetState}>
                Back
              </IonButton>
              <IonButton
                expand="block"
                style={{ flex: 1 }}
                onClick={handleConfirm}
                disabled={preview?.newMemos === 0 || !selectedNotebookId}
              >
                Import
              </IonButton>
            </div>
          </>
        )}
      </IonContent>
    </IonModal>
  );
};

export default WeReadImportOverlay;