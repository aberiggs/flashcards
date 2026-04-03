'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, Check, Flame, HelpCircle, Lightbulb, RotateCcw, X } from 'lucide-react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import type { Doc, Id } from '../../../../../../convex/_generated/dataModel';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { PageLoader } from '@/components/ui/PageLoader';
import Link from 'next/link';

function shuffleCards<T>(items: T[]): T[] {
    const next = [...items];
    for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
}

function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tagName = target.tagName;
    return target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

type CramCard = Doc<"cards">;

export default function CramPage() {
    const { id } = useParams();
    const deckId = id as Id<"decks">;

    const deck = useQuery(api.decks.get, { id: deckId });
    const allCards = useQuery(api.cards.getByDeck, { deckId });
    const settings = useQuery(api.settings.get);
    const orderCramCardsAction = useAction(api.ai.orderCramCards);
    const startSessionMutation = useMutation(api.sessions.startSession);
    const completeSessionMutation = useMutation(api.sessions.completeSession);
    const recordEventMutation = useMutation(api.sessions.recordEvent);

    const [roundCards, setRoundCards] = useState<CramCard[] | null>(null);
    const [nextRoundCards, setNextRoundCards] = useState<CramCard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [roundNumber, setRoundNumber] = useState(1);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [sessionId, setSessionId] = useState<Id<"studySessions"> | null>(null);
    const [startTimeMs, setStartTimeMs] = useState<number | null>(null);
    const [endTimeMs, setEndTimeMs] = useState<number | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [totalAttempts, setTotalAttempts] = useState(0);
    const [totalGotIt, setTotalGotIt] = useState(0);
    const [totalMissed, setTotalMissed] = useState(0);
    const [missesByCard, setMissesByCard] = useState<Record<string, number>>({});
    const [isPreparingOrder, setIsPreparingOrder] = useState(false);

    const initialCardCountRef = useRef(0);
    const sessionStateRef = useRef({ sessionId: null as Id<"studySessions"> | null, totalAttempts: 0, totalGotIt: 0, sessionComplete: false });
    sessionStateRef.current = { sessionId, totalAttempts, totalGotIt, sessionComplete };

    useEffect(() => {
        if (!allCards || allCards.length === 0 || roundCards !== null || sessionComplete) {
            return;
        }

        let cancelled = false;

        const initialize = async () => {
            setIsPreparingOrder(true);

            const shuffled = shuffleCards(allCards);
            let orderedCards = shuffled;

            if (settings?.hasApiKey) {
                try {
                    const orderedIds = await orderCramCardsAction({
                        cards: shuffled.map((card) => ({
                            cardId: card._id,
                            front: card.front,
                            back: card.back,
                            repetitions: card.repetitions,
                            efactor: card.efactor,
                            nextReview: card.nextReview,
                        })),
                    });

                    const byId = new Map(shuffled.map((card) => [card._id, card]));
                    orderedCards = orderedIds
                        .map((orderedId) => byId.get(orderedId))
                        .filter((card): card is CramCard => card !== undefined);

                    if (orderedCards.length === 0) {
                        orderedCards = shuffled;
                    }
                } catch {
                    orderedCards = shuffled;
                }
            }

            if (cancelled) return;

            setRoundCards(orderedCards);
            setNextRoundCards([]);
            setCurrentIndex(0);
            setRoundNumber(1);
            setShowAnswer(false);
            initialCardCountRef.current = orderedCards.length;

            const startedAt = Date.now();
            setStartTimeMs(startedAt);
            setElapsedSeconds(0);

            const startedSessionId = await startSessionMutation({ deckId, mode: 'cram' });
            if (!cancelled) {
                setSessionId(startedSessionId);
            }
            setIsPreparingOrder(false);
        };

        void initialize();

        return () => {
            cancelled = true;
        };
    }, [allCards, roundCards, sessionComplete, settings, orderCramCardsAction, deckId, startSessionMutation]);

    useEffect(() => {
        if (!startTimeMs || sessionComplete) return;

        const intervalId = window.setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - startTimeMs) / 1000));
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [startTimeMs, sessionComplete]);

    useEffect(() => {
        return () => {
            const { sessionId: sid, totalAttempts: attempts, totalGotIt: gotIt, sessionComplete: done } = sessionStateRef.current;
            if (sid && !done && attempts > 0) {
                void completeSessionMutation({
                    sessionId: sid,
                    cardsStudied: attempts,
                    cardsCorrect: gotIt,
                    cardsIncorrect: attempts - gotIt,
                });
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const currentCard = roundCards ? roundCards[currentIndex] : undefined;
    const progress = roundCards && roundCards.length > 0 ? ((currentIndex + 1) / roundCards.length) * 100 : 0;

    const handleAnswer = useCallback(async (gotIt: boolean) => {
        if (!roundCards || !currentCard) return;

        const attemptQuality = gotIt ? 5 : 0;
        const nextAttempts = totalAttempts + 1;
        const nextGotIt = totalGotIt + (gotIt ? 1 : 0);

        setTotalAttempts(nextAttempts);
        if (gotIt) {
            setTotalGotIt(nextGotIt);
        } else {
            setTotalMissed((count) => count + 1);
            setMissesByCard((prev) => ({
                ...prev,
                [currentCard._id]: (prev[currentCard._id] ?? 0) + 1,
            }));
        }

        if (sessionId) {
            await recordEventMutation({
                sessionId,
                cardId: currentCard._id,
                deckId,
                quality: attemptQuality,
            });
        }

        const updatedNextRoundCards = gotIt ? nextRoundCards : [...nextRoundCards, currentCard];

        if (currentIndex < roundCards.length - 1) {
            if (!gotIt) {
                setNextRoundCards(updatedNextRoundCards);
            }
            setCurrentIndex((index) => index + 1);
            setShowAnswer(false);
            return;
        }

        if (updatedNextRoundCards.length > 0) {
            setRoundCards(updatedNextRoundCards);
            setNextRoundCards([]);
            setCurrentIndex(0);
            setRoundNumber((round) => round + 1);
            setShowAnswer(false);
            return;
        }

        if (sessionId) {
            await completeSessionMutation({
                sessionId,
                cardsStudied: nextAttempts,
                cardsCorrect: nextGotIt,
                cardsIncorrect: nextAttempts - nextGotIt,
            });
        }
        setEndTimeMs(Date.now());
        setSessionComplete(true);
    }, [
        completeSessionMutation,
        currentCard,
        currentIndex,
        deckId,
        nextRoundCards,
        recordEventMutation,
        roundCards,
        sessionId,
        totalAttempts,
        totalGotIt,
    ]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (isTypingTarget(event.target)) return;
            if (sessionComplete || !roundCards || roundCards.length === 0) return;

            if (event.key === ' ' && !showAnswer) {
                event.preventDefault();
                setShowAnswer(true);
                return;
            }

            if (!showAnswer) return;

            if (event.key === '1') {
                event.preventDefault();
                void handleAnswer(true);
                return;
            }

            if (event.key === '2') {
                event.preventDefault();
                void handleAnswer(false);
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [showAnswer, handleAnswer, sessionComplete, roundCards]);

    if (deck === undefined || allCards === undefined || settings === undefined || isPreparingOrder) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <AppHeader title="Cram" backHref="/decks" backLabel="Decks" />
                <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <PageLoader message="Preparing cram session..." />
                </main>
            </div>
        );
    }

    if (!deck) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <AppHeader title="Cram" backHref="/decks" backLabel="Decks" />
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

    if (allCards.length === 0) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <AppHeader title={`Cram: ${deck.name}`} backHref="/decks" backLabel="Decks" />
                <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-surface-secondary rounded-full flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-text-tertiary" aria-hidden />
                        </div>
                        <h1 className="text-2xl font-bold text-text-primary mb-2">No cards to cram</h1>
                        <p className="text-text-secondary mb-6">Add cards to this deck before starting cram mode.</p>
                        <Link
                            href={`/decks/${deck._id}`}
                            className="inline-block bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors"
                        >
                            Back to Deck
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    if (sessionComplete) {
        const durationSeconds = endTimeMs && startTimeMs
            ? Math.max(0, Math.floor((endTimeMs - startTimeMs) / 1000))
            : elapsedSeconds;
        const cardsNeedingMultipleAttempts = Object.values(missesByCard).filter((count) => count > 0).length;

        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
                <div className="max-w-xl w-full text-center rounded-xl border border-border-primary bg-surface-primary p-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-status-success-bg rounded-full flex items-center justify-center">
                        <Check className="w-8 h-8 text-status-success-text" aria-hidden />
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary mb-2">Cram session complete!</h1>
                    <p className="text-text-secondary mb-1">
                        You cleared {initialCardCountRef.current} cards in {roundNumber} round{roundNumber === 1 ? '' : 's'} ({formatDuration(durationSeconds)}).
                    </p>
                    <p className="text-text-tertiary mb-6">
                        {cardsNeedingMultipleAttempts} card{cardsNeedingMultipleAttempts === 1 ? '' : 's'} needed multiple attempts.
                    </p>
                    <div className="grid grid-cols-3 gap-3 text-sm mb-6">
                        <div className="rounded-lg border border-border-primary bg-surface-secondary px-3 py-2">
                            <div className="text-text-tertiary">Attempts</div>
                            <div className="font-semibold text-text-primary">{totalAttempts}</div>
                        </div>
                        <div className="rounded-lg border border-border-primary bg-surface-secondary px-3 py-2">
                            <div className="text-text-tertiary">Got it</div>
                            <div className="font-semibold text-status-success-text">{totalGotIt}</div>
                        </div>
                        <div className="rounded-lg border border-border-primary bg-surface-secondary px-3 py-2">
                            <div className="text-text-tertiary">Missed</div>
                            <div className="font-semibold text-status-error-text">{totalMissed}</div>
                        </div>
                    </div>
                    <Link
                        href={`/decks/${deck._id}`}
                        className="inline-block bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors"
                    >
                        Back to Deck
                    </Link>
                </div>
            </div>
        );
    }

    if (!roundCards || roundCards.length === 0 || !currentCard) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <AppHeader title={`Cram: ${deck.name}`} backHref={`/decks/${deck._id}`} backLabel="Deck" />
                <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <PageLoader message="Preparing cards..." />
                </main>
            </div>
        );
    }

    const cardsRemaining = roundCards.length - currentIndex;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <AppHeader title={`Cram: ${deck.name}`} backHref={`/decks/${deck._id}`} backLabel="Deck" />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border-primary bg-surface-primary px-4 py-3">
                        <p className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Round</p>
                        <p className="text-lg font-semibold text-text-primary">{roundNumber}</p>
                    </div>
                    <div className="rounded-lg border border-border-primary bg-surface-primary px-4 py-3">
                        <p className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Remaining</p>
                        <p className="text-lg font-semibold text-text-primary">{cardsRemaining}</p>
                    </div>
                    <div className="rounded-lg border border-border-primary bg-surface-primary px-4 py-3">
                        <p className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Timer</p>
                        <p className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            <Flame className="w-4 h-4 text-accent-primary" aria-hidden />
                            {formatDuration(elapsedSeconds)}
                        </p>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-text-secondary">Round progress</span>
                        <span className="text-sm text-text-secondary">
                            {currentIndex + 1} of {roundCards.length}
                        </span>
                    </div>
                    <div className="h-2 bg-border-primary rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent-primary transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <Card variant="default" className="min-h-[300px] sm:min-h-[400px] flex flex-col">
                    <div className="flex-1 flex flex-col justify-center">
                        {!showAnswer ? (
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-6 bg-surface-secondary rounded-full flex items-center justify-center">
                                    <HelpCircle className="w-6 h-6 text-text-tertiary" aria-hidden />
                                </div>
                                <h2 className="text-2xl font-semibold text-text-primary mb-4">Question</h2>
                                <div className="text-lg text-text-secondary mb-8 leading-relaxed">
                                    <MarkdownContent content={currentCard.front} />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAnswer(true)}
                                    className="bg-accent-primary text-text-inverse px-6 py-3 rounded-md hover:bg-accent-primary-hover transition-colors text-lg font-medium cursor-pointer"
                                >
                                    Show Answer
                                </button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-6 bg-surface-secondary rounded-full flex items-center justify-center">
                                    <Lightbulb className="w-6 h-6 text-text-tertiary" aria-hidden />
                                </div>
                                <h2 className="text-2xl font-semibold text-text-primary mb-4">Answer</h2>
                                <div className="text-lg text-text-secondary mb-8 leading-relaxed">
                                    <MarkdownContent content={currentCard.back} />
                                </div>

                                <div className="space-y-4">
                                    <p className="text-text-tertiary font-medium">Did you get it?</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto w-full">
                                        <button
                                            type="button"
                                            onClick={() => void handleAnswer(false)}
                                            className="flex flex-col items-center justify-center gap-2 bg-status-error-bg text-status-error-text border border-status-error-border px-4 py-4 rounded-lg hover:opacity-90 transition-colors cursor-pointer"
                                        >
                                            <X className="w-5 h-5 shrink-0" aria-hidden />
                                            <span className="font-medium">Missed</span>
                                            <span className="text-xs opacity-80">2</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void handleAnswer(true)}
                                            className="flex flex-col items-center justify-center gap-2 bg-status-success-bg text-status-success-text border border-status-success-border px-4 py-4 rounded-lg hover:opacity-90 transition-colors cursor-pointer"
                                        >
                                            <Check className="w-5 h-5 shrink-0" aria-hidden />
                                            <span className="font-medium">Got it</span>
                                            <span className="text-xs opacity-80">1</span>
                                        </button>
                                    </div>
                                    <p className="text-xs text-text-tertiary">Shortcuts: Space reveals answer, 1 = Got it, 2 = Missed</p>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                <div className="mt-4 flex justify-center">
                    <button
                        type="button"
                        onClick={() => setShowAnswer((visible) => !visible)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-surface-secondary border border-border-primary text-text-secondary hover:bg-surface-tertiary transition-colors cursor-pointer"
                    >
                        <RotateCcw className="w-4 h-4" aria-hidden />
                        {showAnswer ? 'Hide Answer' : 'Reveal Answer'}
                    </button>
                </div>
            </main>
        </div>
    );
}
