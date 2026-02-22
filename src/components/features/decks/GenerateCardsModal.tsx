'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Modal } from '@/components/ui/Modal';
import { Sparkles, Loader2, AlertCircle, RotateCcw, Check, X, Pencil, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { FlipCard } from './FlipCard';
import { CardEditForm } from './CardEditForm';

interface GenerateCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckId: Id<"decks">;
}

type Phase = 'input' | 'generating' | 'review' | 'summary';

interface ReviewCard {
  front: string;
  back: string;
  /** undefined = not yet reviewed, true = approved, false = rejected */
  decision?: boolean;
}

const MAX_CARDS = 50;

export function GenerateCardsModal({ isOpen, onClose, deckId }: GenerateCardsModalProps) {
  const settings = useQuery(api.settings.get);
  const generateAction = useAction(api.ai.generateCards);
  const insertAction = useAction(api.ai.insertGeneratedCards);

  const [phase, setPhase] = useState<Phase>('input');
  const [mode, setMode] = useState<'topic' | 'notes'>('topic');
  const [prompt, setPrompt] = useState('');
  const [autoMode, setAutoMode] = useState(true);
  const [countInput, setCountInput] = useState('10');
  const [countError, setCountError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Review state
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');

  const resetState = useCallback(() => {
    setPhase('input');
    setPrompt('');
    setError(null);
    setCountError(null);
    setReviewCards([]);
    setReviewIndex(0);
    setIsFlipped(false);
    setIsEditing(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // ── Input phase helpers ──────────────────────────────────────────────────

  const validateAndGetCount = (): number | null | false => {
    if (autoMode) return null;
    const parsed = parseInt(countInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      setCountError('Enter a number between 1 and 50.');
      return false;
    }
    if (parsed > MAX_CARDS) {
      setCountError(
        `${parsed} is a lot of cards at once. Try splitting your topic into multiple smaller generations (max ${MAX_CARDS} per generation).`
      );
      return false;
    }
    setCountError(null);
    return parsed;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    const count = validateAndGetCount();
    if (count === false) return;
    setPhase('generating');
    setError(null);
    try {
      const cards = await generateAction({
        deckId,
        prompt: prompt.trim(),
        count: count ?? undefined,
      });
      setReviewCards(cards.map((c) => ({ ...c, decision: undefined })));
      setReviewIndex(0);
      setIsFlipped(false);
      setIsEditing(false);
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate cards');
      setPhase('input');
    }
  };

  const handleCountInputChange = (value: string) => {
    setCountInput(value);
    if (countError) setCountError(null);
  };

  // ── Review phase helpers ─────────────────────────────────────────────────

  const currentCard = reviewCards[reviewIndex];

  const openEdit = useCallback(() => {
    if (!currentCard) return;
    setEditFront(currentCard.front);
    setEditBack(currentCard.back);
    setIsEditing(true);
  }, [currentCard]);

  const closeEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const advanceOrFinish = useCallback((nextIndex: number) => {
    if (nextIndex >= reviewCards.length) {
      setPhase('summary');
    } else {
      setReviewIndex(nextIndex);
      setIsFlipped(false);
      setIsEditing(false);
    }
  }, [reviewCards.length]);

  const handleApprove = useCallback(() => {
    // Flush any in-progress edits into the card before saving
    const front = isEditing ? editFront : reviewCards[reviewIndex]?.front ?? '';
    const back  = isEditing ? editBack  : reviewCards[reviewIndex]?.back  ?? '';
    setReviewCards((prev) =>
      prev.map((c, i) => (i === reviewIndex ? { ...c, front, back, decision: true } : c))
    );
    insertCard({ front, back });
    if (isEditing) setIsEditing(false);
    advanceOrFinish(reviewIndex + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editFront, editBack, reviewCards, reviewIndex, advanceOrFinish]);

  const handleReject = useCallback(() => {
    setReviewCards((prev) =>
      prev.map((c, i) => (i === reviewIndex ? { ...c, decision: false } : c))
    );
    advanceOrFinish(reviewIndex + 1);
  }, [reviewIndex, advanceOrFinish]);

  const handleFlip = useCallback(() => {
    if (!isEditing) setIsFlipped((f) => !f);
  }, [isEditing]);

  // Keyboard shortcuts during review
  useEffect(() => {
    if (phase !== 'review' || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only Escape works while a textarea is focused
      const tag = (e.target as HTMLElement).tagName;
      const inTextarea = tag === 'TEXTAREA' || tag === 'INPUT';

      if (e.key === 'Escape') {
        e.preventDefault();
        if (isEditing) closeEdit();
        else handleClose();
        return;
      }
      if (inTextarea) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handleFlip();
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          if (isEditing) closeEdit(); else openEdit();
          break;
        case 'Enter':
          e.preventDefault();
          handleApprove();
          break;
        case 'Backspace':
        case 'Delete':
          e.preventDefault();
          handleReject();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [phase, isOpen, isEditing, handleClose, handleFlip, handleApprove, handleReject, openEdit, closeEdit]);

  // ── Insert a single approved card immediately ────────────────────────────

  const approvedCards = reviewCards.filter((c) => c.decision === true);
  const [savingCount, setSavingCount] = useState(0);

  const insertCard = async (card: { front: string; back: string }) => {
    if (!card.front.trim() || !card.back.trim()) return;
    setSavingCount((n) => n + 1);
    try {
      await insertAction({ deckId, cards: [card] });
    } catch {
      // Non-fatal: the card just won't be saved; the summary will reflect reality
    } finally {
      setSavingCount((n) => n - 1);
    }
  };

  if (!settings) return null;

  // ── Render ───────────────────────────────────────────────────────────────

  // Review and summary phases render their own full-screen overlay (like CardViewerModal),
  // not inside the shared <Modal> wrapper.
  if ((phase === 'review' || phase === 'summary') && reviewCards.length > 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
          onClick={handleClose}
        />

        {/* Card shell */}
        <div className="relative w-full mx-4 max-w-xl">
          <div className="flex-1 h-[80vh] max-h-[600px] flex flex-col bg-surface-primary border border-border-primary rounded-xl shadow-xl overflow-hidden">

            {phase === 'summary' ? (
              /* ── Summary screen ── */
              <>
                <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border-primary">
                  <span className="text-sm font-medium text-text-tertiary">Review complete</span>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" aria-hidden />
                  </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
                  {savingCount > 0 ? (
                    <Loader2 className="w-8 h-8 text-accent-primary animate-spin" aria-hidden />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-accent-primary/10 flex items-center justify-center">
                      <Check className="w-8 h-8 text-accent-primary" aria-hidden />
                    </div>
                  )}
                  <div>
                    <p className="text-2xl font-semibold text-text-primary mb-1">
                      {approvedCards.length} card{approvedCards.length !== 1 ? 's' : ''} added to deck
                    </p>
                    <p className="text-sm text-text-tertiary">
                      {reviewCards.length - approvedCards.length} rejected
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex justify-end px-5 py-3 border-t border-border-primary">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium bg-accent-primary text-text-inverse rounded-lg hover:bg-accent-primary-hover transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              /* ── Per-card review ── */
              <>
                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border-primary">
                  <span className="text-sm text-text-tertiary font-medium">
                    {reviewIndex + 1} / {reviewCards.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={isEditing ? closeEdit : openEdit}
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${
                        isEditing
                          ? 'text-accent-primary bg-accent-primary/10'
                          : 'text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10'
                      }`}
                      aria-label={isEditing ? 'Done editing' : 'Edit card'}
                    >
                      {isEditing ? <ChevronLeft className="w-4 h-4" aria-hidden /> : <Pencil className="w-4 h-4" aria-hidden />}
                    </button>
                    <div className="w-px h-5 bg-border-primary mx-1" aria-hidden />
                    <button
                      type="button"
                      onClick={handleClose}
                      className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                </div>

                {/* Body — flip view or edit view */}
                {isEditing ? (
                  <div className="flex-1 min-h-0 overflow-y-auto p-6">
                    <CardEditForm
                      front={editFront}
                      back={editBack}
                      onFrontChange={setEditFront}
                      onBackChange={setEditBack}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-h-0">
                    <FlipCard
                      front={currentCard?.front}
                      back={currentCard?.back}
                      isFlipped={isFlipped}
                      clickToFlip
                      onFlip={handleFlip}
                    />
                  </div>
                )}

                {/* Footer — reject / flip / approve */}
                <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-border-primary">
                  <button
                    type="button"
                    onClick={handleReject}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-status-error-border bg-status-error-bg text-status-error-text hover:opacity-90 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" aria-hidden />
                    Reject
                  </button>

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={handleFlip}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-surface-secondary border border-border-primary text-text-secondary hover:bg-surface-tertiary transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" aria-hidden />
                      Flip
                    </button>
                  )}
                  {isEditing && <div />}

                  <button
                    type="button"
                    onClick={handleApprove}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-status-success-border bg-status-success-bg text-status-success-text hover:opacity-90 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" aria-hidden />
                    Approve
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Input / generating / loading phases (use the shared Modal wrapper) ───

  const title = 'Generate Cards with AI';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="lg">
      {!settings.hasApiKey ? (
        <div className="text-center py-4">
          <AlertCircle className="w-10 h-10 text-accent-warning mx-auto mb-3" aria-hidden />
          <p className="text-text-secondary mb-4">
            You need an OpenAI API key to generate cards with AI.
          </p>
          <Link
            href="/options"
            className="inline-block bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors"
          >
            Add API Key in Settings
          </Link>
        </div>
      ) : phase === 'generating' ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-accent-primary mx-auto mb-4 animate-spin" aria-hidden />
          <p className="text-text-secondary">Generating cards with AI...</p>
          <p className="text-text-tertiary text-sm mt-1">This may take a few seconds</p>
        </div>
      ) : (
        /* Input phase */
        <div>
          {error && (
            <div className="mb-4 p-3 bg-status-error-bg border border-status-error-border rounded-lg text-sm text-status-error-text">
              {error}
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('topic')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
                mode === 'topic'
                  ? 'bg-accent-primary text-text-inverse'
                  : 'bg-surface-secondary text-text-secondary border border-border-primary hover:bg-surface-tertiary'
              }`}
            >
              Topic
            </button>
            <button
              onClick={() => setMode('notes')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
                mode === 'notes'
                  ? 'bg-accent-primary text-text-inverse'
                  : 'bg-surface-secondary text-text-secondary border border-border-primary hover:bg-surface-tertiary'
              }`}
            >
              Paste Notes
            </button>
          </div>

          {/* Prompt input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              {mode === 'topic' ? 'Topic' : 'Notes'}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              placeholder={
                mode === 'topic'
                  ? 'e.g., Spanish food vocabulary, Japanese hiragana, French past tense...'
                  : 'Paste your notes, vocabulary lists, or study material here...'
              }
              className="w-full bg-surface-secondary border border-border-primary rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>

          {/* Card count */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Number of cards
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoMode(true)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
                  autoMode
                    ? 'bg-accent-primary text-text-inverse'
                    : 'bg-surface-secondary text-text-secondary border border-border-primary hover:bg-surface-tertiary'
                }`}
              >
                Auto
              </button>
              <span className="text-text-tertiary text-xs">or</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={MAX_CARDS}
                  value={countInput}
                  onFocus={() => setAutoMode(false)}
                  onChange={(e) => {
                    setAutoMode(false);
                    handleCountInputChange(e.target.value);
                  }}
                  className={`w-20 bg-surface-secondary border rounded-md px-2 py-1.5 text-sm text-text-primary text-center focus:outline-none focus:ring-2 focus:ring-accent-primary transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    !autoMode
                      ? 'border-accent-primary ring-1 ring-accent-primary'
                      : 'border-border-primary'
                  }`}
                  aria-label="Custom card count"
                />
                <span className="text-xs text-text-tertiary">cards (max {MAX_CARDS})</span>
              </div>
            </div>
            {autoMode && (
              <p className="mt-2 text-xs text-text-tertiary">
                AI will analyze your content and decide how many cards to generate (up to 50).
              </p>
            )}
            {countError && (
              <div className="mt-2 p-2.5 bg-status-warning-bg border border-status-warning-border rounded-lg text-xs text-status-warning-text">
                {countError}
              </div>
            )}
          </div>

          {/* Generate button */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              className="inline-flex items-center gap-2 bg-accent-primary text-text-inverse px-4 py-2 rounded-md text-sm font-medium hover:bg-accent-primary-hover transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" aria-hidden />
              Generate Cards
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
