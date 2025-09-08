'use client';

import { useParams } from 'next/navigation';

import { useState } from 'react';
import { useDecks } from '@/context/DeckContext';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import type { Card as CardType } from '@/types/flashcards';
import Link from 'next/link';

interface CardFormData {
    front: string;
    back: string;
}

export default function EditDeckPage() {
    const { id } = useParams();
    const {
        getDeck,
        updateDeck,
        getCardsByDeck,
        addCard,
        updateCard,
        deleteCard
    } = useDecks();

    const deck = getDeck(id as string);
    const cards = getCardsByDeck(id as string);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<CardType | null>(null);
    const [deckName, setDeckName] = useState(deck?.name || '');
    const [deckDescription, setDeckDescription] = useState(deck?.description || '');
    const [cardForm, setCardForm] = useState<CardFormData>({ front: '', back: '' });

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

    const handleSaveDeck = () => {
        updateDeck(id as string, {
            name: deckName,
            description: deckDescription
        });
    };

    const handleAddCard = () => {
        if (cardForm.front.trim() && cardForm.back.trim()) {
            addCard(id as string, cardForm.front.trim(), cardForm.back.trim());
            setCardForm({ front: '', back: '' });
            setIsAddModalOpen(false);
        }
    };

    const handleEditCard = () => {
        if (editingCard && cardForm.front.trim() && cardForm.back.trim()) {
            updateCard(editingCard.id, {
                front: cardForm.front.trim(),
                back: cardForm.back.trim()
            });
            setEditingCard(null);
            setCardForm({ front: '', back: '' });
        }
    };

    const handleDeleteCard = (cardId: string) => {
        if (confirm('Are you sure you want to delete this card?')) {
            deleteCard(cardId);
        }
    };

    const openEditModal = (card: CardType) => {
        setEditingCard(card);
        setCardForm({ front: card.front, back: card.back });
    };

    const closeModals = () => {
        setIsAddModalOpen(false);
        setEditingCard(null);
        setCardForm({ front: '', back: '' });
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="border-b border-border-primary bg-surface-primary">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl font-semibold text-text-primary">Edit Deck</h1>
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
                        <button
                            onClick={handleSaveDeck}
                            className="bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors"
                        >
                            Save Deck Info
                        </button>
                    </div>
                </Card>

                {/* Cards Section */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-text-primary">Cards</h2>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors"
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
                            className="bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors"
                        >
                            Add Your First Card
                        </button>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {cards.map((card, index) => (
                            <Card key={card.id} variant="default">
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
                                            className="p-2 text-accent-primary hover:text-accent-primary-hover hover:bg-accent-primary/10 rounded-md transition-colors"
                                            title="Edit card"
                                        >
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCard(card.id)}
                                            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-md transition-colors"
                                            title="Delete card"
                                        >
                                            <DeleteIcon className="w-4 h-4" />
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
                            className="px-4 py-2 border border-border-primary rounded-md text-text-primary hover:bg-surface-secondary transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddCard}
                            className="bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors"
                        >
                            Add Card
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit Card Modal */}
            <Modal
                isOpen={!!editingCard}
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
                            className="px-4 py-2 border border-border-primary rounded-md text-text-primary hover:bg-surface-secondary transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleEditCard}
                            className="bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// Icon Components
function EditIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
    );
}

function DeleteIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );
}
