'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CreateDeckCard, DeckCard } from '@/components/features/decks/DeckCard';
import { CreateDeckModal } from '@/components/features/decks/CreateDeckModal';

// Types
interface Deck {
    id: string;
    name: string;
    description: string;
    cardCount: number;
    lastStudied: Date;
}

// Sample data
const sampleDecks: Deck[] = [
    {
        id: '1',
        name: 'JavaScript Basics',
        description: 'Core concepts and syntax',
        cardCount: 25,
        lastStudied: new Date('2024-01-15'),
    },
    {
        id: '2',
        name: 'React Hooks',
        description: 'useState, useEffect, and more',
        cardCount: 18,
        lastStudied: new Date('2025-07-16'),
    },
    {
        id: '3',
        name: 'Spanish Vocabulary',
        description: 'Common words and phrases',
        cardCount: 42,
        lastStudied: new Date('2025-01-12'),
    },
    {
        id: '4',
        name: 'Math Formulas',
        description: 'Algebra and calculus formulas',
        cardCount: 31,
        lastStudied: new Date('2024-12-08'),
    }
];

export default function DecksPage() {
    const [decks, setDecks] = useState<Deck[]>(sampleDecks);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleStudy = (deckId: string) => {
        console.log('Study deck:', deckId);
        // TODO: Navigate to study session
    };

    const handleEdit = (deckId: string) => {
        console.log('Edit deck:', deckId);
        // TODO: Navigate to edit page
    };

    const handleCreateDeck = (deckName: string) => {
        const newDeck: Deck = {
            id: Date.now().toString(),
            name: deckName,
            description: 'Add your first card to get started',
            cardCount: 0,
            lastStudied: new Date(),
        };

        setDecks(prev => [newDeck, ...prev]);
        console.log('Created deck:', newDeck);
    };

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
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
                    <div className="flex flex-wrap gap-2 text-sm text-text-secondary">
                        <span>{decks.length} decks</span>
                        <span>•</span>
                        <span>{decks.reduce((total, deck) => total + deck.cardCount, 0)} cards</span>
                    </div>
                </div>

                {/* Decks Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Create New Deck Card */}
                    <CreateDeckCard onClick={handleOpenModal} />

                    {/* Existing Decks */}
                    {decks.sort((a, b) => b.lastStudied.getTime() - a.lastStudied.getTime()).map((deck) => (
                        <DeckCard
                            key={deck.id}
                            deck={deck}
                            onStudy={handleStudy}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>
            </main>

            {/* Create Deck Modal */}
            <CreateDeckModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onCreateDeck={handleCreateDeck}
            />
        </div>
    );
}