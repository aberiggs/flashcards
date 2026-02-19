'use client';

import { useState } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Modal } from '@/components/ui/Modal';
import { Sparkles, Trash2, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface GenerateCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckId: Id<"decks">;
}

type Phase = 'input' | 'generating' | 'preview' | 'inserting';

export function GenerateCardsModal({ isOpen, onClose, deckId }: GenerateCardsModalProps) {
  const settings = useQuery(api.settings.get);
  const generateAction = useAction(api.ai.generateCards);
  const insertAction = useAction(api.ai.insertGeneratedCards);

  const [phase, setPhase] = useState<Phase>('input');
  const [mode, setMode] = useState<'topic' | 'notes'>('topic');
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(10);
  const [generatedCards, setGeneratedCards] = useState<Array<{ front: string; back: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setPhase('input');
    setPrompt('');
    setGeneratedCards([]);
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setPhase('generating');
    setError(null);
    try {
      const cards = await generateAction({ deckId, prompt: prompt.trim(), count });
      setGeneratedCards(cards);
      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate cards');
      setPhase('input');
    }
  };

  const handleRemoveCard = (index: number) => {
    setGeneratedCards((cards) => cards.filter((_, i) => i !== index));
  };

  const handleEditCard = (index: number, field: 'front' | 'back', value: string) => {
    setGeneratedCards((cards) =>
      cards.map((card, i) => (i === index ? { ...card, [field]: value } : card))
    );
  };

  const handleInsert = async () => {
    const validCards = generatedCards.filter(
      (c) => c.front.trim() !== '' && c.back.trim() !== ''
    );
    if (validCards.length === 0) return;
    setPhase('inserting');
    try {
      await insertAction({ deckId, cards: validCards });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add cards');
      setPhase('preview');
    }
  };

  if (!settings) return null;

  const title =
    phase === 'preview' || phase === 'inserting'
      ? `Review Cards (${generatedCards.length})`
      : 'Generate Cards with AI';

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
      ) : phase === 'preview' || phase === 'inserting' ? (
        <div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-3 max-h-[50vh] overflow-y-auto mb-4">
            {generatedCards.map((card, index) => (
              <div
                key={index}
                className="border border-border-primary rounded-lg p-3 bg-surface-secondary"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="text-xs text-text-tertiary">Front</label>
                      <textarea
                        value={card.front}
                        onChange={(e) => handleEditCard(index, 'front', e.target.value)}
                        rows={2}
                        className="w-full bg-surface-primary border border-border-primary rounded px-2 py-1.5 text-sm text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-accent-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-tertiary">Back</label>
                      <textarea
                        value={card.back}
                        onChange={(e) => handleEditCard(index, 'back', e.target.value)}
                        rows={2}
                        className="w-full bg-surface-primary border border-border-primary rounded px-2 py-1.5 text-sm text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-accent-primary"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCard(index)}
                    className="text-text-tertiary hover:text-accent-error transition-colors p-1 cursor-pointer"
                    aria-label="Remove card"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {generatedCards.length === 0 ? (
            <p className="text-text-tertiary text-sm text-center py-4">
              All cards removed. Go back to generate again.
            </p>
          ) : null}

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setPhase('input'); setGeneratedCards([]); }}
              className="px-4 py-2 text-sm text-text-secondary border border-border-primary rounded-md hover:bg-surface-secondary transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleInsert}
              disabled={generatedCards.length === 0 || phase === 'inserting'}
              className="inline-flex items-center gap-2 bg-accent-primary text-text-inverse px-4 py-2 rounded-md text-sm font-medium hover:bg-accent-primary-hover transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {phase === 'inserting' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  Adding...
                </>
              ) : (
                <>Add {generatedCards.length} Cards</>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Input phase */
        <div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
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
          {mode === 'topic' ? (
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Topic
              </label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && prompt.trim()) handleGenerate();
                }}
                placeholder="e.g., Spanish food vocabulary, Japanese hiragana, French past tense..."
                className="w-full bg-surface-secondary border border-border-primary rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Notes
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                placeholder="Paste your notes, vocabulary lists, or study material here..."
                className="w-full bg-surface-secondary border border-border-primary rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
            </div>
          )}

          {/* Card count */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Number of cards
            </label>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
                    count === n
                      ? 'bg-accent-primary text-text-inverse'
                      : 'bg-surface-secondary text-text-secondary border border-border-primary hover:bg-surface-tertiary'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
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
