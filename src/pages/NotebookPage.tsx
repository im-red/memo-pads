import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
import AddMemoOverlay, { MemoEntry } from '../components/AddMemoOverlay';
import { ScopedTimer, useWhyDidYouUpdate } from '../utils/debug';

import './NotebookPage.scss';

interface MemoSlideContentProps {
  memo: Memo;
  defaultShowExplanation: boolean;
  onMenuAction: (memo: Memo) => void;
  onCopyText: (text: string) => void;
}

const MemoSlideContent = React.memo(({
  memo, defaultShowExplanation, onMenuAction, onCopyText,
}: MemoSlideContentProps) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showExplanation, setShowExplanation] = useState(defaultShowExplanation);

  // Reset to default when the app-level setting changes
  useEffect(() => {
    setShowExplanation(defaultShowExplanation);
  }, [defaultShowExplanation]);

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
    <div onClick={() => setShowExplanation(!showExplanation)} className="memo-card">
      <IonButton fill="clear" color="medium" className="memo-card-menu-btn"
        onClick={(e) => { e.stopPropagation(); onMenuAction(memo); }}>
        <IonIcon slot="icon-only" icon={ellipsisVertical} />
      </IonButton>
      <div className="memo-card-text" {...handlers.textHandlers}>
        {memo.originalText}
      </div>
      {showExplanation && (
        <div className="memo-card-explanation" {...handlers.explanationHandlers}>
          {memo.explanation}
        </div>
      )}
    </div>
  );
});

const MemoListItem = React.memo(({
  memo, index, currentMemoId, onJump,
}: {
  memo: Memo;
  index: number;
  currentMemoId: string | null;
  onJump: (memo: Memo) => void;
}) => (
  <IonItem button lines="none" detail={memo.id === currentMemoId} onClick={() => onJump(memo)} style={{ height: `${ITEM_HEIGHT}px` }}>
    <IonLabel style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <small style={{ color: 'var(--ion-color-medium)' }}>{index + 1}. </small>
      <span style={{ fontWeight: memo.id === currentMemoId ? 600 : 400 }}>
        {memo.originalText}
      </span>
    </IonLabel>
  </IonItem>
));

const ITEM_HEIGHT = 46;
const OVERSCAN = 6;

const MemoListContent = React.memo(({
  memos, currentMemoId, onJump,
}: {
  memos: Memo[];
  currentMemoId: string | null;
  onJump: (memo: Memo) => void;
}) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ start: 0, end: 40 });

  useEffect(() => {
    const el = anchorRef.current?.parentElement;
    if (!el) return;

    const update = () => {
      const st = el.scrollTop;
      const h = el.clientHeight;
      const start = Math.max(0, Math.floor(st / ITEM_HEIGHT) - OVERSCAN);
      const visible = Math.ceil(h / ITEM_HEIGHT) + OVERSCAN * 2;
      setRange({ start, end: Math.min(memos.length, start + visible) });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, [memos.length]);

  const totalHeight = memos.length * ITEM_HEIGHT;
  const offsetY = range.start * ITEM_HEIGHT;

  return (
    <div ref={anchorRef} style={{ height: totalHeight, position: 'relative' }}>
      <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
        {memos.slice(range.start, range.end).map((memo, i) => (
          <MemoListItem
            key={memo.id}
            memo={memo}
            index={range.start + i}
            currentMemoId={currentMemoId}
            onJump={onJump}
          />
        ))}
      </div>
    </div>
  );
});

