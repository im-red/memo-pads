import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonButton, IonIcon, IonFab, IonFabButton, IonActionSheet, IonText, useIonAlert
} from '@ionic/react';
import {
  add, ellipsisVertical, checkmarkCircle, create, trash, clipboardOutline
} from 'ionicons/icons';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Virtual } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/virtual';
import '@ionic/react/css/ionic-swiper.css';
import { useApp } from '../data/AppContext';
import { Memo } from '../models';
import AddMemoOverlay from '../components/AddMemoOverlay';

const NotebookPage: React.FC = () => {
  const { id: notebookId } = useParams<{ id: string }>();
  const history = useHistory();
  const { notebooks, memos, viewProgress, updateProgress, deleteMemo, addMemo, editMemo } = useApp();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<'add' | 'paste'>('add');
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [memoActionSheet, setMemoActionSheet] = useState<Memo | null>(null);

  const notebook = useMemo(() => notebooks.find(n => n.id === notebookId), [notebooks, notebookId]);

  const notebookMemos = useMemo(() => {
    return memos
      .filter(m => m.notebookId === notebookId && !m.isDeleted)
      .sort((a, b) => {
        const timeCompare = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (timeCompare !== 0) return timeCompare;
        return a.importOrder - b.importOrder;
      });
  }, [memos, notebookId]);

  const progress = viewProgress[notebookId];
  const showExplanation = progress?.showExplanation ?? false;
  const alwaysShowExplanation = progress?.alwaysShowExplanation ?? false;
  const currentMemoId = progress?.currentMemoId ?? null;

  const initialMemoId = useMemo(() => {
    if (notebookMemos.length === 0) return null;
    if (currentMemoId && notebookMemos.some(m => m.id === currentMemoId)) {
      return currentMemoId;
    }
    return notebookMemos[0].id;
  }, [notebookMemos, currentMemoId]);

  useEffect(() => {
    if (notebookId && initialMemoId !== currentMemoId) {
      updateProgress(notebookId, { currentMemoId: initialMemoId });
    }
  }, [notebookId, initialMemoId, currentMemoId, updateProgress]);

  const currentIndex = notebookMemos.findIndex(m => m.id === initialMemoId);
  const currentMemo = currentIndex >= 0 ? notebookMemos[currentIndex] : null;

  const handleToggleAlwaysShow = () => {
    updateProgress(notebookId, {
      alwaysShowExplanation: !alwaysShowExplanation,
      showExplanation: !alwaysShowExplanation ? true : showExplanation
    });
  };

  const handleToggleExplanation = () => {
    updateProgress(notebookId, { showExplanation: !showExplanation });
  };

  const handleAdd = async (originalText: string, explanation: string) => {
    await addMemo(notebookId, originalText, explanation);
  };

  const handleEdit = async (memo: Memo) => {
    await editMemo(memo);
  };

  const [presentAlert] = useIonAlert();

  const handleDelete = (memoId: string) => {
    presentAlert({
      header: 'Delete Memo?',
      message: 'Delete this memo? It will be moved to trash.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await deleteMemo(memoId);
          }
        }
      ]
    });
  };

  if (!notebook && notebooks.length > 0) {
    history.replace('/');
    return null;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span>{notebook?.name}</span>
              <span style={{ fontSize: '0.75em', opacity: 0.8, fontWeight: 'normal' }}>
                {notebookMemos.length} memos
              </span>
            </div>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setIsMenuOpen(true)}>
              <IonIcon slot="icon-only" icon={ellipsisVertical} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        {notebookMemos.length === 0 ? (
          <div className="ion-text-center" style={{ marginTop: '50px' }}>
            <IonText color="medium">
              <p>No memos in this notebook.</p>
            </IonText>
            <IonButton className="ion-margin-top" onClick={() => { setEditingMemo(null); setAddMode('add'); setIsAddOpen(true); }}>
              Add Your First Memo
            </IonButton>
          </div>
        ) : currentMemo ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.85em', color: 'var(--ion-color-medium)', marginRight: '12px' }}>
                {currentIndex + 1} / {notebookMemos.length}
              </span>
              <div style={{ flex: 1, height: '8px', background: 'var(--ion-color-light)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${((currentIndex + 1) / notebookMemos.length) * 100}%`,
                  background: 'var(--ion-color-primary)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            <Swiper
              modules={[Virtual]}
              virtual={{ addSlidesBefore: 2, addSlidesAfter: 2 }}
              style={{ flex: 1, width: '100%', height: '100%' }}
              initialSlide={currentIndex >= 0 ? currentIndex : 0}
              onSlideChangeTransitionEnd={(swiper) => {
                const newMemo = notebookMemos[swiper.activeIndex];
                if (newMemo) {
                  updateProgress(notebookId, {
                    currentMemoId: newMemo.id,
                    showExplanation: alwaysShowExplanation
                  });
                }
              }}
            >
              {notebookMemos.map((memo, index) => (
                <SwiperSlide key={memo.id} virtualIndex={index} style={{ boxSizing: 'border-box', display: 'flex', justifyContent: 'center' }}>
                  <div
                    onClick={() => handleToggleExplanation()}
                    style={{
                      height: '100%',
                      width: 'calc(100% - 6px)',
                      background: 'var(--surface)',
                      borderRadius: '16px',
                      padding: '24px',
                      boxShadow: 'var(--shadow)',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      overflowY: 'auto'
                    }}
                  >
                    <IonButton
                      fill="clear"
                      color="medium"
                      style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemoActionSheet(memo);
                      }}
                    >
                      <IonIcon slot="icon-only" icon={ellipsisVertical} />
                    </IonButton>

                    <div
                      style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', wordBreak: 'break-word', paddingRight: '32px', textAlign: 'left' }}
                    >
                      {memo.originalText}
                    </div>

                    {(alwaysShowExplanation || (showExplanation && memo.id === currentMemo?.id)) && (
                      <div
                        style={{
                          fontSize: '1.1rem',
                          color: 'var(--text-muted)',
                          borderTop: '1px solid var(--border-color)',
                          paddingTop: '16px',
                          whiteSpace: 'pre-line',
                          wordBreak: 'break-word',
                          textAlign: 'left'
                        }}
                      >
                        {memo.explanation}
                      </div>
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        ) : null}

        <IonFab vertical="bottom" horizontal="end" slot="fixed" style={{ marginBottom: '72px' }}>
          <IonFabButton className="fab--secondary" color="secondary" onClick={() => { setEditingMemo(null); setAddMode('paste'); setIsAddOpen(true); }}>
            <IonIcon icon={clipboardOutline} />
          </IonFabButton>
        </IonFab>
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton className="fab--primary" onClick={() => { setEditingMemo(null); setAddMode('add'); setIsAddOpen(true); }}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonActionSheet
          isOpen={isMenuOpen}
          onDidDismiss={() => setIsMenuOpen(false)}
          buttons={[
            {
              text: `Always show explanation`,
              icon: alwaysShowExplanation ? checkmarkCircle : undefined,
              handler: handleToggleAlwaysShow
            },
            {
              text: 'Cancel',
              role: 'cancel'
            }
          ]}
        />

        <IonActionSheet
          isOpen={!!memoActionSheet}
          onDidDismiss={() => setMemoActionSheet(null)}
          buttons={[
            {
              text: 'Edit',
              icon: create,
              handler: () => {
                if (memoActionSheet) {
                  setEditingMemo(memoActionSheet);
                  setIsAddOpen(true);
                }
              }
            },
            {
              text: 'Delete',
              icon: trash,
              role: 'destructive',
              handler: () => {
                if (memoActionSheet) handleDelete(memoActionSheet.id);
              }
            },
            {
              text: 'Cancel',
              role: 'cancel'
            }
          ]}
        />

        <AddMemoOverlay
          isOpen={isAddOpen}
          onClose={() => { setIsAddOpen(false); setEditingMemo(null); }}
          onSave={handleAdd}
          onEdit={handleEdit}
          editMemo={editingMemo}
          openMode={addMode}
        />
      </IonContent>
    </IonPage>
  );
};

export default NotebookPage;
