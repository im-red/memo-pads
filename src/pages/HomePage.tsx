import React, { useState, useMemo } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton,
  IonContent, IonList, IonItem, IonLabel, IonNote, IonIcon,
  IonFab, IonFabButton, IonActionSheet, IonItemSliding, IonItemOptions, IonItemOption, IonButton, useIonAlert
} from '@ionic/react';
import { add, create, trash, ellipsisVertical } from 'ionicons/icons';
import { useApp } from '../data/AppContext';
import { Notebook } from '../models';
import AddNotebookOverlay from '../components/AddNotebookOverlay';

const HomePage: React.FC = () => {
  const { activeNotebooks, memos, deleteNotebook, editNotebook, addNotebook } = useApp();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);

  const [actionSheetNotebook, setActionSheetNotebook] = useState<Notebook | null>(null);

  const memoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    memos.forEach(m => {
      if (!m.isDeleted) {
        counts[m.notebookId] = (counts[m.notebookId] || 0) + 1;
      }
    });
    return counts;
  }, [memos]);

  const handleAdd = (name: string) => {
    addNotebook(name);
    setIsAddOpen(false);
  };

  const handleEdit = (notebook: Notebook) => {
    editNotebook(notebook);
    setEditingNotebook(null);
    setIsAddOpen(false);
  };

  const openEdit = (notebook: Notebook) => {
    setEditingNotebook(notebook);
    setIsAddOpen(true);
  };

  const [presentAlert] = useIonAlert();

  const handleDelete = (id: string) => {
    presentAlert({
      header: 'Delete Notebook?',
      message: 'Delete this notebook and all its memos? They will be moved to trash.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await deleteNotebook(id);
          }
        }
      ]
    });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Memo Pads</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Memo Pads</IonTitle>
          </IonToolbar>
        </IonHeader>

        {activeNotebooks.length === 0 ? (
          <div className="ion-text-center ion-padding" style={{ marginTop: '50px' }}>
            <p style={{ color: 'var(--text-muted)' }}>No notebooks yet. Create one to get started!</p>
          </div>
        ) : (
          <IonList>
            {activeNotebooks.map(notebook => (
              <IonItemSliding key={notebook.id}>
                <IonItem routerLink={`/notebook/${notebook.id}`} routerDirection="forward" button>
                  <IonLabel>
                    <h2>{notebook.name}</h2>
                  </IonLabel>
                  <IonNote slot="end">{memoCounts[notebook.id] || 0} memos</IonNote>
                  <IonButton
                    fill="clear"
                    slot="end"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActionSheetNotebook(notebook);
                    }}
                  >
                    <IonIcon icon={ellipsisVertical} slot="icon-only" color="medium" />
                  </IonButton>
                </IonItem>

                <IonItemOptions side="end">
                  <IonItemOption color="primary" onClick={() => openEdit(notebook)}>
                    <IonIcon slot="icon-only" icon={create} />
                  </IonItemOption>
                  <IonItemOption color="danger" onClick={() => handleDelete(notebook.id)}>
                    <IonIcon slot="icon-only" icon={trash} />
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            ))}
          </IonList>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => { setEditingNotebook(null); setIsAddOpen(true); }}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <AddNotebookOverlay
          isOpen={isAddOpen}
          onClose={() => { setIsAddOpen(false); setEditingNotebook(null); }}
          onSave={handleAdd}
          onEdit={handleEdit}
          editNotebook={editingNotebook}
        />

        <IonActionSheet
          isOpen={!!actionSheetNotebook}
          onDidDismiss={() => setActionSheetNotebook(null)}
          header={actionSheetNotebook?.name}
          buttons={[
            {
              text: 'Edit',
              icon: create,
              handler: () => {
                if (actionSheetNotebook) openEdit(actionSheetNotebook);
              }
            },
            {
              text: 'Delete',
              icon: trash,
              role: 'destructive',
              handler: () => {
                if (actionSheetNotebook) handleDelete(actionSheetNotebook.id);
              }
            },
            {
              text: 'Cancel',
              role: 'cancel'
            }
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
