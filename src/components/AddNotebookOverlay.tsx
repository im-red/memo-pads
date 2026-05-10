import React, { useState, useEffect } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonList, IonItem, IonInput, IonText
} from '@ionic/react';
import { Notebook } from '../models';

interface AddNotebookOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  onEdit?: (notebook: Notebook) => void;
  editNotebook?: Notebook | null;
}

const AddNotebookOverlay: React.FC<AddNotebookOverlayProps> = ({
  isOpen,
  onClose,
  onSave,
  onEdit,
  editNotebook
}) => {
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

  const handleSubmit = () => {
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

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{editNotebook ? 'Edit Notebook' : 'New Notebook'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cancel</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonList>
          <IonItem lines="full">
            <IonInput
              label="Notebook Name"
              labelPlacement="stacked"
              placeholder="Enter notebook name..."
              value={name}
              onIonInput={e => setName(e.detail.value!)}
              autofocus
            />
          </IonItem>
        </IonList>

        {error && (
          <IonText color="danger" className="ion-padding-start">
            <p>{error}</p>
          </IonText>
        )}

        <IonButton
          expand="block"
          className="ion-margin-top"
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          {editNotebook ? 'Save Changes' : 'Create Notebook'}
        </IonButton>
      </IonContent>
    </IonModal>
  );
};

export default AddNotebookOverlay;