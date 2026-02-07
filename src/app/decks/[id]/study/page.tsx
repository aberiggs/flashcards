'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { BookOpen, Check, HelpCircle, Lightbulb, Minus, X } from 'lucide-react';
import { useDecks } from '@/context/DeckContext';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import type { Card as CardType } from '@/types/flashcards';

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
                        <BookOpen className="w-8 h-8 text-text-tertiary" aria-hidden />
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
                        <Check className="w-8 h-8 text-green-600" aria-hidden />
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

    // TODO: Use confidence for spaced-repetition scheduling
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future scheduling
    const handleConfidence = (confidence: ConfidenceLevel) => {
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
                                    className="bg-accent-primary text-text-inverse px-6 py-3 rounded-md hover:bg-accent-primary-hover transition-colors text-lg font-medium"
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
                                        How confident were you?
                                    </p>
                                    <div className="flex gap-4 justify-center">
                                        <button
                                            onClick={() => handleConfidence('hard')}
                                            className="flex flex-col items-center gap-2 bg-red-50 text-red-700 border border-red-200 px-6 py-4 rounded-lg hover:bg-red-100 transition-colors"
                                        >
                                            <X className="w-5 h-5" aria-hidden />
                                            <span className="font-medium">Hard</span>
                                        </button>
                                        <button
                                            onClick={() => handleConfidence('medium')}
                                            className="flex flex-col items-center gap-2 bg-yellow-50 text-yellow-700 border border-yellow-200 px-6 py-4 rounded-lg hover:bg-yellow-100 transition-colors"
                                        >
                                            <Minus className="w-5 h-5" aria-hidden />
                                            <span className="font-medium">Medium</span>
                                        </button>
                                        <button
                                            onClick={() => handleConfidence('easy')}
                                            className="flex flex-col items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-6 py-4 rounded-lg hover:bg-green-100 transition-colors"
                                        >
                                            <Check className="w-5 h-5" aria-hidden />
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
