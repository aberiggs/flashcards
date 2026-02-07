'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import Link from 'next/link';

interface CardFormData {
    front: string;
    back: string;
}

export default function EditDeckPage() {
    const { id } = useParams();
    const router = useRouter();
    const deckId = id as Id<"decks">;

    const deckWithCards = useQuery(api.decks.getWithCards, { id: deckId });
    const updateDeckMutation = useMutation(api.decks.update);
    const deleteDeckMutation = useMutation(api.decks.remove);
    const addCardMutation = useMutation(api.cards.create);
    const updateCardMutation = useMutation(api.cards.update);
    const deleteCardMutation = useMutation(api.cards.remove);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCardId, setEditingCardId] = useState<Id<"cards"> | null>(null);
    const [deckName, setDeckName] = useState('');
    const [deckDescription, setDeckDescription] = useState('');
    const [cardForm, setCardForm] = useState<CardFormData>({ front: '', back: '' });

    // Keep form in sync when data loads or changes
    useEffect(() => {
        if (deckWithCards) {
            setDeckName(deckWithCards.name);
            setDeckDescription(deckWithCards.description ?? '');
        }
    }, [deckWithCards]);

    if (deckWithCards === undefined) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <AppHeader title="Edit Deck" backHref="/decks" backLabel="Decks" />
                <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <PageLoader message="Loading…" />
                </main>
            </div>
        );
    }

    if (deckWithCards === null) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <AppHeader title="Edit Deck" backHref="/decks" backLabel="Decks" />
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

    const cards = deckWithCards.cards;

    const handleSaveDeck = async () => {
        await updateDeckMutation({
            id: deckId,
            name: deckName,
            description: deckDescription,
        });
    };

    const handleAddCard = async () => {
        if (cardForm.front.trim() && cardForm.back.trim()) {
            await addCardMutation({
                deckId: deckId,
                front: cardForm.front.trim(),
                back: cardForm.back.trim(),
            });
            setCardForm({ front: '', back: '' });
            setIsAddModalOpen(false);
        }
    };

    const handleEditCard = async () => {
        if (editingCardId && cardForm.front.trim() && cardForm.back.trim()) {
            await updateCardMutation({
                id: editingCardId,
                front: cardForm.front.trim(),
                back: cardForm.back.trim(),
            });
            setEditingCardId(null);
            setCardForm({ front: '', back: '' });
        }
    };

    const handleDeleteCard = async (cardId: Id<"cards">) => {
        if (confirm('Are you sure you want to delete this card?')) {
            await deleteCardMutation({ id: cardId });
        }
    };

    const handleDeleteDeck = async () => {
        if (confirm(`Delete deck "${deckWithCards.name}"? This will permanently remove the deck and all its cards.`)) {
            await deleteDeckMutation({ id: deckId });
            router.push('/decks');
        }
    };

    const openEditModal = (card: typeof cards[number]) => {
        setEditingCardId(card._id);
        setCardForm({ front: card.front, back: card.back });
    };

    const closeModals = () => {
        setIsAddModalOpen(false);
        setEditingCardId(null);
        setCardForm({ front: '', back: '' });
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <AppHeader title="Edit Deck" backHref="/decks" backLabel="Decks" />

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Deck Info Section */}
                <Card variant="default" className="mb-8">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">Deck Information</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Deck Name
                            </label>
                            <input
                                type="text"
                                value={deckName}
                                onChange={(e) => setDeckName(e.target.value)}
                                className="w-full px-3 py-2 border border-border-primary rounded-md bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                                placeholder="Enter deck name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Description
                            </label>
                            <textarea
                                value={deckDescription}
                                onChange={(e) => setDeckDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-border-primary rounded-md bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                                placeholder="Enter deck description"
                                rows={3}
                            />
                        </div>
                        <div className="flex flex-wrap gap-3 items-center">
                            <button
                                onClick={handleSaveDeck}
                                className="bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors cursor-pointer"
                            >
                                Save Deck Info
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteDeck}
                                className="px-4 py-2 rounded-md border border-accent-error/50 text-accent-error hover:bg-accent-error/10 transition-colors cursor-pointer"
                            >
                                Delete deck
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Cards Section */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-text-primary">Cards</h2>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors cursor-pointer"
                    >
                        Add Card
                    </button>
                </div>

                {/* Cards List */}
                {cards.length === 0 ? (
                    <Card variant="default" className="text-center py-12">
                        <p className="text-text-secondary mb-4">No cards in this deck yet.</p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors cursor-pointer"
                        >
                            Add Your First Card
                        </button>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {cards.map((card, index) => (
                            <Card key={card._id} variant="default">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-sm font-medium text-text-tertiary">
                                                Card {index + 1}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <h4 className="text-sm font-medium text-text-primary mb-1">Front</h4>
                                                <p className="text-text-secondary">{card.front}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-text-primary mb-1">Back</h4>
                                                <p className="text-text-secondary">{card.back}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <button
                                            onClick={() => openEditModal(card)}
                                            className="p-2 text-accent-primary hover:text-accent-primary-hover hover:bg-accent-primary/10 rounded-md transition-colors cursor-pointer"
                                            title="Edit card"
                                        >
                                            <Pencil className="w-4 h-4" aria-hidden />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCard(card._id)}
                                            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                                            title="Delete card"
                                        >
                                            <Trash2 className="w-4 h-4" aria-hidden />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            {/* Add Card Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={closeModals}
                title="Add New Card"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            Front
                        </label>
                        <textarea
                            value={cardForm.front}
                            onChange={(e) => setCardForm(prev => ({ ...prev, front: e.target.value }))}
                            className="w-full px-3 py-2 border border-border-primary rounded-md bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                            placeholder="Enter the question or prompt"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            Back
                        </label>
                        <textarea
                            value={cardForm.back}
                            onChange={(e) => setCardForm(prev => ({ ...prev, back: e.target.value }))}
                            className="w-full px-3 py-2 border border-border-primary rounded-md bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                            placeholder="Enter the answer"
                            rows={3}
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={closeModals}
                            className="px-4 py-2 border border-border-primary rounded-md text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddCard}
                            className="bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors cursor-pointer"
                        >
                            Add Card
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit Card Modal */}
            <Modal
                isOpen={!!editingCardId}
                onClose={closeModals}
                title="Edit Card"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            Front
                        </label>
                        <textarea
                            value={cardForm.front}
                            onChange={(e) => setCardForm(prev => ({ ...prev, front: e.target.value }))}
                            className="w-full px-3 py-2 border border-border-primary rounded-md bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                            placeholder="Enter the question or prompt"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            Back
                        </label>
                        <textarea
                            value={cardForm.back}
                            onChange={(e) => setCardForm(prev => ({ ...prev, back: e.target.value }))}
                            className="w-full px-3 py-2 border border-border-primary rounded-md bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                            placeholder="Enter the answer"
                            rows={3}
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={closeModals}
                            className="px-4 py-2 border border-border-primary rounded-md text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleEditCard}
                            className="bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors cursor-pointer"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
