'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { CreateDeckCard, DeckCard } from '@/components/features/decks/DeckCard';
import { CreateDeckModal } from '@/components/features/decks/CreateDeckModal';
import { ImportDeckModal } from '@/components/features/decks/ImportDeckModal';
import { PageLoader } from '@/components/ui/PageLoader';

export default function DecksPage() {
    const decks = useQuery(api.decks.list);
    const limits = useQuery(api.limits.getLimits);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const router = useRouter();

    // Sort decks: most reviews due first, then by last studied (most recent first), then by creation date
    const sortedDecks = decks
        ? [...decks].sort((a, b) => {
            const aDue = a.dueCount ?? 0;
            const bDue = b.dueCount ?? 0;
            if (bDue !== aDue) return bDue - aDue;
            if (a.lastStudied && b.lastStudied) return b.lastStudied - a.lastStudied;
            if (a.lastStudied && !b.lastStudied) return -1;
            if (!a.lastStudied && b.lastStudied) return 1;
            return b._creationTime - a._creationTime;
        })
        : [];

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleOpenImportModal = () => {
        setIsImportModalOpen(true);
    };

    const handleCloseImportModal = () => {
        setIsImportModalOpen(false);
    };

    if (decks === undefined || limits === undefined) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <AppHeader title="My Decks" />
                <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <PageLoader message="Loading decks…" />
                </main>
            </div>
        );
    }

    const totalCards = decks.reduce((total, deck) => total + deck.cardCount, 0);
    const totalDue = decks.reduce((total, deck) => total + (deck.dueCount ?? 0), 0);

    const deckUsagePct = decks.length / limits.maxDecks;
    const cardUsagePct = totalCards / limits.maxCardsPerUser;
    const deckNearLimit = deckUsagePct >= 0.8;
    const cardNearLimit = cardUsagePct >= 0.8;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <AppHeader title="My Decks" />

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats summary card */}
                <div className="mb-8 rounded-xl border border-border-primary bg-surface-primary p-4 sm:p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-y-3">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                            <span className={deckNearLimit ? 'text-status-warning-text font-medium' : 'text-text-secondary'}>
                                <span className="font-medium">{decks.length}</span>
                                <span className="text-text-tertiary">/{limits.maxDecks}</span>
                                {' '}decks
                            </span>
                            <span className={cardNearLimit ? 'text-status-warning-text font-medium' : 'text-text-secondary'}>
                                <span className="font-medium">{totalCards.toLocaleString()}</span>
                                <span className="text-text-tertiary">/{limits.maxCardsPerUser.toLocaleString()}</span>
                                {' '}cards
                            </span>
                            {totalDue > 0 ? (
                                <span className="text-accent-primary font-medium">
                                    {totalDue} ready for review
                                </span>
                            ) : (
                                <span className="text-text-tertiary">All caught up</span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleOpenImportModal}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border-primary text-text-secondary bg-surface-secondary hover:bg-surface-tertiary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        >
                            Import
                        </button>
                    </div>
                </div>

                {/* Decks Grid — fewer, larger cards for more info */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <CreateDeckCard onClick={handleOpenModal} />
                    {sortedDecks.map((deck) => (
                        <DeckCard
                            key={deck._id}
                            deck={deck}
                            onClick={(deckId) => router.push(`/decks/${deckId}`)}
                        />
                    ))}
                </div>
            </main>

            {/* Create Deck Modal */}
            <CreateDeckModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />

            {/* Import Deck Modal */}
            <ImportDeckModal
                isOpen={isImportModalOpen}
                onClose={handleCloseImportModal}
            />
        </div>
    );
}
