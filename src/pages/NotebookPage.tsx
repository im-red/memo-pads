import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonButton, IonIcon, IonFab, IonFabButton, IonActionSheet, IonText, useIonAlert
} from '@ionic/react';
import {
  add, ellipsisVertical, checkmarkCircle, create, trash, clipboardOutline, refresh
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

  const [originalIndex, setOriginalIndex] = useState<number | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);
  const [sliderIndex, setSliderIndex] = useState(currentIndex >= 0 ? currentIndex : 0);

  useEffect(() => {
    if (currentIndex >= 0) {
      setSliderIndex(currentIndex);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (originalIndex === null && currentIndex >= 0) {
      setOriginalIndex(currentIndex);
    }
  }, [currentIndex, originalIndex]);

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
              <span style={{
                fontSize: '0.85em',
                color: 'var(--ion-color-medium)',
                marginRight: '12px',
                minWidth: `${String(notebookMemos.length).length * 2 + 3}ch`,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {sliderIndex + 1} / {notebookMemos.length}
              </span>

              <div style={{ position: 'relative', flex: 1, height: '24px', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: '100%', height: '8px', background: 'var(--ion-color-light)', borderRadius: '4px' }}>
                  <div style={{
                    height: '100%',
                    width: `${notebookMemos.length > 1 ? (sliderIndex / (notebookMemos.length - 1)) * 100 : 100}%`,
                    background: 'var(--ion-color-primary)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>

                {hasDragged && originalIndex !== null && notebookMemos.length > 1 && (
                  <div
                    data-testid="original-index-marker"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: `${(originalIndex / (notebookMemos.length - 1)) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '4px',
                      height: '16px',
                      background: 'var(--ion-color-medium)',
                      borderRadius: '2px',
                      zIndex: 1,
                      pointerEvents: 'none'
                    }} />
                )}

                <input
                  type="range"
                  min={0}
                  max={notebookMemos.length > 1 ? notebookMemos.length - 1 : 0}
                  value={sliderIndex}
                  onChange={(e) => {
                    setHasDragged(true);
                    const newIndex = parseInt(e.target.value, 10);
                    setSliderIndex(newIndex);
                    if (swiperInstance) {
                      swiperInstance.slideTo(newIndex);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    margin: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    zIndex: 3
                  }}
                />

                {notebookMemos.length > 1 && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${(sliderIndex / (notebookMemos.length - 1)) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '16px',
                    height: '16px',
                    background: 'var(--ion-background-color, #fff)',
                    border: '2px solid var(--ion-color-primary)',
                    borderRadius: '50%',
                    zIndex: 2,
                    pointerEvents: 'none',
                    transition: 'left 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                )}
              </div>

              <IonButton
                data-testid="reset-progress-button"
                fill="clear"
                size="small"
                style={{
                  visibility: hasDragged ? 'visible' : 'hidden',
                  '--padding-start': '4px',
                  '--padding-end': '4px'
                }}
                onClick={() => {
                  if (hasDragged && originalIndex !== null && swiperInstance) {
                    swiperInstance.slideTo(originalIndex);
                    setHasDragged(false);
                  }
                }}
              >
                <IonIcon slot="icon-only" icon={refresh} color="medium" />
              </IonButton>
            </div>

            <Swiper
              onSwiper={setSwiperInstance}
              onSlideChange={(swiper) => {
                setSliderIndex(swiper.activeIndex);
              }}
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
