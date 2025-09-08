'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateDeckCard, DeckCard } from '@/components/features/decks/DeckCard';
import { CreateDeckModal } from '@/components/features/decks/CreateDeckModal';
import { useDecks } from '@/context/DeckContext';
import { Deck, Card } from '@/types/flashcards';

export default function DecksPage() {
    const { decks, cards, addDeck, getDeckStats } = useDecks();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();

    // TODO: Fix broken sorting on study race condition
    const sortedDecks = (decks: Deck[], cards: Card[]) => {
        const sorted = [...decks].sort((a, b) => {
            const aStats = getDeckStats(a.id);
            const bStats = getDeckStats(b.id);

            if (aStats.lastStudied && bStats.lastStudied) {
                const aDate = typeof aStats.lastStudied === 'string' ? new Date(aStats.lastStudied) : aStats.lastStudied;
                const bDate = typeof bStats.lastStudied === 'string' ? new Date(bStats.lastStudied) : bStats.lastStudied;
                return bDate.getTime() - aDate.getTime();
            }

            // If only one deck has been studied, prioritize it
            if (aStats.lastStudied && !bStats.lastStudied) return -1;
            if (!aStats.lastStudied && bStats.lastStudied) return 1;

            return b.createdAt.getTime() - a.createdAt.getTime();
        });

        console.log('Sorted decks:');
        for (const deck of sorted) {
            console.log(`* ${deck.name}: lastStudied =`, getDeckStats(deck.id).lastStudied);
        }

        return sorted;
    };

    const handleStudy = (deckId: string) => {
        router.push(`/decks/${deckId}/study`);
    };

    const handleEdit = (deckId: string) => {
        router.push(`/decks/${deckId}/edit`);
    };

    const handleCreateDeck = (deckName: string) => {
        addDeck(deckName, 'Add your first card to get started');
        console.log('Created deck:', deckName);
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
                        <span>{decks.reduce((total, deck) => total + getDeckStats(deck.id).cardCount, 0)} cards</span>
                    </div>
                </div>

                {/* Decks Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Create New Deck Card */}
                    <CreateDeckCard onClick={handleOpenModal} />

                    {/* Existing Decks */}
                    {sortedDecks(decks, cards).map((deck) => {
                        return (
                            <DeckCard
                                key={deck.id}
                                deck={deck}
                                onStudy={handleStudy}
                                onEdit={handleEdit}
                            />
                        );
                    })}
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