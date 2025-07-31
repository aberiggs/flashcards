'use client';

import { useState, useEffect } from 'react';

// TypeScript interfaces
interface Flashcard {
    id: string;
    front: string;
    back: string;
    category?: string;
}

interface StudySession {
    currentCardIndex: number;
    isFlipped: boolean;
    totalCards: number;
    correctAnswers: number;
    incorrectAnswers: number;
    skippedCards: number;
    startTime: Date;
}

export default function ReviewPage() {
    // Sample flashcards for demonstration
    // In a real app, these would come from your create page or database
    const [flashcards] = useState<Flashcard[]>([
        {
            id: '1',
            front: 'What is the capital of France?',
            back: 'Paris',
            category: 'Geography'
        },
        {
            id: '2',
            front: 'What is 2 + 2?',
            back: '4',
            category: 'Math'
        },
        {
            id: '3',
            front: 'What is the chemical symbol for gold?',
            back: 'Au',
            category: 'Science'
        },
        {
            id: '4',
            front: 'Who wrote "Romeo and Juliet"?',
            back: 'William Shakespeare',
            category: 'Literature'
        },
        {
            id: '5',
            front: 'What year did World War II end?',
            back: '1945',
            category: 'History'
        }
    ]);

    // Study session state
    const [session, setSession] = useState<StudySession>({
        currentCardIndex: 0,
        isFlipped: false,
        totalCards: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        skippedCards: 0,
        startTime: new Date()
    });

    // Initialize session when flashcards load
    useEffect(() => {
        setSession(prev => ({
            ...prev,
            totalCards: flashcards.length
        }));
    }, [flashcards]);

    // Handle card flip
    const flipCard = () => {
        setSession(prev => ({
            ...prev,
            isFlipped: !prev.isFlipped
        }));
    };

    // Handle scoring (easy, medium, hard)
    const handleScore = (difficulty: 'easy' | 'medium' | 'hard') => {
        const currentCard = flashcards[session.currentCardIndex];

        // Update session stats based on difficulty
        const isCorrect = difficulty === 'easy' || difficulty === 'medium';

        setSession(prev => ({
            ...prev,
            correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
            incorrectAnswers: prev.incorrectAnswers + (isCorrect ? 0 : 1),
            currentCardIndex: prev.currentCardIndex + 1,
            isFlipped: false
        }));
    };

    // Handle skip
    const handleSkip = () => {
        setSession(prev => ({
            ...prev,
            skippedCards: prev.skippedCards + 1,
            currentCardIndex: prev.currentCardIndex + 1,
            isFlipped: false
        }));
    };

    // Handle navigation
    const goToNext = () => {
        if (session.currentCardIndex < flashcards.length - 1) {
            setSession(prev => ({
                ...prev,
                currentCardIndex: prev.currentCardIndex + 1,
                isFlipped: false
            }));
        }
    };

    const goToPrevious = () => {
        if (session.currentCardIndex > 0) {
            setSession(prev => ({
                ...prev,
                currentCardIndex: prev.currentCardIndex - 1,
                isFlipped: false
            }));
        }
    };

    // Calculate progress
    const progress = session.totalCards > 0 ? (session.currentCardIndex / session.totalCards) * 100 : 0;
    const isSessionComplete = session.currentCardIndex >= session.totalCards;
    const currentCard = flashcards[session.currentCardIndex];

    // Calculate session duration
    const sessionDuration = Math.floor((new Date().getTime() - session.startTime.getTime()) / 1000);

    if (isSessionComplete) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-2xl mx-auto px-4">
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <h1 className="text-3xl font-bold text-gray-900 mb-6">
                            Study Session Complete! 🎉
                        </h1>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-green-100 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{session.correctAnswers}</div>
                                <div className="text-sm text-green-700">Correct</div>
                            </div>
                            <div className="bg-red-100 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">{session.incorrectAnswers}</div>
                                <div className="text-sm text-red-700">Incorrect</div>
                            </div>
                            <div className="bg-yellow-100 p-4 rounded-lg">
                                <div className="text-2xl font-bold text-yellow-600">{session.skippedCards}</div>
                                <div className="text-sm text-yellow-700">Skipped</div>
                            </div>
                        </div>

                        <div className="text-gray-600 mb-6">
                            <p>Session duration: {Math.floor(sessionDuration / 60)}m {sessionDuration % 60}s</p>
                            <p>Accuracy: {session.totalCards > 0 ? Math.round((session.correctAnswers / session.totalCards) * 100) : 0}%</p>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                            Start New Session
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header with Progress */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Study Flashcards
                    </h1>
                    <p className="text-gray-600 mb-4">
                        Card {session.currentCardIndex + 1} of {session.totalCards}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>

                    {/* Stats */}
                    <div className="flex justify-center space-x-4 text-sm text-gray-600">
                        <span>✅ {session.correctAnswers}</span>
                        <span>❌ {session.incorrectAnswers}</span>
                        <span>⏭️ {session.skippedCards}</span>
                        <span>⏱️ {Math.floor(sessionDuration / 60)}m {sessionDuration % 60}s</span>
                    </div>
                </div>

                {/* Main Card */}
                <div className="max-w-2xl mx-auto mb-8">
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        {/* Card Header */}
                        <div className="bg-gray-50 px-6 py-3 border-b">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">
                                    {currentCard?.category || 'General'}
                                </span>
                                <span className="text-sm text-gray-500">
                                    {session.currentCardIndex + 1} / {session.totalCards}
                                </span>
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-8">
                            <div className="min-h-[200px] flex items-center justify-center">
                                <div className="text-center">
                                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                                        {session.isFlipped ? 'Answer' : 'Question'}
                                    </h2>
                                    <p className="text-lg text-gray-700 leading-relaxed">
                                        {session.isFlipped ? currentCard?.back : currentCard?.front}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Card Actions */}
                        <div className="bg-gray-50 px-6 py-4 border-t">
                            <div className="flex justify-center">
                                <button
                                    onClick={flipCard}
                                    className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                >
                                    {session.isFlipped ? 'Show Question' : 'Show Answer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation and Scoring */}
                <div className="max-w-2xl mx-auto">
                    {/* Navigation */}
                    <div className="flex justify-between mb-6">
                        <button
                            onClick={goToPrevious}
                            disabled={session.currentCardIndex === 0}
                            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            ← Previous
                        </button>
                        <button
                            onClick={goToNext}
                            disabled={session.currentCardIndex === flashcards.length - 1}
                            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next →
                        </button>
                    </div>

                    {/* Scoring Buttons (only show when card is flipped) */}
                    {session.isFlipped && (
                        <div className="space-y-4">
                            <h3 className="text-center text-lg font-medium text-gray-800">
                                How well did you know this?
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <button
                                    onClick={() => handleScore('easy')}
                                    className="bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                                >
                                    Easy ✅
                                </button>
                                <button
                                    onClick={() => handleScore('medium')}
                                    className="bg-yellow-600 text-white py-3 px-4 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
                                >
                                    Medium 🤔
                                </button>
                                <button
                                    onClick={() => handleScore('hard')}
                                    className="bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                                >
                                    Hard ❌
                                </button>
                            </div>
                            <div className="text-center">
                                <button
                                    onClick={handleSkip}
                                    className="text-gray-500 hover:text-gray-700 underline"
                                >
                                    Skip this card
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Keyboard Shortcuts Info */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>Keyboard shortcuts: Space to flip, 1/2/3 to score, ←/→ to navigate</p>
                </div>
            </div>
        </div>
    );
}
