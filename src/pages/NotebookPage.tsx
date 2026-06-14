import React, { useState, useMemo, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonButton, IonIcon, IonFab, IonFabButton, IonActionSheet, IonText, useIonAlert, useIonToast,
  IonPopover, IonItem, IonToggle, IonLabel
} from '@ionic/react';
import {
  add, ellipsisVertical, create, trash, clipboard, refresh, close
} from 'ionicons/icons';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Virtual } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/virtual';
import '@ionic/react/css/ionic-swiper.css';
import { Clipboard } from '@capacitor/clipboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useApp, useProgress } from '../data/AppContext';
import { Memo } from '../models';
import AddMemoOverlay from '../components/AddMemoOverlay';
import { ScopedTimer } from '../utils/debug';

import './NotebookPage.scss';

/**
 * External stores for volatile slide state — avoids passing changing values as props
 * to all 1086 slides, which would invalidate useMemo every swipe.
 * Stores are updated in rAF BEFORE React state commits.
 */
let _currentMemoId: string | null = null;
const _currentMemoIdListeners = new Set<() => void>();
const currentMemoIdStore = {
  get: () => _currentMemoId,
  set: (id: string | null) => { _currentMemoId = id; _currentMemoIdListeners.forEach(fn => fn()); },
  subscribe: (fn: () => void) => { _currentMemoIdListeners.add(fn); return () => { _currentMemoIdListeners.delete(fn); }; },
};

let _showExplanationStore = false;
const _showExplanationListeners = new Set<() => void>();
const showExplanationStore = {
  get: () => _showExplanationStore,
  set: (v: boolean) => { _showExplanationStore = v; _showExplanationListeners.forEach(fn => fn()); },
  subscribe: (fn: () => void) => { _showExplanationListeners.add(fn); return () => { _showExplanationListeners.delete(fn); }; },
};

let _alwaysShowExplanationStore = false;
const _alwaysShowExplanationListeners = new Set<() => void>();
const alwaysShowExplanationStore = {
  get: () => _alwaysShowExplanationStore,
  set: (v: boolean) => { _alwaysShowExplanationStore = v; _alwaysShowExplanationListeners.forEach(fn => fn()); },
  subscribe: (fn: () => void) => { _alwaysShowExplanationListeners.add(fn); return () => { _alwaysShowExplanationListeners.delete(fn); }; },
};

interface MemoSlideContentProps {
  memo: Memo;
  onToggleExplanation: () => void;
  onMenuAction: (memo: Memo) => void;
  onCopyText: (text: string) => void;
}

const MemoSlideContent = React.memo(({
  memo, onToggleExplanation, onMenuAction, onCopyText,
}: MemoSlideContentProps) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentMemoId_ = useSyncExternalStore(currentMemoIdStore.subscribe, currentMemoIdStore.get);
  const isCurrent = memo.id === currentMemoId_;
  const showExplanation_ = useSyncExternalStore(showExplanationStore.subscribe, showExplanationStore.get);
  const alwaysShowExplanation_ = useSyncExternalStore(alwaysShowExplanationStore.subscribe, alwaysShowExplanationStore.get);
  const showExplanationContent = alwaysShowExplanation_ || (showExplanation_ && isCurrent);

  const handlers = useMemo(() => {
    const makeHandlers = (text: string) => ({
      onTouchStart: () => { timerRef.current = setTimeout(() => onCopyText(text), 600); },
      onTouchEnd: () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } },
      onTouchMove: () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } },
    });
    return {
      textHandlers: makeHandlers(memo.originalText),
      explanationHandlers: makeHandlers(memo.explanation),
    };
  }, [memo.originalText, memo.explanation, onCopyText]);

  return (
    <div onClick={onToggleExplanation} className="memo-card">
      <IonButton fill="clear" color="medium" className="memo-card-menu-btn"
        onClick={(e) => { e.stopPropagation(); onMenuAction(memo); }}>
        <IonIcon slot="icon-only" icon={ellipsisVertical} />
      </IonButton>
      <div className="memo-card-text" {...handlers.textHandlers}>
        {memo.originalText}
      </div>
      {(showExplanationContent) && (
        <div className="memo-card-explanation" {...handlers.explanationHandlers}>
          {memo.explanation}
        </div>
      )}
    </div>
  );
});

