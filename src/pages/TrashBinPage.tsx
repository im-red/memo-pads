import React, { useMemo, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonSegment, IonSegmentButton, IonLabel, IonList, IonItem,
  IonText, IonButton, IonIcon, IonItemSliding, IonItemOptions, IonItemOption, useIonAlert
} from '@ionic/react';
import { refreshOutline, trashOutline } from 'ionicons/icons';
import { useApp } from '../data/AppContext';

const TrashBinPage: React.FC = () => {
  const {
    notebooks,
    memos,
    restoreNotebook,
    restoreMemo,
    permanentDeleteNotebook,
    permanentDeleteMemo
  } = useApp();

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

  const handleRestoreNotebook = async (id: string) => {
    await restoreNotebook(id);
  };

  const [presentAlert] = useIonAlert();

  const handleDeleteNotebook = (id: string) => {
    presentAlert({
      header: 'Delete Notebook?',
      message: 'Permanently delete this notebook? This cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete Forever',
          role: 'destructive',
          handler: async () => {
            await permanentDeleteNotebook(id);
          }
        }
      ]
    });
  };

  const handleRestoreMemo = async (id: string) => {
    await restoreMemo(id);
  };

  const handleDeleteMemo = (id: string) => {
    presentAlert({
      header: 'Delete Memo?',
      message: 'Permanently delete this memo? This cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete Forever',
          role: 'destructive',
          handler: async () => {
            await permanentDeleteMemo(id);
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
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Trash Bin</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonSegment value={activeTab} onIonChange={e => setActiveTab(e.detail.value as 'notebooks' | 'memos')}>
          <IonSegmentButton value="notebooks">
            <IonLabel>Notebooks ({deletedNotebooks.length})</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="memos">
            <IonLabel>Memos ({deletedMemos.length})</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        <div className="ion-margin-top">
          {activeTab === 'notebooks' && (
            <IonList>
              {deletedNotebooks.length === 0 ? (
                <div className="ion-text-center ion-padding" style={{ marginTop: '2rem' }}>
                  <IonText color="medium">
                    <p>No deleted notebooks</p>
                  </IonText>
                </div>
              ) : (
                deletedNotebooks.map(notebook => (
                  <IonItemSliding key={notebook.id}>
                    <IonItem>
                      <IonLabel>
                        <h2>{notebook.name}</h2>
                        <p>Deleted {formatDate(notebook.deletedAt || notebook.updatedAt)}</p>
                      </IonLabel>
                    </IonItem>
                    <IonItemOptions side="end">
                      <IonItemOption color="success" onClick={() => handleRestoreNotebook(notebook.id)}>
                        <IonIcon slot="icon-only" icon={refreshOutline} />
                      </IonItemOption>
                      <IonItemOption color="danger" onClick={() => handleDeleteNotebook(notebook.id)}>
                        <IonIcon slot="icon-only" icon={trashOutline} />
                      </IonItemOption>
                    </IonItemOptions>
                  </IonItemSliding>
                ))
              )}
            </IonList>
          )}

          {activeTab === 'memos' && (
            <IonList>
              {deletedMemos.length === 0 ? (
                <div className="ion-text-center ion-padding" style={{ marginTop: '2rem' }}>
                  <IonText color="medium">
                    <p>No deleted memos</p>
                  </IonText>
                </div>
              ) : (
                deletedMemos.map(memo => (
                  <IonItemSliding key={memo.id}>
                    <IonItem>
                      <IonLabel>
                        <h2>{memo.originalText}</h2>
                        <p>{memo.explanation}</p>
                        <p>From: {getNotebookName(memo.notebookId)} • Deleted {formatDate(memo.deletedAt || memo.updatedAt)}</p>
                      </IonLabel>
                    </IonItem>
                    <IonItemOptions side="end">
                      <IonItemOption color="success" onClick={() => handleRestoreMemo(memo.id)}>
                        <IonIcon slot="icon-only" icon={refreshOutline} />
                      </IonItemOption>
                      <IonItemOption color="danger" onClick={() => handleDeleteMemo(memo.id)}>
                        <IonIcon slot="icon-only" icon={trashOutline} />
                      </IonItemOption>
                    </IonItemOptions>
                  </IonItemSliding>
                ))
              )}
            </IonList>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default TrashBinPage;
