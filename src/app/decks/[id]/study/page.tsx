'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useDecks } from '@/context/DeckContext';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import type { Card as CardType } from '@/types/flashcards';
import router from 'next/router';

type ConfidenceLevel = 'easy' | 'medium' | 'hard';

export default function StudyPage() {
    const { id } = useParams();
    const { getDeck, getCardsByDeck, updateCard } = useDecks();

    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [studyCards, setStudyCards] = useState<CardType[]>([]);
    const [sessionComplete, setSessionComplete] = useState(false);

    const deck = getDeck(id as string);

    // Sort cards by least recently studied (or never studied) first
    useEffect(() => {
        if (deck) {
            const cards = getCardsByDeck(deck.id);
            const sortedCards = cards.sort((a, b) => {
                // Never studied cards come first
                if (!a.lastStudied && !b.lastStudied) return 0;
                if (!a.lastStudied) return -1;
                if (!b.lastStudied) return 1;

                // Convert to Date objects if they're strings
                const aDate = typeof a.lastStudied === 'string' ? new Date(a.lastStudied) : a.lastStudied;
                const bDate = typeof b.lastStudied === 'string' ? new Date(b.lastStudied) : b.lastStudied;

                // Then sort by oldest lastStudied first
                return aDate.getTime() - bDate.getTime();
            });
            setStudyCards(sortedCards);
        }
    }, [deck, getCardsByDeck]);

    if (!deck) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-text-primary mb-4">Deck not found</h1>
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

    if (studyCards.length === 0) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-surface-secondary rounded-full flex items-center justify-center">
                        <BookIcon className="w-8 h-8 text-text-tertiary" />
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary mb-2">No cards to study</h1>
                    <p className="text-text-secondary mb-6">This deck doesn&apos;t have any cards yet.</p>
                    <Link
                        href={`/decks/${deck.id}/edit`}
                        className="inline-block bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors"
                    >
                        Add Cards
                    </Link>
                </div>
            </div>
        );
    }

    if (sessionComplete) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-50 rounded-full flex items-center justify-center">
                        <CheckIcon className="w-8 h-8 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary mb-2">Study session complete!</h1>
                    <p className="text-text-secondary mb-6">Great job studying {studyCards.length} cards.</p>
                    <div className="flex gap-4 justify-center">
                        <Link
                            href="/decks"
                            className="bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors"
                        >
                            Back to Decks
                        </Link>
                        <button
                            onClick={() => {
                                setCurrentCardIndex(0);
                                setShowAnswer(false);
                                setSessionComplete(false);
                            }}
                            className="bg-surface-secondary text-text-primary border border-border-primary px-4 py-2 rounded-md hover:bg-surface-tertiary transition-colors"
                        >
                            Study Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentCard = studyCards[currentCardIndex];
    const progress = ((currentCardIndex + 1) / studyCards.length) * 100;

    const handleConfidence = (confidence: ConfidenceLevel) => {
        // TODO: Implement confidence level logic

        // Update the card's lastStudied timestamp
        updateCard(currentCard.id, {
            lastStudied: new Date()
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
            {/* Header */}
            <header className="border-b border-border-primary bg-surface-primary">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl font-semibold text-text-primary">
                            Studying: {deck.name}
                        </h1>
                        <Link
                            href="/decks"
                            className="text-text-secondary hover:text-text-primary transition-colors"
                        >
                            ← Back to Decks
                        </Link>
                    </div>
                </div>
            </header>

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
                                    <QuestionIcon className="w-6 h-6 text-text-tertiary" />
                                </div>
                                <h2 className="text-2xl font-semibold text-text-primary mb-4">
                                    Question
                                </h2>
                                <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                                    {currentCard.front}
                                </p>
                                <button
                                    onClick={handleShowAnswer}
                                    className="bg-accent-primary text-text-inverse px-6 py-3 rounded-md hover:bg-accent-primary-hover transition-colors text-lg font-medium"
                                >
                                    Show Answer
                                </button>
                            </div>
                        ) : (
                            // Back of card with confidence buttons
                            <div className="text-center">
                                <div className="w-12 h-12 mx-auto mb-6 bg-surface-secondary rounded-full flex items-center justify-center">
                                    <LightbulbIcon className="w-6 h-6 text-text-tertiary" />
                                </div>
                                <h2 className="text-2xl font-semibold text-text-primary mb-4">
                                    Answer
                                </h2>
                                <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                                    {currentCard.back}
                                </p>

                                <div className="space-y-4">
                                    <p className="text-text-tertiary font-medium">
                                        How confident were you?
                                    </p>
                                    <div className="flex gap-4 justify-center">
                                        <button
                                            onClick={() => handleConfidence('hard')}
                                            className="flex flex-col items-center gap-2 bg-red-50 text-red-700 border border-red-200 px-6 py-4 rounded-lg hover:bg-red-100 transition-colors"
                                        >
                                            <XIcon className="w-5 h-5" />
                                            <span className="font-medium">Hard</span>
                                        </button>
                                        <button
                                            onClick={() => handleConfidence('medium')}
                                            className="flex flex-col items-center gap-2 bg-yellow-50 text-yellow-700 border border-yellow-200 px-6 py-4 rounded-lg hover:bg-yellow-100 transition-colors"
                                        >
                                            <MinusIcon className="w-5 h-5" />
                                            <span className="font-medium">Medium</span>
                                        </button>
                                        <button
                                            onClick={() => handleConfidence('easy')}
                                            className="flex flex-col items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-6 py-4 rounded-lg hover:bg-green-100 transition-colors"
                                        >
                                            <CheckIcon className="w-5 h-5" />
                                            <span className="font-medium">Easy</span>
                                        </button>
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

// Icon Components
function BookIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    );
}

function QuestionIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function LightbulbIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
    );
}

function XIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

function MinusIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
    );
}
