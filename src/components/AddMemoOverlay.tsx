import React, { useState, useEffect } from 'react';
import { Clipboard } from '@capacitor/clipboard';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonItem, IonTextarea, IonText, IonIcon
} from '@ionic/react';
import { clipboardOutline, swapVerticalOutline } from 'ionicons/icons';
import { Memo } from '../models';

interface AddMemoOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (originalText: string, explanation: string) => void;
  onEdit?: (memo: Memo) => void;
  editMemo?: Memo | null;
  openMode?: 'add' | 'paste';
}

const AddMemoOverlay: React.FC<AddMemoOverlayProps> = ({
  isOpen,
  onClose,
  onSave,
  onEdit,
  editMemo,
  openMode = 'add'
}) => {
  const [originalText, setOriginalText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');

  const handlePaste = async () => {
    try {
      const { value } = await Clipboard.read();
      if (!value || !value.trim()) {
        setError('Clipboard is empty');
        return;
      }
      const lines = value.split('\n');
      setOriginalText(lines[0]);
      setExplanation(lines.slice(1).join('\n'));
      setError('');
    } catch (err) {
      setError('Unable to read clipboard');
    }
  };

  const handleSwap = () => {
    const temp = originalText;
    setOriginalText(explanation);
    setExplanation(temp);
  };

  useEffect(() => {
    if (editMemo) {
      setOriginalText(editMemo.originalText);
      setExplanation(editMemo.explanation);
    } else {
      setOriginalText('');
      setExplanation('');
    }
    setError('');
  }, [editMemo, isOpen]);

  useEffect(() => {
    if (openMode === 'paste' && isOpen && !editMemo) {
      handlePaste();
    }
  }, [openMode, isOpen, editMemo]);

  const handleSubmit = async () => {
    if (!originalText.trim()) {
      setError('Original text is required');
      return;
    }
    if (!explanation.trim()) {
      setError('Explanation is required');
      return;
    }

    try {
      if (editMemo && onEdit) {
        onEdit({ ...editMemo, originalText: originalText.trim(), explanation: explanation.trim() });
      } else {
        await onSave(originalText.trim(), explanation.trim());
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save memo');
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{editMemo ? 'Edit Memo' : 'Add New Memo'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cancel</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonList>
          <IonItem lines="full">
            <IonTextarea
              label="Original Text"
              labelPlacement="stacked"
              placeholder="Enter the word or phrase..."
              value={originalText}
              onIonInput={e => setOriginalText(e.detail.value!)}
              rows={3}
              autofocus
            />
          </IonItem>

          <div className="ion-text-center">
            <IonButton fill="clear" onClick={handleSwap} title="Swap fields">
              <IonIcon icon={swapVerticalOutline} slot="icon-only" />
            </IonButton>
          </div>

          <IonItem lines="full">
            <IonTextarea
              label="Explanation"
              labelPlacement="stacked"
              placeholder="Enter the meaning or translation..."
              value={explanation}
              onIonInput={e => setExplanation(e.detail.value!)}
              rows={3}
            />
          </IonItem>
        </IonList>

        {error && (
          <IonText color="danger" className="ion-padding-start">
            <p>{error}</p>
          </IonText>
        )}

        <div className="ion-margin-top" style={{ display: 'flex', gap: '8px' }}>
          <IonButton
            expand="block"
            onClick={handleSubmit}
            style={{ flex: 1 }}
          >
            {editMemo ? 'Save Changes' : 'Add Memo'}
          </IonButton>
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