const NotebookPage: React.FC = () => {
  using _ = new ScopedTimer('NotebookPage render');
  const { id: notebookId } = useParams<{ id: string }>();
  const history = useHistory();
  const { notebooks, memos, deleteMemo, addMemo, editMemo } = useApp();
  const { viewProgress, updateProgress } = useProgress();

  const showExplanation = useMemo(() => viewProgress[notebookId]?.showExplanation ?? false, [viewProgress, notebookId]);
  const alwaysShowExplanation = useMemo(() => viewProgress[notebookId]?.alwaysShowExplanation ?? false, [viewProgress, notebookId]);
  const currentMemoId = useMemo(() => viewProgress[notebookId]?.currentMemoId ?? null, [viewProgress, notebookId]);

  // Sync stores post-commit so MemoSlideContent sees latest values.
  // For swipe: stores are already set in rAF, this is a no-op.
  // For tap-to-toggle: this is the primary sync path.
  useEffect(() => {
    currentMemoIdStore.set(currentMemoId);
    showExplanationStore.set(showExplanation);
    alwaysShowExplanationStore.set(alwaysShowExplanation);
  }, [currentMemoId, showExplanation, alwaysShowExplanation]);

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
  const [dragSliderIndex, setDragSliderIndex] = useState(currentIndex >= 0 ? currentIndex : 0);
  const sliderIndexRef = useRef(currentIndex >= 0 ? currentIndex : 0);

  const sliderIndex = hasDragged ? dragSliderIndex : (currentIndex >= 0 ? currentIndex : 0);

  const handleToggleAlwaysShow = (e?: CustomEvent) => {
    const checked = e?.detail?.checked ?? !alwaysShowExplanation;
    updateProgress(notebookId, {
      alwaysShowExplanation: checked,
      showExplanation: checked ? true : showExplanation
    });
  };

  const showExplanationRef = useRef(showExplanation);
  showExplanationRef.current = showExplanation;

  const handleToggleExplanation = useCallback(() => {
    updateProgress(notebookId, { showExplanation: !showExplanationRef.current });
  }, [notebookId, updateProgress]);

  const handleAdd = async (originalText: string, explanation: string) => {
    await addMemo(notebookId, originalText, explanation);
  };

  const handleEdit = async (memo: Memo) => {
    await editMemo(memo);
  };

  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();

  const handleCopyText = useCallback(async (text: string) => {
    await Clipboard.write({ string: text });
    await Haptics.impact({ style: ImpactStyle.Medium });
    presentToast({
      message: 'Copied to clipboard',
      duration: 1500,
      position: 'bottom',
      color: 'medium',
    });
  }, [presentToast]);

  const handleCopyAll = async () => {
    if (!memoActionSheet) return;
    const text = `${memoActionSheet.originalText}\n\n${memoActionSheet.explanation}`;
    await handleCopyText(text);
    setMemoActionSheet(null);
  };

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

  const slides = useMemo(() =>
    notebookMemos.map((memo, index) => (
      <SwiperSlide key={memo.id} virtualIndex={index} className="swiper-slide-content">
        <MemoSlideContent
          memo={memo}
          onToggleExplanation={handleToggleExplanation}
          onMenuAction={setMemoActionSheet}
          onCopyText={handleCopyText}
        />
      </SwiperSlide>
    )),
    [notebookMemos, handleToggleExplanation, handleCopyText]
  );

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
            <div className="notebook-title-container">
              <span>{notebook?.name}</span>
              <span className="notebook-title-count">
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
          <div className="ion-text-center no-memos-container">
            <IonText color="medium">
              <p>No memos in this notebook.</p>
            </IonText>
            <IonButton className="ion-margin-top" onClick={() => { setEditingMemo(null); setAddMode('add'); setIsAddOpen(true); }}>
              Add Your First Memo
            </IonButton>
          </div>
        ) : currentMemo ? (
          <div className="notebook-progress-container">
            <div className="progress-header">
              <span
                className="progress-index"
                style={{
                  minWidth: `${String(notebookMemos.length).length * 2 + 3}ch`
                }}
              >
                {sliderIndex + 1} / {notebookMemos.length}
              </span>

              <div className="progress-slider-wrapper">
                <div className="progress-track-bg">
                  <div
                    className="progress-track-fill"
                    style={{
                      width: `${notebookMemos.length > 1 ? (sliderIndex / (notebookMemos.length - 1)) * 100 : 100}%`
                    }}
                  />
                </div>

                {hasDragged && originalIndex !== null && notebookMemos.length > 1 && (
                  <div
                    data-testid="original-index-marker"
                    className="original-index-marker"
                    style={{
                      left: `${(originalIndex / (notebookMemos.length - 1)) * 100}%`
                    }}
                  />
                )}

                <input
                  type="range"
                  className="progress-slider-input"
                  min={0}
                  max={notebookMemos.length > 1 ? notebookMemos.length - 1 : 0}
                  value={sliderIndex}
                  onChange={(e) => {
                    if (!hasDragged) {
                      setOriginalIndex(sliderIndex);
                    }
                    setHasDragged(true);
                    const newIndex = parseInt(e.target.value, 10);
                    setDragSliderIndex(newIndex);
                    if (swiperInstance) {
                      swiperInstance.slideTo(newIndex, 0);
                    }
                  }}
                />

                {notebookMemos.length > 1 && (
                  <div
                    className="progress-slider-thumb"
                    style={{
                      left: `${(sliderIndex / (notebookMemos.length - 1)) * 100}%`
                    }}
                  />
                )}
              </div>

              <IonButton
                data-testid="reset-progress-button"
                className="reset-progress-button"
                fill="clear"
                size="small"
                style={{
                  visibility: hasDragged ? 'visible' : 'hidden'
                }}
                onClick={() => {
                  if (hasDragged && originalIndex !== null && swiperInstance) {
                    const originalMemo = notebookMemos[originalIndex];
                    if (originalMemo) {
                      updateProgress(notebookId, {
                        currentMemoId: originalMemo.id,
                        showExplanation: alwaysShowExplanation
                      });
                    }
                    swiperInstance.slideTo(originalIndex, 0);
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
                sliderIndexRef.current = swiper.activeIndex;
              }}
              modules={[Virtual]}
              virtual={{ addSlidesBefore: 2, addSlidesAfter: 2 }}
              className="swiper-container"
              initialSlide={currentIndex >= 0 ? currentIndex : 0}
              onSlideChangeTransitionEnd={(swiper) => {
                const newMemo = notebookMemos[swiper.activeIndex];
                if (newMemo) {
                  const notebookId_ = notebookId;
                  const alwaysShow = alwaysShowExplanation;
                  requestAnimationFrame(() => {
                    currentMemoIdStore.set(newMemo.id);
                    showExplanationStore.set(alwaysShow);
                    updateProgress(notebookId_, {
                      currentMemoId: newMemo.id,
                      showExplanation: alwaysShow
                    });
                  });
                }
              }}
            >
              {slides}
            </Swiper>
          </div>
        ) : null}

        <IonFab vertical="bottom" horizontal="end" slot="fixed" className="fab-secondary-container">
          <IonFabButton className="fab--secondary" color="secondary" onClick={() => { setEditingMemo(null); setAddMode('paste'); setIsAddOpen(true); }}>
            <IonIcon icon={clipboard} />
          </IonFabButton>
        </IonFab>
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton className="fab--primary" onClick={() => { setEditingMemo(null); setAddMode('add'); setIsAddOpen(true); }}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonPopover isOpen={isMenuOpen} onDidDismiss={() => setIsMenuOpen(false)}>
          <IonItem lines="none">
            <IonLabel>Always show explanation</IonLabel>
            <IonToggle slot="end" checked={alwaysShowExplanation} onIonChange={handleToggleAlwaysShow} />
          </IonItem>
        </IonPopover>

        <IonActionSheet
          isOpen={!!memoActionSheet}
          onDidDismiss={() => setMemoActionSheet(null)}
          buttons={[
            {
              text: 'Copy',
              icon: clipboard,
              handler: handleCopyAll
            },
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
              icon: close,
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
