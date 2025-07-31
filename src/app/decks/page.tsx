'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CreateDeckCard, DeckCard } from '@/components/features/decks/DeckCard';

// Types
interface Deck {
    id: string;
    name: string;
    description: string;
    cardCount: number;
    lastStudied?: Date;
    category: string;
}

// Sample data
const sampleDecks: Deck[] = [
    {
        id: '1',
        name: 'JavaScript Basics',
        description: 'Core concepts and syntax',
        cardCount: 25,
        lastStudied: new Date('2024-01-15'),
        category: 'Programming'
    },
    {
        id: '2',
        name: 'React Hooks',
        description: 'useState, useEffect, and more',
        cardCount: 18,
        lastStudied: new Date('2024-01-10'),
        category: 'Programming'
    },
    {
        id: '3',
        name: 'Spanish Vocabulary',
        description: 'Common words and phrases',
        cardCount: 42,
        lastStudied: new Date('2024-01-12'),
        category: 'Language'
    },
    {
        id: '4',
        name: 'Math Formulas',
        description: 'Algebra and calculus formulas',
        cardCount: 31,
        lastStudied: new Date('2024-01-08'),
        category: 'Mathematics'
    }
];

export default function DecksPage() {
    const [decks] = useState<Deck[]>(sampleDecks);

    const handleStudy = (deckId: string) => {
        console.log('Study deck:', deckId);
        // TODO: Navigate to study session
    };

    const handleEdit = (deckId: string) => {
        console.log('Edit deck:', deckId);
        // TODO: Navigate to edit page
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="border-b border-border-primary bg-surface-primary">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl font-semibold text-text-primary">
                            My Decks
                        </h1>
                        <Link
                            href="/"
                            className="text-text-secondary hover:text-text-primary transition-colors"
                        >
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats */}
                <div className="mb-8">
                    <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                        <span>{decks.length} decks</span>
                        <span>•</span>
                        <span>{decks.reduce((total, deck) => total + deck.cardCount, 0)} total cards</span>
                        <span>•</span>
                        <span>{decks.filter(deck => deck.lastStudied).length} recently studied</span>
                    </div>
                </div>

                {/* Decks Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Existing Decks */}
                    {decks.map((deck) => (
                        <DeckCard
                            key={deck.id}
                            deck={deck}
                            onStudy={handleStudy}
                            onEdit={handleEdit}
                        />
                    ))}

                    {/* Create New Deck Card */}
                    <CreateDeckCard />
                </div>
            </main>
        </div>
    );
}