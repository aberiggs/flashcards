'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { CreateDeckCard, DeckCard } from '@/components/features/decks/DeckCard';
import { CreateDeckModal } from '@/components/features/decks/CreateDeckModal';
import type { Id } from '../../../convex/_generated/dataModel';

export default function DecksPage() {
    const decks = useQuery(api.decks.list);
    const deleteDeckMutation = useMutation(api.decks.remove);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();

    // Sort decks: most recently studied first, then by creation date
    const sortedDecks = decks
        ? [...decks].sort((a, b) => {
            if (a.lastStudied && b.lastStudied) {
                return b.lastStudied - a.lastStudied;
            }
            if (a.lastStudied && !b.lastStudied) return -1;
            if (!a.lastStudied && b.lastStudied) return 1;
            return b._creationTime - a._creationTime;
        })
        : [];

    const handleStudy = (deckId: string) => {
        router.push(`/decks/${deckId}/study`);
    };

    const handleEdit = (deckId: string) => {
        router.push(`/decks/${deckId}/edit`);
    };

    const handleDeleteDeck = async (deckId: string) => {
        const deck = decks?.find((d) => d._id === deckId);
        if (!deck) return;
        if (confirm(`Delete deck "${deck.name}"? This will permanently remove the deck and all its cards.`)) {
            await deleteDeckMutation({ id: deckId as Id<"decks"> });
        }
    };

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    if (decks === undefined) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <p className="text-text-secondary">Loading decks...</p>
            </div>
        );
    }

    const totalCards = decks.reduce((total, deck) => total + deck.cardCount, 0);

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
                        <span>{totalCards} cards</span>
                    </div>
                </div>

                {/* Decks Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Create New Deck Card */}
                    <CreateDeckCard onClick={handleOpenModal} />

                    {/* Existing Decks */}
                    {sortedDecks.map((deck) => {
                        return (
                            <DeckCard
                                key={deck._id}
                                deck={deck}
                                onStudy={handleStudy}
                                onEdit={handleEdit}
                                onDelete={handleDeleteDeck}
                            />
                        );
                    })}
                </div>
            </main>

            {/* Create Deck Modal */}
            <CreateDeckModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />
        </div>
    );
}