const NotebookPage: React.FC = () => {
  using _ = new ScopedTimer('NotebookPage render');
  const { id: notebookId } = useParams<{ id: string }>();
  const history = useHistory();
  const { notebooks, memos, deleteMemo, addMemo, editMemo, defaultShowExplanation, setDefaultShowExplanation } = useApp();
  const { viewProgress, updateProgress } = useProgress();

  const currentMemoId = useMemo(() => viewProgress[notebookId]?.currentMemoId ?? null, [viewProgress, notebookId]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<'add' | 'paste'>('add');
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMemoListOpen, setIsMemoListOpen] = useState(false);
  const [memoListEvent, setMemoListEvent] = useState<{ clientX: number; clientY: number } | null>(null);
  const memoListScrollRef = useRef<HTMLDivElement>(null);
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

  const sliderIndex = currentIndex >= 0 ? currentIndex : 0;

  const handleToggleDefaultShow = (e?: CustomEvent) => {
    const checked = e?.detail?.checked ?? !defaultShowExplanation;
    setDefaultShowExplanation(checked);
  };

  const handleJumpToMemo = useCallback((memo: Memo) => {
    const index = notebookMemos.findIndex(m => m.id === memo.id);
    if (index >= 0 && swiperInstance) {
      updateProgress(notebookId, { currentMemoId: memo.id });
      swiperInstance.slideTo(index, 0);
    }
    setIsMemoListOpen(false);
  }, [notebookMemos, swiperInstance, notebookId, updateProgress]);

  const handleAdd = async (entries: MemoEntry[]) => {
    for (const entry of entries) {
      await addMemo(notebookId, entry.originalText, entry.explanation);
    }
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
          defaultShowExplanation={defaultShowExplanation}
          onMenuAction={setMemoActionSheet}
          onCopyText={handleCopyText}
        />
      </SwiperSlide>
    )),
    [notebookMemos, defaultShowExplanation, handleCopyText]
  );

  if (!notebook && notebooks.length > 0) {
    history.replace('/');
    return null;
  }

  useWhyDidYouUpdate('NotebookPage', {
    notebookId,
    notebooks,
    memos,
    defaultShowExplanation,
    viewProgress,
    currentMemoId,
    initialMemoId,
    notebook,
    notebookMemos,
    currentIndex,
    currentMemo,
    isAddOpen,
    addMode,
    editingMemo,
    isMenuOpen,
    memoActionSheet,
    originalIndex,
    hasDragged,
    sliderIndex,
    slides,
  })

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
                      updateProgress(notebookId, { currentMemoId: originalMemo.id });
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
              modules={[Virtual]}
              virtual={{ addSlidesBefore: 2, addSlidesAfter: 2 }}
              className="swiper-container"
              initialSlide={currentIndex >= 0 ? currentIndex : 0}
              onSlideChangeTransitionEnd={(swiper) => {
                const newMemo = notebookMemos[swiper.activeIndex];
                if (newMemo) {
                  updateProgress(notebookId, { currentMemoId: newMemo.id });
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

        <IonPopover isOpen={isMenuOpen} onDidDismiss={() => setIsMenuOpen(false)} style={{ '--min-width': '260px' } as React.CSSProperties}>
          <IonItem lines="none">
            <IonLabel style={{ whiteSpace: 'nowrap' }}>Default show explanation</IonLabel>
            <IonToggle slot="end" checked={defaultShowExplanation} onIonChange={handleToggleDefaultShow} />
          </IonItem>
          <IonItem button detail lines="none" onClick={() => { setIsMenuOpen(false); setMemoListEvent({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }); setIsMemoListOpen(true); }}>
            <IonLabel>View all memos ({notebookMemos.length})</IonLabel>
          </IonItem>
        </IonPopover>

        <IonPopover
          isOpen={isMemoListOpen}
          event={memoListEvent}
          onDidPresent={() => {
            const el = memoListScrollRef.current;
            if (!el || !currentMemoId) {
              return;
            }
            const index = notebookMemos.findIndex(m => m.id === currentMemoId);
            if (index < 0) {
              return;
            }
            const h = el.clientHeight;
            const target = index * ITEM_HEIGHT - h / 2 + ITEM_HEIGHT / 2;
            const clamped = Math.max(0, Math.min(target, notebookMemos.length * ITEM_HEIGHT - h));
            el.scrollTop = clamped;
            el.style.visibility = 'visible';
          }}
          onDidDismiss={() => { setIsMemoListOpen(false); setMemoListEvent(null); }}
          style={{ '--min-width': '280px', '--height': '60vh' } as React.CSSProperties}
        >
          <div className="memo-list-popover" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="ion-padding-horizontal ion-padding-top" style={{ flexShrink: 0 }}>
              <IonText color="medium">
                <small>{notebookMemos.length} memos in {notebook?.name}</small>
              </IonText>
            </div>
            <div ref={memoListScrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', visibility: 'hidden' }}>
              <MemoListContent memos={notebookMemos} currentMemoId={currentMemoId} onJump={handleJumpToMemo} />
            </div>
          </div>
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
