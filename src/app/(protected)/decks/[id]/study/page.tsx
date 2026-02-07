'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { BookOpen, Check, HelpCircle, Lightbulb, X, AlertCircle } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { Card } from '@/components/ui/Card';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import Link from 'next/link';

type ConfidenceLevel = 'wrong' | 'close' | 'hard' | 'easy';

export default function StudyPage() {
    const { id } = useParams();
    const deckId = id as Id<"decks">;

    const deck = useQuery(api.decks.get, { id: deckId });
    const dueCards = useQuery(api.cards.getDueByDeck, { deckId });
    const allCards = useQuery(api.cards.getByDeck, { deckId });
    const recordReviewMutation = useMutation(api.cards.recordReview);

    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    // Freeze study order at session start so Convex live updates don't re-sort
    // mid-session (which would show the same card again after studying it)
    const [sessionCards, setSessionCards] = useState<NonNullable<typeof dueCards> | null>(null);

    useEffect(() => {
        if (dueCards && dueCards.length > 0 && sessionCards === null && !sessionComplete) {
            setSessionCards(dueCards);
        }
    }, [dueCards, sessionCards, sessionComplete]);

    const studyCards = sessionCards ?? [];

    // Loading state (include brief init when cards loaded but session order not yet frozen)
    if (deck === undefined || dueCards === undefined || allCards === undefined || (dueCards && dueCards.length > 0 && sessionCards === null && !sessionComplete)) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <AppHeader title="Study" backHref="/decks" backLabel="Decks" />
                <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <PageLoader message="Loading…" />
                </main>
            </div>
        );
    }

    if (!deck) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <AppHeader title="Study" backHref="/decks" backLabel="Decks" />
                <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
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
                <div className="min-h-screen bg-background text-foreground">
                    <AppHeader
                        title={`Studying: ${deck.name}`}
                        backHref="/decks"
                        backLabel="Decks"
                    />
                    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-surface-secondary rounded-full flex items-center justify-center">
                                <BookOpen className="w-8 h-8 text-text-tertiary" aria-hidden />
                            </div>
                            <h1 className="text-2xl font-bold text-text-primary mb-2">No cards to study</h1>
                            <p className="text-text-secondary mb-6">This deck doesn&apos;t have any cards yet.</p>
                            <Link
                                href={`/decks/${deck._id}/edit`}
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
                <div className="min-h-screen bg-background text-foreground">
                    <AppHeader
                        title={`Studying: ${deck.name}`}
                        backHref="/decks"
                        backLabel="Decks"
                    />
                    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
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
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-50 rounded-full flex items-center justify-center">
                        <Check className="w-8 h-8 text-green-600" aria-hidden />
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary mb-2">Study session complete!</h1>
                    <p className="text-text-secondary mb-6">Great job studying {studyCards.length} cards.</p>
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

    const currentCard = studyCards[currentCardIndex];
    const progress = ((currentCardIndex + 1) / studyCards.length) * 100;

    const handleConfidence = async (confidence: ConfidenceLevel) => {
        await recordReviewMutation({
            id: currentCard._id,
            confidence,
        });

        // Move to next card or complete session
        if (currentCardIndex < studyCards.length - 1) {
            setCurrentCardIndex(currentCardIndex + 1);
            setShowAnswer(false);
        } else {
            setSessionComplete(true);
        }
    };

    const handleShowAnswer = () => {
        setShowAnswer(true);
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <AppHeader
                title={`Studying: ${deck.name}`}
                backHref="/decks"
                backLabel="Decks"
            />

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <Card variant="default" className="min-h-[400px] flex flex-col">
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
                                <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                                    {currentCard.front}
                                </p>
                                <button
                                    onClick={handleShowAnswer}
                                    className="bg-accent-primary text-text-inverse px-6 py-3 rounded-md hover:bg-accent-primary-hover transition-colors text-lg font-medium cursor-pointer"
                                >
                                    Show Answer
                                </button>
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
                                <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                                    {currentCard.back}
                                </p>

                                <div className="space-y-4">
                                    <p className="text-text-tertiary font-medium">
                                        How did you do?
                                    </p>
                                    <div className="flex flex-wrap items-stretch gap-4 justify-center">
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => handleConfidence('wrong')}
                                                className="flex flex-col items-center justify-center gap-2 w-28 bg-red-50 text-red-700 border border-red-200 px-4 py-4 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                                            >
                                                <X className="w-5 h-5 shrink-0" aria-hidden />
                                                <span className="font-medium">Wrong</span>
                                            </button>
                                            <button
                                                onClick={() => handleConfidence('close')}
                                                className="flex flex-col items-center justify-center gap-2 w-28 bg-orange-50 text-orange-700 border border-orange-200 px-4 py-4 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer"
                                            >
                                                <AlertCircle className="w-5 h-5 shrink-0" aria-hidden />
                                                <span className="font-medium">Close</span>
                                            </button>
                                        </div>
                                        <div
                                            className="hidden sm:block w-px bg-border-primary self-stretch shrink-0"
                                            aria-hidden
                                        />
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => handleConfidence('hard')}
                                                className="flex flex-col items-center justify-center gap-2 w-28 bg-yellow-50 text-yellow-700 border border-yellow-200 px-4 py-4 rounded-lg hover:bg-yellow-100 transition-colors cursor-pointer"
                                            >
                                                <HelpCircle className="w-5 h-5 shrink-0" aria-hidden />
                                                <span className="font-medium">Hard</span>
                                            </button>
                                            <button
                                                onClick={() => handleConfidence('easy')}
                                                className="flex flex-col items-center justify-center gap-2 w-28 bg-green-50 text-green-700 border border-green-200 px-4 py-4 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
                                            >
                                                <Check className="w-5 h-5 shrink-0" aria-hidden />
                                                <span className="font-medium">Easy</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </main>
        </div>
    );
}
