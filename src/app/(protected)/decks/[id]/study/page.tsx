'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, Check, HelpCircle, Lightbulb, X, AlertCircle } from 'lucide-react';
import {
  useDeck,
  useCards,
  useDueCards,
  useRecordReview,
  useStartSession,
  useCompleteSession,
  type Card,
} from '@/lib/hooks';
import { api } from '@/lib/api';
import { qualityFromConfidence, type ConfidenceLevel } from '@/lib/sm2';
import { sortDueCards } from '@/lib/sortDueCards';
import { Card as CardUi } from '@/components/ui/Card';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import Link from 'next/link';

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tagName = target.tagName;
    return target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

export default function StudyPage() {
    const { id } = useParams();
    const deckId = Number(id as string);

    const { data: deck, isLoading: deckLoading } = useDeck(deckId);
    const { data: dueCards, isLoading: dueLoading } = useDueCards(deckId);
    const { data: allCards } = useCards(deckId);
    const recordReviewMutation = useRecordReview(deckId);
    const startSessionMutation = useStartSession(deckId);
    const completeSessionMutation = useCompleteSession(deckId);

    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [cardsCorrect, setCardsCorrect] = useState(0);
    const [cardsIncorrect, setCardsIncorrect] = useState(0);
    // Freeze study order at session start so refetches don't re-sort mid-session.
    const [sessionCards, setSessionCards] = useState<Card[] | null>(null);
    const confidenceLockRef = useRef(false);

    // Keep a ref to current session state so the cleanup effect can read it without stale closures
    const sessionStateRef = useRef({ sessionId: null as number | null, cardsCorrect: 0, cardsIncorrect: 0, sessionComplete: false });
    sessionStateRef.current = { sessionId, cardsCorrect, cardsIncorrect, sessionComplete };

    useEffect(() => {
        if (dueCards && dueCards.length > 0 && sessionCards === null && !sessionComplete) {
            setSessionCards(sortDueCards(dueCards));
            startSessionMutation.mutateAsync().then((res) => setSessionId(res.id));
        }
    }, [dueCards, sessionCards, sessionComplete, startSessionMutation]);

    // Complete the session if the user navigates away mid-session.
    // Uses keepalive so the request survives the page unload.
    useEffect(() => {
        return () => {
            const { sessionId: sid, cardsCorrect: correct, cardsIncorrect: incorrect, sessionComplete: done } = sessionStateRef.current;
            const reviewed = correct + incorrect;
            if (sid && !done && reviewed > 0) {
                api.patchKeepalive(`/api/decks/${deckId}/study`, {
                    sessionId: sid,
                    cardsStudied: reviewed,
                    cardsCorrect: correct,
                    cardsIncorrect: incorrect,
                });
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const studyCards = sessionCards ?? [];
    const currentCard = studyCards[currentCardIndex];
    const progress = studyCards.length > 0 ? ((currentCardIndex + 1) / studyCards.length) * 100 : 0;

    const handleConfidence = useCallback(async (confidence: ConfidenceLevel) => {
        if (!currentCard || confidenceLockRef.current) return;
        confidenceLockRef.current = true;

        try {
            const quality = qualityFromConfidence(confidence);
            const isCorrect = quality >= 3;

            if (isCorrect) {
                setCardsCorrect((c) => c + 1);
            } else {
                setCardsIncorrect((c) => c + 1);
            }

            await recordReviewMutation.mutateAsync({
                cardId: currentCard.id,
                confidence,
            });

            if (currentCardIndex < studyCards.length - 1) {
                setCurrentCardIndex(currentCardIndex + 1);
                setShowAnswer(false);
            } else {
                const finalCorrect = isCorrect ? cardsCorrect + 1 : cardsCorrect;
                const finalIncorrect = isCorrect ? cardsIncorrect : cardsIncorrect + 1;
                if (sessionId) {
                    await completeSessionMutation.mutateAsync({
                        sessionId,
                        cardsStudied: studyCards.length,
                        cardsCorrect: finalCorrect,
                        cardsIncorrect: finalIncorrect,
                    });
                }
                setSessionComplete(true);
            }
        } finally {
            confidenceLockRef.current = false;
        }
    }, [
        cardsCorrect,
        cardsIncorrect,
        completeSessionMutation,
        currentCard,
        currentCardIndex,
        recordReviewMutation,
        sessionId,
        studyCards.length,
    ]);

    const handleShowAnswer = useCallback(() => {
        setShowAnswer(true);
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (isTypingTarget(event.target)) return;
            if (event.repeat) return;
            if (!currentCard || sessionComplete) return;

            if (event.key === ' ' && !showAnswer) {
                event.preventDefault();
                handleShowAnswer();
                return;
            }

            if (event.key === '1' || event.key === '2' || event.key === '3' || event.key === '4') {
                if (!showAnswer) return;
                event.preventDefault();
                if (event.key === '1') {
                    void handleConfidence('wrong');
                    return;
                }
                if (event.key === '2') {
                    void handleConfidence('close');
                    return;
                }
                if (event.key === '3') {
                    void handleConfidence('hard');
                    return;
                }
                void handleConfidence('easy');
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [currentCard, sessionComplete, showAnswer, handleShowAnswer, handleConfidence]);

    // Loading state (include brief init when cards loaded but session order not yet frozen)
    if (deckLoading || dueLoading || (dueCards && dueCards.length > 0 && sessionCards === null && !sessionComplete)) {
        return (
            <div className="flex-1 bg-background text-foreground">
                <AppHeader title="Study" backHref="/decks" backLabel="Decks" />
                <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <PageLoader message="Loading…" />
                </main>
            </div>
        );
    }

    if (!deck) {
        return (
            <div className="flex-1 bg-background text-foreground">
                <AppHeader title="Study" backHref="/decks" backLabel="Decks" />
                <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-text-primary mb-4">Deck not found</h1>
                        <Link
                            href="/decks"
                            className="inline-block bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors"
                        >
                            Back to Decks
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    const hasNoCards = (allCards ?? []).length === 0;
    const hasNoDueCards = (dueCards ?? []).length === 0;
    const hasCardsToStudy = studyCards.length > 0;

    if (!hasCardsToStudy) {
        if (hasNoCards) {
            return (
                <div className="flex-1 bg-background text-foreground">
                    <AppHeader
                        title={`Studying: ${deck.name}`}
                        backHref="/decks"
                        backLabel="Decks"
                    />
                    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-surface-secondary rounded-full flex items-center justify-center">
                                <BookOpen className="w-8 h-8 text-text-tertiary" aria-hidden />
                            </div>
                            <h1 className="text-2xl font-bold text-text-primary mb-2">No cards to study</h1>
                            <p className="text-text-secondary mb-6">This deck doesn&apos;t have any cards yet.</p>
                            <Link
                                href={`/decks/${deck.id}`}
                                className="inline-block bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors"
                            >
                                Add Cards
                            </Link>
                        </div>
                    </main>
                </div>
            );
        }
        if (hasNoDueCards && !sessionComplete) {
            return (
                <div className="flex-1 bg-background text-foreground">
                    <AppHeader
                        title={`Studying: ${deck.name}`}
                        backHref="/decks"
                        backLabel="Decks"
                    />
                    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-surface-secondary rounded-full flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-text-tertiary" aria-hidden />
                            </div>
                            <h1 className="text-2xl font-bold text-text-primary mb-2">No cards due today</h1>
                            <p className="text-text-secondary mb-6">
                                All cards in this deck are scheduled for later. Come back when they&apos;re due.
                            </p>
                            <Link
                                href="/decks"
                                className="inline-block bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors"
                            >
                                Back to Decks
                            </Link>
                        </div>
                    </main>
                </div>
            );
        }
    }

    if (sessionComplete) {
        return (
            <div className="flex-1 bg-background text-foreground flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-status-success-bg rounded-full flex items-center justify-center">
                        <Check className="w-8 h-8 text-status-success-text" aria-hidden />
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary mb-2">Study session complete!</h1>
                    <p className="text-text-secondary mb-2">Great job studying {studyCards.length} cards.</p>
                    <p className="text-text-tertiary mb-6">
                        {cardsCorrect} correct, {cardsIncorrect} to review again
                    </p>
                    <Link
                        href="/decks"
                        className="inline-block bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors"
                    >
                        Back to Decks
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-background text-foreground">
            <AppHeader
                title={`Studying: ${deck.name}`}
                backHref="/decks"
                backLabel="Decks"
            />

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Floating Progress Bar */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-text-secondary">Progress</span>
                        <span className="text-sm text-text-secondary">
                            {currentCardIndex + 1} of {studyCards.length}
                        </span>
                    </div>
                    <div className="h-2 bg-border-primary rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent-primary transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
                <CardUi variant="default" className="min-h-[300px] sm:min-h-[400px] flex flex-col">
                    <div className="flex-1 flex flex-col justify-center">
                        {!showAnswer ? (
                            // Front of card
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-6 bg-surface-secondary rounded-full flex items-center justify-center">
                                    <HelpCircle className="w-6 h-6 text-text-tertiary" aria-hidden />
                                </div>
                                <h2 className="text-2xl font-semibold text-text-primary mb-4">
                                    Question
                                </h2>
                                <div className="text-lg text-text-secondary mb-8 leading-relaxed">
                                    <MarkdownContent content={currentCard.front} />
                                </div>
                                <button
                                    onClick={handleShowAnswer}
                                    className="bg-accent-primary text-text-inverse px-6 py-3 rounded-md hover:bg-accent-primary-hover transition-colors text-lg font-medium cursor-pointer"
                                >
                                    Show Answer
                                </button>
                                <p className="mt-3 text-xs text-text-tertiary">Shortcut: Space reveals answer</p>
                            </div>
                        ) : (
                            // Back of card with confidence buttons
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-6 bg-surface-secondary rounded-full flex items-center justify-center">
                                    <Lightbulb className="w-6 h-6 text-text-tertiary" aria-hidden />
                                </div>
                                <h2 className="text-2xl font-semibold text-text-primary mb-4">
                                    Answer
                                </h2>
                                <div className="text-lg text-text-secondary mb-8 leading-relaxed">
                                    <MarkdownContent content={currentCard.back} />
                                </div>

                                <div className="space-y-4">
                                    <p className="text-text-tertiary font-medium">
                                        How did you do?
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-md mx-auto w-full">
                                        <button
                                            onClick={() => handleConfidence('wrong')}
                                            className="flex flex-col items-center justify-center gap-2 bg-status-error-bg text-status-error-text border border-status-error-border px-4 py-4 rounded-lg hover:opacity-90 transition-colors cursor-pointer"
                                        >
                                            <X className="w-5 h-5 shrink-0" aria-hidden />
                                            <span className="font-medium">Wrong</span>
                                            <span className="text-xs opacity-80">1</span>
                                        </button>
                                        <button
                                            onClick={() => handleConfidence('close')}
                                            className="flex flex-col items-center justify-center gap-2 bg-status-close-bg text-status-close-text border border-status-close-border px-4 py-4 rounded-lg hover:opacity-90 transition-colors cursor-pointer"
                                        >
                                            <AlertCircle className="w-5 h-5 shrink-0" aria-hidden />
                                            <span className="font-medium">Close</span>
                                            <span className="text-xs opacity-80">2</span>
                                        </button>
                                        <button
                                            onClick={() => handleConfidence('hard')}
                                            className="flex flex-col items-center justify-center gap-2 bg-status-warning-bg text-status-warning-text border border-status-warning-border px-4 py-4 rounded-lg hover:opacity-90 transition-colors cursor-pointer"
                                        >
                                            <HelpCircle className="w-5 h-5 shrink-0" aria-hidden />
                                            <span className="font-medium">Hard</span>
                                            <span className="text-xs opacity-80">3</span>
                                        </button>
                                        <button
                                            onClick={() => handleConfidence('easy')}
                                            className="flex flex-col items-center justify-center gap-2 bg-status-success-bg text-status-success-text border border-status-success-border px-4 py-4 rounded-lg hover:opacity-90 transition-colors cursor-pointer"
                                        >
                                            <Check className="w-5 h-5 shrink-0" aria-hidden />
                                            <span className="font-medium">Easy</span>
                                            <span className="text-xs opacity-80">4</span>
                                        </button>
                                    </div>
                                    <p className="text-xs text-text-tertiary">Shortcuts: 1-4 rate confidence</p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardUi>
            </main>
        </div>
    );
}