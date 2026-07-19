import React, { useState, useEffect } from 'react';
import { Clipboard } from '@capacitor/clipboard';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonItem, IonTextarea, IonText, IonIcon
} from '@ionic/react';
import { clipboardOutline, trashOutline, addOutline } from 'ionicons/icons';
import { Memo } from '../models';
import './AddMemoOverlay.scss';

export interface MemoEntry {
  originalText: string;
  explanation: string;
}

interface AddMemoOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entries: MemoEntry[]) => Promise<void> | void;
  onEdit?: (memo: Memo) => void;
  editMemo?: Memo | null;
  openMode?: 'add' | 'paste';
}

const emptyEntry = (): MemoEntry => ({ originalText: '', explanation: '' });

const AddMemoOverlay: React.FC<AddMemoOverlayProps> = ({
  isOpen,
  onClose,
  onSave,
  onEdit,
  editMemo,
  openMode = 'add'
}) => {
  const [entries, setEntries] = useState<MemoEntry[]>([emptyEntry()]);
  const [error, setError] = useState('');

  const handlePaste = async () => {
    try {
      const { value } = await Clipboard.read();
      if (!value || !value.trim()) {
        setError('Clipboard is empty');
        return;
      }
      // Split into blocks separated by blank lines; each block: first line = original, rest = explanation
      const blocks = value.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
      const parsed: MemoEntry[] = blocks.map(block => {
        const lines = block.split('\n');
        return {
          originalText: lines[0].trim(),
          explanation: lines.slice(1).join('\n').trim()
        };
      }).filter(e => e.originalText || e.explanation);
      if (parsed.length === 0) {
        setError('Clipboard is empty');
        return;
      }
      setEntries(parsed.length > 0 ? parsed : [emptyEntry()]);
      setError('');
    } catch (err) {
      setError('Unable to read clipboard');
    }
  };

  useEffect(() => {
    if (editMemo) {
      setEntries([{ originalText: editMemo.originalText, explanation: editMemo.explanation }]);
    } else {
      setEntries([emptyEntry()]);
    }
    setError('');
  }, [editMemo, isOpen]);

  useEffect(() => {
    if (openMode === 'paste' && isOpen && !editMemo) {
      handlePaste();
    }
  }, [openMode, isOpen, editMemo]);

  const updateEntry = (index: number, field: keyof MemoEntry, value: string) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const addEntry = () => {
    setEntries(prev => [...prev, emptyEntry()]);
  };

  const removeEntry = (index: number) => {
    setEntries(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  const handleSubmit = async () => {
    for (const entry of entries) {
      if (!entry.originalText.trim()) {
        setError('Original text is required for all entries');
        return;
      }
      if (!entry.explanation.trim()) {
        setError('Explanation is required for all entries');
        return;
      }
    }

    try {
      if (editMemo && onEdit) {
        const e = entries[0];
        onEdit({ ...editMemo, originalText: e.originalText.trim(), explanation: e.explanation.trim() });
      } else {
        await onSave(entries.map(e => ({ originalText: e.originalText.trim(), explanation: e.explanation.trim() })));
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save memo');
    }
  };

  const isEditing = !!editMemo;
  const multiLabel = entries.length > 1 ? ` (${entries.length})` : '';
  const saveLabel = isEditing
    ? 'Save Changes'
    : entries.length > 1
      ? `Add ${entries.length} Memos`
      : 'Add Memo';

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{isEditing ? 'Edit Memo' : `Add Memo${multiLabel}`}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cancel</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="add-memo-content ion-padding">
        {entries.map((entry, index) => (
          <div className="memo-entry" key={index}>
            <IonItem lines="full" className="memo-entry-item">
              <IonTextarea
                label={entries.length > 1 ? `Original #${index + 1}` : 'Original Text'}
                labelPlacement="stacked"
                placeholder="Enter the word or phrase..."
                value={entry.originalText}
                onIonInput={e => updateEntry(index, 'originalText', e.detail.value!)}
                rows={1}
                autoGrow
                autofocus={index === 0}
              />
            </IonItem>
            <IonItem lines="full" className="memo-entry-item">
              <IonTextarea
                label="Explanation"
                labelPlacement="stacked"
                placeholder="Enter the meaning or translation..."
                value={entry.explanation}
                onIonInput={e => updateEntry(index, 'explanation', e.detail.value!)}
                rows={1}
                autoGrow
              />
            </IonItem>
            {!isEditing && entries.length > 1 && (
              <div className="ion-text-end remove-entry-row">
                <IonButton
                  fill="clear"
                  size="small"
                  color="danger"
                  onClick={() => removeEntry(index)}
                  title="Remove this memo"
                >
                  <IonIcon icon={trashOutline} slot="start" />
                  Remove
                </IonButton>
              </div>
            )}
          </div>
        ))}

        {error && (
          <IonText color="danger" className="ion-padding-start">
            <p>{error}</p>
          </IonText>
        )}

        <div className="ion-margin-top button-group-row">
          <IonButton
            expand="block"
            onClick={handleSubmit}
            className="flex-button"
          >
            {saveLabel}
          </IonButton>
          {!isEditing && (
            <IonButton fill="outline" onClick={addEntry} title="Add another memo">
              <IonIcon icon={addOutline} slot="icon-only" />
            </IonButton>
          )}
          {openMode !== 'paste' && (
            <IonButton fill="outline" onClick={handlePaste} title="Paste from clipboard">
              <IonIcon icon={clipboardOutline} slot="icon-only" />
            </IonButton>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default AddMemoOverlay;
