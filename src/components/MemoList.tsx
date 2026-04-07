import { Memo } from '../types/memo';
import clsx from 'clsx';
import { useState, useRef, useEffect } from 'react';

interface MemoListProps {
  memos: Memo[];
  showExplanation: boolean;
  alwaysShowExplanation: boolean;
  currentMemoId: string | null;
  onToggleExplanation: () => void;
  onNavigate: (memoId: string) => void;
  onAdd: () => void;
  onPaste: () => void;
  onEdit: (memo: Memo) => void;
  onDelete: (memoId: string) => void;
}

const MemoList = ({
  memos,
  showExplanation,
  alwaysShowExplanation,
  currentMemoId,
  onToggleExplanation,
  onNavigate,
  onAdd,
  onPaste,
  onEdit,
  onDelete
}: MemoListProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentIndex = memos.findIndex(m => m.id === currentMemoId);
  const currentMemo = memos[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < memos.length - 1;

  // Swipe gesture refs and state
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const currentOffsetRef = useRef(0);
  const swipeActiveRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [swipeState, setSwipeState] = useState<'idle' | 'swiping' | 'navigating'>('idle');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const SWIPE_THRESHOLD = 30;
  const ELASTIC_FACTOR = 0.3;

  const handlePointerDown = (e: React.PointerEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
    currentOffsetRef.current = 0;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!swipeStartRef.current) return;

    const deltaX = e.clientX - swipeStartRef.current.x;
    const deltaY = e.clientY - swipeStartRef.current.y;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      if (!swipeActiveRef.current) {
        swipeActiveRef.current = true;
        setSwipeState('swiping');
      }
      e.preventDefault();

      let offset = deltaX;
      if ((deltaX > 0 && !canGoPrev) || (deltaX < 0 && !canGoNext)) {
        offset = deltaX * ELASTIC_FACTOR;
      }

      currentOffsetRef.current = offset;
      if (cardRef.current) {
        cardRef.current.style.transform = `translateX(${offset}px)`;
        cardRef.current.style.transition = 'none';
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const offset = currentOffsetRef.current;
    const selection = window.getSelection();
    const hasTextSelection = selection && selection.toString().length > 0;
    const isMinimalMovement = Math.abs(offset) < 10;
    const isMenuClick = menuRef.current && menuRef.current.contains(e.target as Node);

    if (cardRef.current) {
      cardRef.current.style.transition = reducedMotion ? 'none' : 'transform 0.2s ease';
    }

    if (!swipeActiveRef.current) {
      if (!hasTextSelection && isMinimalMovement && e.button === 0 && !isMenuClick) {
        onToggleExplanation();
      }
      swipeStartRef.current = null;
      currentOffsetRef.current = 0;
      return;
    }

    swipeActiveRef.current = false;

    if (hasTextSelection || isMinimalMovement) {
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateX(0)';
      }
      setTimeout(() => {
        setSwipeState('idle');
        if (cardRef.current) {
          cardRef.current.style.transform = '';
          cardRef.current.style.transition = '';
        }
        if (!hasTextSelection && isMinimalMovement && !isMenuClick) {
          onToggleExplanation();
        }
      }, 50);
      swipeStartRef.current = null;
      currentOffsetRef.current = 0;
      return;
    }

    const threshold = SWIPE_THRESHOLD;
    let navigate = false;
    let direction: 'prev' | 'next' | null = null;

    if (offset > threshold && canGoPrev) {
      navigate = true;
      direction = 'prev';
    } else if (offset < -threshold && canGoNext) {
      navigate = true;
      direction = 'next';
    }

    if (navigate && direction) {
      setSwipeState('navigating');
      if (cardRef.current) {
        const slideOutX = direction === 'next' ? -500 : 500;
        cardRef.current.style.transform = `translateX(${slideOutX}px)`;
      }

      // Hide explanation when swiping if alwaysShowExplanation is not enabled
      if (!alwaysShowExplanation && showExplanation) {
        onToggleExplanation();
      }

      setTimeout(() => {
        if (direction === 'prev' && currentIndex > 0) {
          onNavigate(memos[currentIndex - 1].id);
        } else if (direction === 'next' && currentIndex < memos.length - 1) {
          onNavigate(memos[currentIndex + 1].id);
        }
        setSwipeState('idle');
        if (cardRef.current) {
          cardRef.current.style.transform = '';
          cardRef.current.style.transition = '';
        }
      }, 200);
    } else {
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateX(0)';
      }
      setTimeout(() => {
        setSwipeState('idle');
        if (cardRef.current) {
          cardRef.current.style.transform = '';
          cardRef.current.style.transition = '';
        }
      }, 200);
    }

    swipeStartRef.current = null;
    currentOffsetRef.current = 0;
  };

  const handlePointerCancel = () => {
    swipeActiveRef.current = false;
    setSwipeState('idle');
    if (cardRef.current) {
      cardRef.current.style.transition = reducedMotion ? 'none' : 'transform 0.2s ease';
      cardRef.current.style.transform = 'translateX(0)';
      setTimeout(() => {
        if (cardRef.current) {
          cardRef.current.style.transform = '';
          cardRef.current.style.transition = '';
        }
      }, 200);
    }
  };

  const handleEdit = () => {
    setIsMenuOpen(false);
    if (currentMemo) onEdit(currentMemo);
  };

  const handleDelete = () => {
    setIsMenuOpen(false);
    if (currentMemo) onDelete(currentMemo.id);
  };

  if (memos.length === 0) {
    return (
      <div className="memo-view empty">
        <p className="empty-message">No memos in this notebook.</p>
        <button type="button" className="btn-primary" onClick={onAdd}>
          Add Your First Memo
        </button>
      </div>
    );
  }

  return (
    <div className="memo-view">
      <div className="memo-view__progress">
        <span>{currentIndex + 1} / {memos.length}</span>
        <div className="progress-bar">
          <div
            className="progress-bar__fill"
            style={{ width: `${((currentIndex + 1) / memos.length) * 100}%` }}
          />
        </div>
      </div>

      <div
        ref={cardRef}
        className={clsx('memo-card', {
          'memo-card--swiping': swipeState === 'swiping',
          'memo-card--navigating': swipeState === 'navigating'
        })}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className="memo-card__header">
          <p className="memo-card__original">{currentMemo?.originalText}</p>
          <div className="memo-card__menu" ref={menuRef}>
            <button
              type="button"
              className="memo-card__menu-btn"
              onClick={() => setIsMenuOpen(v => !v)}
            >
              ⋮
            </button>
            {isMenuOpen && (
              <div className="memo-card__menu-dropdown">
                <button type="button" onClick={handleEdit}>
                  Edit
                </button>
                <button type="button" onClick={handleDelete} className="danger">
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="memo-card__content">
          {showExplanation && (
            <p className="memo-card__explanation">{currentMemo?.explanation}</p>
          )}
        </div>
      </div>

      {/* Floating Action Buttons */}
      <button
        type="button"
        className="fab fab--primary"
        onClick={onAdd}
        aria-label="Add memo"
      >
        +
      </button>
      <button
        type="button"
        className="fab fab--secondary"
        onClick={onPaste}
        aria-label="Paste from clipboard"
      >
        📋
      </button>
    </div>
  );
};

export default MemoList;
